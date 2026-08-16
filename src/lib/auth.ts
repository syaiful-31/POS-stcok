import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/client";
import { buildAuthOptions } from "./auth-options";

// Instance Better Auth tunggal. Tabel auth (user/session/account/
// verification) ada di src/db/auth-schema.ts (hasil generator CLI)
// dan didaftarkan pada instance drizzle di src/db/client.ts.
export const auth = betterAuth(
  buildAuthOptions(drizzleAdapter(db, { provider: "sqlite" }))
);
