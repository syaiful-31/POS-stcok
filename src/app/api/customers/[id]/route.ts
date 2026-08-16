import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { err, ok, requireRole, parseBody, isGuardError } from "@/lib/api";
import { toCustomer } from "@/lib/domain";

// PATCH /api/customers/[id] — perbarui pelanggan (admin/kasir)
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  const guard = await requireRole(["admin", "kasir"]);
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

  const existing = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).get();
  if (!existing) return err("Pelanggan tidak ditemukan.", 404);

  await db
    .update(schema.customers)
    .set({
      ...(body.data.name !== undefined ? { name: body.data.name.trim() } : {}),
      ...(body.data.phone !== undefined ? { phone: body.data.phone.trim() } : {}),
      ...(body.data.address !== undefined ? { address: body.data.address.trim() } : {}),
    })
    .where(eq(schema.customers.id, id))
    .run();

  const updated = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).get();
  return ok({ data: toCustomer(updated!) });
}

// DELETE /api/customers/[id] — hapus pelanggan (admin/kasir); ditolak bila
// pelanggan punya riwayat pesanan.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/customers/[id]">) {
  const guard = await requireRole(["admin", "kasir"]);
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const existing = await db.select().from(schema.customers).where(eq(schema.customers.id, id)).get();
  if (!existing) return err("Pelanggan tidak ditemukan.", 404);

  const hasOrders =
    (await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.customerId, id)).limit(1).all()).length > 0;
  if (hasOrders) {
    return err("Pelanggan memiliki riwayat pesanan dan tidak dapat dihapus.");
  }

  await db.delete(schema.customers).where(eq(schema.customers.id, id)).run();
  return ok({});
}
