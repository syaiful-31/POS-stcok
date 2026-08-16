// Menghasilkan src/db/auth-schema.ts (tabel Better Auth: user, session,
// account, verification) agar ikut di-migrate drizzle-kit.
// Jalankan: npx tsx scripts/generate-auth-schema.ts
import { generateDrizzleSchema } from "@better-auth/cli/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { auth } from "../src/lib/auth";
import { db } from "../src/db/client";

async function main() {
  // generator butuh factory adapter mentah (membaca adapter.options.provider)
  const adapter = drizzleAdapter(db, { provider: "sqlite" });
  const result = await generateDrizzleSchema({
    adapter: adapter as never,
    options: auth.options as never,
    file: "src/db/auth-schema.ts",
  });
  console.log("Auth schema generated:", result.fileName);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
