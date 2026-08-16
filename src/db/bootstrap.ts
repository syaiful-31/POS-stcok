// Bootstrap admin pertama — produksi tidak meng-seed data demo; admin awal
// dibuat dari environment variables SAAT DATABASE KOSONG (idempotent).
//
//   FIRST_ADMIN_NAME     (opsional, default "Administrator")
//   FIRST_ADMIN_EMAIL    (wajib bila tabel user kosong)
//   FIRST_ADMIN_PASSWORD (wajib bila tabel user kosong, min. 8 karakter)
//
// Dijalankan otomatis oleh docker-entrypoint.sh, atau manual:
//   npx tsx src/db/bootstrap.ts

import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import * as authSchema from "@/db/auth-schema";

export async function bootstrapAdmin(): Promise<{
  created: boolean;
  email?: string;
}> {
  const count = (
    await db.select({ n: sql<number>`count(*)` }).from(authSchema.user).all()
  )[0]?.n;
  if ((count ?? 0) > 0) {
    console.log("[bootstrap] User sudah ada — bootstrap dilewati.");
    return { created: false };
  }

  const name = (process.env.FIRST_ADMIN_NAME ?? "Administrator").trim();
  const email = (process.env.FIRST_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.FIRST_ADMIN_PASSWORD ?? "";

  if (!email || !password) {
    throw new Error(
      "Database kosong: isi FIRST_ADMIN_EMAIL dan FIRST_ADMIN_PASSWORD (min. 8 karakter) untuk membuat admin pertama."
    );
  }
  if (password.length < 8) {
    throw new Error("FIRST_ADMIN_PASSWORD minimal 8 karakter.");
  }

  const result = await auth.api.signUpEmail({
    body: { name, email, password },
  });
  if (!result.user) {
    throw new Error("Gagal membuat akun admin pertama.");
  }
  await db
    .update(authSchema.user)
    .set({ role: "admin" })
    .where(eq(authSchema.user.id, result.user.id));

  console.log(`[bootstrap] Admin pertama dibuat: ${email}`);
  return { created: true, email };
}

// Jalankan langsung: npx tsx src/db/bootstrap.ts
if (process.argv[1]?.includes("bootstrap.ts") || process.argv[1]?.includes("bootstrap.mjs")) {
  bootstrapAdmin()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("Bootstrap admin gagal:", e.message);
      process.exit(1);
    });
}
