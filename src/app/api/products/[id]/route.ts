import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { err, ok, requireRole, parseBody, isGuardError } from "@/lib/api";
import { toProduct } from "@/lib/domain";

// PATCH /api/products/[id] — perbarui info produk (admin/gudang).
// Stok diubah lewat /adjust.
export async function PATCH(_req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const body = await parseBody(
    z.object({
      sku: z.string().min(1).optional(),
      name: z.string().min(1).optional(),
      unit: z.string().min(1).optional(),
      price: z.number().int().positive().optional(),
      minStock: z.number().int().min(0).optional(),
    }),
    _req
  );
  if ("error" in body) return body.error;

  const existing = await db.select().from(schema.products).where(eq(schema.products.id, id)).get();
  if (!existing) return err("Produk tidak ditemukan.", 404);

  if (body.data.sku) {
    const skuTaken = await db
      .select({ id: schema.products.id })
      .from(schema.products)
      .where(eq(schema.products.sku, body.data.sku.trim()))
      .get();
    if (skuTaken && skuTaken.id !== id) {
      return err(`SKU "${body.data.sku}" sudah dipakai produk lain.`);
    }
  }

  await db
    .update(schema.products)
    .set({
      ...(body.data.sku !== undefined ? { sku: body.data.sku.trim() } : {}),
      ...(body.data.name !== undefined ? { name: body.data.name.trim() } : {}),
      ...(body.data.unit !== undefined ? { unit: body.data.unit.trim() } : {}),
      ...(body.data.price !== undefined ? { price: body.data.price } : {}),
      ...(body.data.minStock !== undefined ? { minStock: body.data.minStock } : {}),
    })
    .where(eq(schema.products.id, id))
    .run();

  const updated = await db.select().from(schema.products).where(eq(schema.products.id, id)).get();
  return ok({ data: toProduct(updated!) });
}

// DELETE /api/products/[id] — hapus produk (admin/gudang); ditolak bila
// produk punya riwayat transaksi.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/products/[id]">) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const existing = await db.select().from(schema.products).where(eq(schema.products.id, id)).get();
  if (!existing) return err("Produk tidak ditemukan.", 404);

  const referenced =
    (await db.select({ id: schema.orderItems.id }).from(schema.orderItems).where(eq(schema.orderItems.productId, id)).limit(1).all()).length > 0 ||
    (await db.select({ id: schema.purchaseItems.id }).from(schema.purchaseItems).where(eq(schema.purchaseItems.productId, id)).limit(1).all()).length > 0;
  if (referenced) {
    return err("Produk memiliki riwayat transaksi dan tidak dapat dihapus.");
  }

  db.transaction((tx) => {
    tx.delete(schema.stockMovements).where(eq(schema.stockMovements.productId, id)).run();
    tx.delete(schema.products).where(eq(schema.products.id, id)).run();
  });

  return ok({});
}
