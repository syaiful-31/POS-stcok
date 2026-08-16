#!/bin/sh
# Produksi: terapkan migrasi, bootstrap admin pertama (bila database
# kosong), lalu jalankan server Next.js. Tidak ada seed data demo.
set -e

# pastikan direktori database ada (drizzle-kit tidak membuatnya sendiri)
DB_PATH=$(echo "${DATABASE_URL:-file:./data/pos.db}" | sed 's|^file:||')
mkdir -p "$(dirname "$DB_PATH")"

echo "[entrypoint] menerapkan migrasi database..."
npx drizzle-kit migrate

echo "[entrypoint] bootstrap admin pertama (dilewati bila sudah ada user)..."
npx tsx src/db/bootstrap.ts

echo "[entrypoint] memulai server..."
exec npm start
