import type { BetterAuthOptions } from "better-auth";

// Konfigurasi Better Auth — sumber tunggal, dipakai oleh src/lib/auth.ts
// dan skrip bootstrap admin. Di produksi, konfigurasi yang hilang membuat
// aplikasi GAGAL START (fail-fast) alih-alih berjalan dengan default lemah.
export function buildAuthOptions(
  database: BetterAuthOptions["database"]
): BetterAuthOptions {
  const isProd = process.env.NODE_ENV === "production";

  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) {
    throw new Error(
      "BETTER_AUTH_URL wajib diisi (mis. http://localhost:3000 atau https://pos.perusahaan.com)."
    );
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    if (isProd) {
      throw new Error(
        "BETTER_AUTH_SECRET wajib diisi di produksi. Generate dengan: openssl rand -base64 32"
      );
    }
    console.warn(
      "[auth] BETTER_AUTH_SECRET tidak diisi — memakai secret dev (JANGAN di produksi)."
    );
  }

  const useSecureCookies =
    process.env.AUTH_SECURE_COOKIES === "true" || baseURL.startsWith("https://");

  return {
    baseURL,
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
      max: 100, // permintaan auth per window per IP
    },
    advanced: {
      // cookie hanya lewat HTTPS bila di belakang HTTPS/proxy TLS
      useSecureCookies,
    },
    trustedOrigins: [baseURL],
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
