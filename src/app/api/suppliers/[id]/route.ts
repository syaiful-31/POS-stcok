import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { err, ok, requireRole, parseBody, isGuardError } from "@/lib/api";
import { toSupplier } from "@/lib/domain";

// PATCH /api/suppliers/[id] — perbarui supplier (admin/gudang)
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/suppliers/[id]">) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const body = await parseBody(
    z.object({
      name: z.string().min(1).optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
    }),
    req
  );
  if ("error" in body) return body.error;

  const existing = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).get();
  if (!existing) return err("Supplier tidak ditemukan.", 404);

  await db
    .update(schema.suppliers)
    .set({
      ...(body.data.name !== undefined ? { name: body.data.name.trim() } : {}),
      ...(body.data.phone !== undefined ? { phone: body.data.phone.trim() } : {}),
      ...(body.data.address !== undefined ? { address: body.data.address.trim() } : {}),
    })
    .where(eq(schema.suppliers.id, id))
    .run();

  const updated = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).get();
  return ok({ data: toSupplier(updated!) });
}

// DELETE /api/suppliers/[id] — hapus supplier (admin/gudang); ditolak bila
// supplier punya riwayat pembelian.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/suppliers/[id]">) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const existing = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id)).get();
  if (!existing) return err("Supplier tidak ditemukan.", 404);

  const hasPurchases =
    (await db.select({ id: schema.purchases.id }).from(schema.purchases).where(eq(schema.purchases.supplierId, id)).limit(1).all()).length > 0;
  if (hasPurchases) {
    return err("Supplier memiliki riwayat pembelian dan tidak dapat dihapus.");
  }

  await db.delete(schema.suppliers).where(eq(schema.suppliers.id, id)).run();
  return ok({});
}
