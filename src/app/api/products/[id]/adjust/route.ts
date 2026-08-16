import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { err, ok, requireRole, parseBody, isGuardError, uid, nowISO } from "@/lib/api";

// POST /api/products/[id]/adjust — penyesuaian stok (stock opname).
// Mencatat selisih sebagai pergerakan tipe "penyesuaian".
export async function POST(req: NextRequest, ctx: RouteContext<"/api/products/[id]/adjust">) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const body = await parseBody(
    z.object({
      newQty: z.number().int().min(0),
      note: z.string().optional(),
    }),
    req
  );
  if ("error" in body) return body.error;

  const product = await db.select().from(schema.products).where(eq(schema.products.id, id)).get();
  if (!product) return err("Produk tidak ditemukan.", 404);

  const diff = body.data.newQty - product.stockQty;

  db.transaction((tx) => {
    tx.update(schema.products)
      .set({ stockQty: body.data.newQty })
      .where(eq(schema.products.id, id))
      .run();
    if (diff !== 0) {
      tx.insert(schema.stockMovements)
        .values({
          id: uid(),
          productId: product.id,
          productName: product.name,
          type: "penyesuaian",
          quantity: diff,
          referenceType: "adjustment",
          referenceId: null,
          note: body.data.note?.trim() || `Stok fisik: ${body.data.newQty} ${product.unit}`,
          userId: guard.user.id,
          createdAt: nowISO(),
        })
        .run();
    }
  });

  return ok({ diff });
}
