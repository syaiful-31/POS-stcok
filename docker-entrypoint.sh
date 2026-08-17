#!/bin/sh
# Produksi: terapkan migrasi, bootstrap admin pertama (bila database
# kosong), lalu jalankan server Next.js. Tidak ada seed data demo.
set -e

# fail-fast: env wajib produksi — tolak start sebelum server berjalan
# (validasi sama dengan fail-fast runtime di src/lib/auth-options.ts)
if [ -z "$BETTER_AUTH_URL" ] || [ -z "$BETTER_AUTH_SECRET" ]; then
  echo "[entrypoint] ERROR: BETTER_AUTH_URL dan BETTER_AUTH_SECRET wajib diisi." >&2
  echo "[entrypoint] Lihat .env.example: cp .env.example .env lalu isi nilainya." >&2
  exit 1
fi

# pastikan direktori database ada (drizzle-kit tidak membuatnya sendiri)
DB_PATH=$(echo "${DATABASE_URL:-file:./data/pos.db}" | sed 's|^file:||')
mkdir -p "$(dirname "$DB_PATH")"

echo "[entrypoint] menerapkan migrasi database..."
npx drizzle-kit migrate

echo "[entrypoint] bootstrap admin pertama (dilewati bila sudah ada user)..."
npx tsx src/db/bootstrap.ts

echo "[entrypoint] memulai server..."
exec npm start
