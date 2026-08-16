import { eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { err, ok, okList, requireAuth, requireRole, parseBody, isGuardError, uid, nowISO } from "@/lib/api";
import { toProduct } from "@/lib/domain";

// GET /api/products?q=  — daftar produk (semua role terautentikasi)
export async function GET(req: NextRequest) {
  const guard = await requireAuth();
  if (isGuardError(guard)) return guard.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const rows = q
    ? await db
        .select()
        .from(schema.products)
        .where(or(like(schema.products.name, `%${q}%`), like(schema.products.sku, `%${q}%`)))
        .all()
    : await db.select().from(schema.products).orderBy(schema.products.sku).all();

  return okList(rows.map(toProduct));
}

const createSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().min(1),
  price: z.number().int().positive(),
  minStock: z.number().int().min(0),
  stockQty: z.number().int().min(0).default(0),
});

// POST /api/products — tambah produk (admin/gudang); stok awal dicatat
// sebagai pergerakan "penyesuaian" agar log audit lengkap.
export async function POST(req: NextRequest) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;
  const body = await parseBody(createSchema, req);
  if ("error" in body) return body.error;

  const skuTaken = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(eq(schema.products.sku, body.data.sku.trim()))
    .get();
  if (skuTaken) return err(`SKU "${body.data.sku}" sudah dipakai produk lain.`);

  const product = {
    id: uid(),
    sku: body.data.sku.trim(),
    name: body.data.name.trim(),
    unit: body.data.unit.trim(),
    price: body.data.price,
    stockQty: body.data.stockQty,
    minStock: body.data.minStock,
    createdAt: nowISO(),
  };

  db.transaction((tx) => {
    tx.insert(schema.products).values(product).run();
    if (product.stockQty > 0) {
      tx.insert(schema.stockMovements)
        .values({
          id: uid(),
          productId: product.id,
          productName: product.name,
          type: "penyesuaian",
          quantity: product.stockQty,
          referenceType: "adjustment",
          referenceId: null,
          note: "Stok awal produk baru",
          userId: guard.user.id,
          createdAt: product.createdAt,
        })
        .run();
    }
  });

  return ok({ data: toProduct(product) });
}
