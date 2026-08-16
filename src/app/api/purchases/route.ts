import { desc, eq, inArray, like, or } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { err, ok, okList, requireRole, parseBody, isGuardError, uid, nowISO } from "@/lib/api";
import { localYyyymmdd, nextDocSeq, toPurchase } from "@/lib/domain";
import * as authSchema from "@/db/auth-schema";

// GET /api/purchases?q=&status= — riwayat pembelian (admin/gudang)
export async function GET(req: NextRequest) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const status = req.nextUrl.searchParams.get("status");
  const where = [];
  if (q) where.push(or(like(schema.purchases.purchaseNumber, `%${q}%`), like(schema.purchases.supplierName, `%${q}%`)));
  if (status === "menunggu" || status === "diterima") where.push(eq(schema.purchases.status, status));

  const query = db
    .select()
    .from(schema.purchases)
    .orderBy(desc(schema.purchases.purchaseDate))
    .limit(200)
    .$dynamic();
  if (where.length > 0) query.where(or(...where));
  const purchases = await query.all();

  const ids = purchases.map((p) => p.id);
  const items = ids.length > 0
    ? await db.select().from(schema.purchaseItems).where(inArray(schema.purchaseItems.purchaseId, ids)).all()
    : [];
  const itemsByPurchase = new Map<string, (typeof schema.purchaseItems.$inferSelect)[]>();
  items.forEach((it) => {
    const list = itemsByPurchase.get(it.purchaseId) ?? [];
    list.push(it);
    itemsByPurchase.set(it.purchaseId, list);
  });

  const users = await db.select().from(authSchema.user).all();
  const userName = new Map(users.map((u) => [u.id, u.name]));

  return okList(
    purchases.map((p) => toPurchase(p, itemsByPurchase.get(p.id) ?? [], userName.get(p.userId)))
  );
}

const createPurchaseSchema = z.object({
  supplierId: z.string().min(1),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
        cost: z.number().int().positive(),
      })
    )
    .min(1),
  note: z.string().optional(),
});

// POST /api/purchases — buat dokumen pembelian (admin/gudang).
// Status "menunggu"; stok belum berubah sampai /receive dipanggil.
export async function POST(req: NextRequest) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;
  const body = await parseBody(createPurchaseSchema, req);
  if ("error" in body) return body.error;

  const supplier = await db
    .select()
    .from(schema.suppliers)
    .where(eq(schema.suppliers.id, body.data.supplierId))
    .get();
  if (!supplier) return err("Supplier tidak ditemukan.", 404);

  // validasi semua produk dulu (di luar transaksi)
  const productIds = body.data.items.map((it) => it.productId);
  const productRows = await db
    .select()
    .from(schema.products)
    .where(inArray(schema.products.id, productIds))
    .all();
  const productById = new Map(productRows.map((p) => [p.id, p]));
  for (const id of productIds) {
    if (!productById.has(id)) return err("Produk tidak ditemukan.", 404);
  }

  const createdAt = nowISO();
  const purchaseId = uid();
  let itemsDto: {
    productId: string;
    productName: string;
    sku: string;
    unit: string;
    qty: number;
    cost: number;
    subtotal: number;
  }[] = [];

  const purchase = db.transaction((tx) => {
    const resolved = body.data.items.map((line) => ({
      product: productById.get(line.productId)!,
      quantity: line.quantity,
      cost: line.cost,
    }));

    const total = resolved.reduce((s, r) => s + r.cost * r.quantity, 0);
    const seq = nextDocSeq(tx, schema.purchases, "PO");
    const purchaseNumber = `PO-${localYyyymmdd()}-${String(seq).padStart(4, "0")}`;

    tx.insert(schema.purchases)
      .values({
        id: purchaseId,
        purchaseNumber,
        supplierId: supplier.id,
        supplierName: supplier.name,
        userId: guard.user.id,
        purchaseDate: createdAt,
        total,
        status: "menunggu",
        note: body.data.note?.trim() || null,
        receivedAt: null,
      })
      .run();

    itemsDto = resolved.map((r) => ({
      productId: r.product.id,
      productName: r.product.name,
      sku: r.product.sku,
      unit: r.product.unit,
      qty: r.quantity,
      cost: r.cost,
      subtotal: r.cost * r.quantity,
    }));

    itemsDto.forEach((it) => {
      tx.insert(schema.purchaseItems)
        .values({
          id: uid(),
          purchaseId,
          productId: it.productId,
          productName: it.productName,
          sku: it.sku,
          unit: it.unit,
          quantity: it.qty,
          cost: it.cost,
          subtotal: it.subtotal,
        })
        .run();
    });

    return { purchaseNumber, total };
  });

  return ok({
    purchase: {
      id: purchaseId,
      purchaseNumber: purchase.purchaseNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      createdBy: guard.user.id,
      items: itemsDto,
      total: purchase.total,
      status: "menunggu" as const,
      note: body.data.note?.trim() || null,
      createdAt,
      receivedAt: null,
    },
  });
}
