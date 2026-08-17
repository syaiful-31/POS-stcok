import type { BetterAuthOptions } from "better-auth";

// Konfigurasi Better Auth — sumber tunggal, dipakai oleh src/lib/auth.ts
// dan skrip bootstrap admin. Di produksi, konfigurasi yang hilang membuat
// aplikasi GAGAL START (fail-fast) alih-alih berjalan dengan default lemah.
export function buildAuthOptions(
  database: BetterAuthOptions["database"]
): BetterAuthOptions {
  const isProd = process.env.NODE_ENV === "production";
  // Saat `next build` env produksi memang belum tersedia (image Docker
  // dibangun tanpa .env). Fail-fast ditangguhkan ke runtime — route API
  // semuanya dinamis (ƒ), tidak ada yang di-prerender dengan nilai sementara.
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";

  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL && !isBuild) {
    throw new Error(
      "BETTER_AUTH_URL wajib diisi (mis. http://localhost:3000 atau https://pos.perusahaan.com)."
    );
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    if (isProd && !isBuild) {
      throw new Error(
        "BETTER_AUTH_SECRET wajib diisi di produksi. Generate dengan: openssl rand -base64 32"
      );
    }
    console.warn(
      "[auth] BETTER_AUTH_SECRET tidak diisi — memakai secret dev (JANGAN di produksi)."
    );
  }

  const resolvedBaseURL = baseURL ?? "http://localhost:3000";
  const useSecureCookies =
    process.env.AUTH_SECURE_COOKIES === "true" || resolvedBaseURL.startsWith("https://");

  return {
    baseURL: resolvedBaseURL,
    secret: secret ?? "dev-only-secret-change-me",
    database,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    // rate limit aktif di produksi (per IP); nonaktif di dev agar nyaman
    rateLimit: {
      enabled: isProd,
      window: 60, // detik
      max: 100, // permintaan auth umum per window per IP
      // Catatan: better-auth punya aturan bawaan tersembunyi 3x/10 detik untuk
      // /sign-in & /sign-up. Terlalu ketat untuk POS: beberapa kasir login
      // bersamaan dari satu IP publik (NAT toko) langsung kena 429. Dinaikkan
      // eksplisit di sini agar tetap menahan brute force tanpa mengunci kasir.
      customRules: {
        "/sign-in/*": { window: 10, max: 20 },
        "/sign-up/*": { window: 10, max: 20 },
      },
    },
    advanced: {
      // cookie hanya lewat HTTPS bila di belakang HTTPS/proxy TLS
      useSecureCookies,
    },
    trustedOrigins: [resolvedBaseURL],
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          input: false,
          defaultValue: "kasir",
        },
      },
    },
  };
}
