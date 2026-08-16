import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import * as authSchema from "@/db/auth-schema";
import { err, ok, requireRole, isGuardError, uid, nowISO } from "@/lib/api";
import { toPurchase } from "@/lib/domain";

// POST /api/purchases/[id]/receive — terima barang (admin/gudang).
// Status -> diterima, stok bertambah sesuai dokumen, pergerakan dicatat.
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/purchases/[id]/receive">) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const purchase = await db.select().from(schema.purchases).where(eq(schema.purchases.id, id)).get();
  if (!purchase) return err("Pembelian tidak ditemukan.", 404);
  if (purchase.status === "diterima") return err("Barang sudah diterima sebelumnya.");

  const items = await db
    .select()
    .from(schema.purchaseItems)
    .where(eq(schema.purchaseItems.purchaseId, id))
    .all();
  const now = nowISO();

  db.transaction((tx) => {
    tx.update(schema.purchases)
      .set({ status: "diterima", receivedAt: now })
      .where(eq(schema.purchases.id, id))
      .run();
    for (const item of items) {
      const product = tx
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, item.productId))
        .get();
      if (product) {
        tx.update(schema.products)
          .set({ stockQty: product.stockQty + item.quantity })
          .where(eq(schema.products.id, item.productId))
          .run();
      }
      tx.insert(schema.stockMovements)
        .values({
          id: uid(),
          productId: item.productId,
          productName: item.productName,
          type: "pembelian",
          quantity: item.quantity,
          referenceType: "purchase",
          referenceId: purchase.id,
          note: `Penerimaan ${purchase.purchaseNumber}`,
          userId: guard.user.id,
          createdAt: now,
        })
        .run();
    }
  });

  // kembalikan DTO lengkap (dengan items) agar frontend bisa menampilkannya
  const updated = await db.select().from(schema.purchases).where(eq(schema.purchases.id, id)).get();
  const updatedItems = await db
    .select()
    .from(schema.purchaseItems)
    .where(eq(schema.purchaseItems.purchaseId, id))
    .all();
  const user = await db
    .select({ name: authSchema.user.name })
    .from(authSchema.user)
    .where(eq(authSchema.user.id, updated!.userId))
    .get();

  return ok({ purchase: toPurchase(updated!, updatedItems, user?.name ?? null) });
}
