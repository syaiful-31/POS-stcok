import { eq } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import * as authSchema from "@/db/auth-schema";
import { err, ok, okList, requireRole, parseBody, isGuardError } from "@/lib/api";
import { toUser } from "@/lib/domain";
import type { Role } from "@/store/types";

// GET /api/users — daftar pengguna (admin)
export async function GET() {
  const guard = await requireRole(["admin"]);
  if (isGuardError(guard)) return guard.error;

  const users = await db.select().from(authSchema.user).all();
  return okList(users.map(toUser));
}

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["admin", "kasir", "gudang"]),
});

// POST /api/users — tambah pengguna (admin). Akun dibuat lewat Better Auth
// (hash password ditangani Better Auth), lalu role di-set server-side.
export async function POST(req: NextRequest) {
  const guard = await requireRole(["admin"]);
  if (isGuardError(guard)) return guard.error;
  const body = await parseBody(createUserSchema, req);
  if ("error" in body) return body.error;

  const email = body.data.email.trim().toLowerCase();
  const existing = await db
    .select({ id: authSchema.user.id })
    .from(authSchema.user)
    .where(eq(authSchema.user.email, email))
    .get();
  if (existing) return err(`Email "${body.data.email}" sudah dipakai user lain.`);

  const result = await auth.api.signUpEmail({
    body: { name: body.data.name.trim(), email, password: body.data.password },
  });
  if (!result.user) {
    return err("Gagal membuat akun. Periksa kembali input Anda.");
  }

  await db
    .update(authSchema.user)
    .set({ role: body.data.role as Role })
    .where(eq(authSchema.user.id, result.user.id))
    .run();

  return ok({
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: body.data.role,
    },
  });
}
