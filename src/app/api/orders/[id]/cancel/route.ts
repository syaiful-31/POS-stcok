import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { err, ok, requireRole, isGuardError, uid, nowISO } from "@/lib/api";

// POST /api/orders/[id]/cancel — batalkan pesanan (admin/kasir).
// Status -> batal, stok item dikembalikan, pergerakan masuk dicatat.
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/orders/[id]/cancel">) {
  const guard = await requireRole(["admin", "kasir"]);
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const order = await db.select().from(schema.orders).where(eq(schema.orders.id, id)).get();
  if (!order) return err("Pesanan tidak ditemukan.", 404);
  if (order.status === "batal") return err("Pesanan sudah dibatalkan sebelumnya.");

  const items = await db
    .select()
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, id))
    .all();
  const now = nowISO();

  db.transaction((tx) => {
    tx.update(schema.orders).set({ status: "batal" }).where(eq(schema.orders.id, id)).run();
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
          type: "penjualan",
          quantity: item.quantity,
          referenceType: "order",
          referenceId: order.id,
          note: `Pembatalan ${order.orderNumber}`,
          userId: guard.user.id,
          createdAt: now,
        })
        .run();
    }
  });

  return ok({ order: { id: order.id, orderNumber: order.orderNumber, status: "batal" } });
}
