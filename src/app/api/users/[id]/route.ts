import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import * as authSchema from "@/db/auth-schema";
import { err, ok, requireRole, parseBody, isGuardError } from "@/lib/api";
import { toUser } from "@/lib/domain";

// PATCH /api/users/[id] — perbarui pengguna (admin): nama, email, role,
// password (opsional). Guard: email unik & admin terakhir tak bisa diturunkan.
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/users/[id]">) {
  const guard = await requireRole(["admin"]);
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const body = await parseBody(
    z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      role: z.enum(["admin", "kasir", "gudang"]).optional(),
      password: z.string().min(8).max(128).optional(),
    }),
    req
  );
  if ("error" in body) return body.error;

  const target = await db.select().from(authSchema.user).where(eq(authSchema.user.id, id)).get();
  if (!target) return err("User tidak ditemukan.", 404);

  if (body.data.email) {
    const email = body.data.email.trim().toLowerCase();
    const taken = await db
      .select({ id: authSchema.user.id })
      .from(authSchema.user)
      .where(and(eq(authSchema.user.email, email)))
      .get();
    if (taken && taken.id !== id) {
      return err(`Email "${body.data.email}" sudah dipakai user lain.`);
    }
  }

  if (
    target.role === "admin" &&
    body.data.role !== undefined &&
    body.data.role !== "admin"
  ) {
    const adminCount = (
      await db.select().from(authSchema.user).where(eq(authSchema.user.role, "admin")).all()
    ).length;
    if (adminCount === 1) {
      return err("Tidak dapat mengubah role admin terakhir.");
    }
  }

  await db
    .update(authSchema.user)
    .set({
      ...(body.data.name !== undefined ? { name: body.data.name.trim() } : {}),
      ...(body.data.email !== undefined ? { email: body.data.email.trim().toLowerCase() } : {}),
      ...(body.data.role !== undefined ? { role: body.data.role } : {}),
    })
    .where(eq(authSchema.user.id, id))
    .run();

  if (body.data.password) {
    const hashed = await hashPassword(body.data.password);
    await db
      .update(authSchema.account)
      .set({ password: hashed })
      .where(and(eq(authSchema.account.userId, id), eq(authSchema.account.providerId, "credential")))
      .run();
  }

  const updated = await db.select().from(authSchema.user).where(eq(authSchema.user.id, id)).get();
  return ok({ user: toUser(updated!) });
}

// DELETE /api/users/[id] — hapus pengguna (admin). Guard: bukan diri sendiri,
// bukan admin terakhir, dan tidak punya riwayat transaksi.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/users/[id]">) {
  const guard = await requireRole(["admin"]);
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const target = await db.select().from(authSchema.user).where(eq(authSchema.user.id, id)).get();
  if (!target) return err("User tidak ditemukan.", 404);
  if (target.id === guard.user.id) {
    return err("Tidak dapat menghapus akun yang sedang dipakai.");
  }
  if (target.role === "admin") {
    const adminCount = (
      await db.select().from(authSchema.user).where(eq(authSchema.user.role, "admin")).all()
    ).length;
    if (adminCount === 1) return err("Tidak dapat menghapus admin terakhir.");
  }

  const hasActivity =
    (await db.select({ id: schema.orders.id }).from(schema.orders).where(eq(schema.orders.userId, id)).limit(1).all()).length > 0 ||
    (await db.select({ id: schema.purchases.id }).from(schema.purchases).where(eq(schema.purchases.userId, id)).limit(1).all()).length > 0 ||
    (await db.select({ id: schema.stockMovements.id }).from(schema.stockMovements).where(eq(schema.stockMovements.userId, id)).limit(1).all()).length > 0;
  if (hasActivity) {
    return err("User memiliki riwayat transaksi dan tidak dapat dihapus.");
  }

  // endpoint deleteUser Better Auth adalah hapus-akun-mandiri (butuh sesi),
  // bukan admin delete-by-id — hapus langsung lewat DB: sesi, akun,
  // verifikasi, lalu user.
  db.transaction((tx) => {
    tx.delete(authSchema.session).where(eq(authSchema.session.userId, id)).run();
    tx.delete(authSchema.account).where(eq(authSchema.account.userId, id)).run();
    tx.delete(authSchema.verification)
      .where(eq(authSchema.verification.identifier, target.email))
      .run();
    tx.delete(authSchema.user).where(eq(authSchema.user.id, id)).run();
  });
  return ok({});
}
