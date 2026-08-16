# Develer POS — Full-stack (Lean POS Distributor FMCG)

Aplikasi POS distributor FMCG sesuai `penjualan-prd.md`: kasir (pesanan lunas +
cetak struk), stok dengan audit pergerakan, pembelian dari supplier, profil &
riwayat pelanggan, rekap penjualan dengan ekspor CSV, RBAC (Admin/Kasir/Gudang).

**Frontend dan backend sudah terintegrasi**: UI memanggil API (Next.js route
handlers + Drizzle + SQLite + Better Auth) melalui store cache di
`src/store/use-store.ts` — tidak ada lagi data mock di browser.

## Quick-Start (instalasi produksi)

Dua jalur instalasi sesuai PRD (`penjualan-prd.md` §5 arsitektur monolit,
§7 deployment Docker). Keduanya memakai konfigurasi lingkungan yang sama —
template lengkap ada di `.env.example`.

Prasyarat umum:
- Node.js ≥ 24 (**bare-metal**) ATAU Docker + Docker Compose (**Docker**)
- Port 3000 terbuka (atau dibalik proxy/port lain)
- Akses ke printer thermal bila mencetak struk fisik dari mesin klien

### Opsi A — Bare-metal (Node.js langsung di server)

```bash
# 1. Ambil kode, pasang dependensi, build
git clone <url-repo> pos-app && cd pos-app
npm install
npm run build

# 2. Konfigurasi lingkungan
cp .env.example .env
#    isi .env: BETTER_AUTH_URL (URL publik, https:// di produksi),
#    BETTER_AUTH_SECRET (generate: openssl rand -base64 32),
#    FIRST_ADMIN_EMAIL & FIRST_ADMIN_PASSWORD (admin pertama)

# 3. Migrasi database & bootstrap admin (hanya saat DB kosong)
npm run db:migrate
npm run db:bootstrap

# 4. Jalankan (port 3000)
NODE_ENV=production npm start
#    Windows PowerShell: $env:NODE_ENV="production"; npm start
```

Jalankan sebagai layanan systemd (`/etc/systemd/system/pos-app.service`):

```ini
[Unit]
Description=Develer POS
After=network.target

[Service]
WorkingDirectory=/opt/pos-app
EnvironmentFile=/opt/pos-app/.env
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now pos-app
```

### Opsi B — Docker (docker compose)

```bash
# 1. Ambil kode & konfigurasi
git clone <url-repo> pos-app && cd pos-app
cp .env.example .env
#    isi .env — compose membaca file ini; env wajib yang kosong
#    membuat `docker compose up` GAGAL dengan pesan jelas

# 2. Build & jalankan (migrasi + bootstrap admin + server otomatis)
docker compose up --build -d

# 3. Pantau & cek
docker compose logs -f pos
curl -I http://localhost:3000/login   # 200 = siap
```

Operasional:

```bash
docker compose down          # hentikan (data aman di volume)
docker compose up -d         # jalankan lagi

# backup database (volume bernama pos-app_pos-data bila folder proyek = pos-app)
docker run --rm -v pos-app_pos-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/pos-data-backup.tar.gz -C /data .
```

### Memilih jalur

| Kondisi | Jalur |
|---|---|
| Server sudah punya Node.js, tanpa Docker, ingin unit systemd sederhana | Bare-metal |
| Ingin deployment standar, mudah di-upgrade/di-rollback, backup volume | Docker |

> **Catatan**: `npm run db:seed` (data demo) hanya untuk pengembangan &
> pengujian — jangan dijalankan di produksi. Produksi memakai bootstrap
> admin; data dibuat lewat aplikasi.

## Menjalankan (dev)

```bash
npm install
npm run db:migrate   # terapkan migrasi ke data/pos.db
npm run db:seed      # isi data demo (idempotent; FORCE=1 untuk reset)
npm run dev          # http://localhost:3000
```

Production build: `npm run build && npm start`

Smoke test browser-driven (Playwright): jalankan `npm run dev` di terminal
lain, lalu `node smoke-test.mjs` (16 cek alur UI) dan
`node check-integration.mjs` (persistensi lintas-browser SQLite, halaman
pengguna, Reset Data Demo). Screenshot tersimpan di `smoke-shots/`.

## Backend

| Bagian | Teknologi |
|---|---|
| API | Next.js Route Handlers (`src/app/api/*`) |
| Auth | Better Auth (email+password, sesi cookie) dengan field `role` di tabel user |
| DB | SQLite (`data/pos.db`) via better-sqlite3, transaksi sinkron atomik |
| ORM | Drizzle ORM — migrasi di `drizzle/` (`npm run db:generate`) |
| Validasi | zod |

Endpoint utama (kontrak respons: `{ ok: true, ...data }` / `{ ok: false, error }`):

- `POST /api/auth/*` — sign-in/sign-out/sign-up (Better Auth)
- `GET|POST /api/products`, `PATCH|DELETE /api/products/[id]`, `POST /api/products/[id]/adjust`, `GET /api/products/[id]/movements`
- `GET|POST /api/customers`, `PATCH|DELETE /api/customers/[id]`
- `GET|POST /api/suppliers`, `PATCH|DELETE /api/suppliers/[id]`
- `GET|POST /api/orders`, `POST /api/orders/[id]/cancel` — validasi stok atomik dalam transaksi
- `GET|POST /api/purchases`, `POST /api/purchases/[id]/receive`
- `GET /api/dashboard/summary?from&to` (admin)
- `GET /api/export/csv?from&to` (admin) — CSV multi-section
- `GET|POST /api/users`, `PATCH|DELETE /api/users/[id]` (admin)

RBAC: Admin = semua; Kasir = kasir/pesanan/pelanggan; Gudang =
produk/supplier/pembelian. Guard di `src/lib/api.ts` (`requireRole`).

API smoke test: `node api-smoke.mjs` (dev server aktif) — 29 pemeriksaan:
login per role, RBAC 401/403, pesanan atomik + pembatalan restock,
penyesuaian stok, pembelian + terima barang, rekap, CSV, kelola user.

## Docker

```bash
docker compose up --build   # migrasi + seed otomatis saat start
```

Data SQLite persisten di volume `pos-data` (`/app/data`).

`Dockerfile` (3 stage) + `docker-entrypoint.sh`:
- stage `deps`: `npm ci` dengan build tools (python3/make/g++) untuk native
  module better-sqlite3 bila prebuild tidak tersedia
- stage `build`: `next build`
- stage `runner`: file minimal + `npm rebuild better-sqlite3`; entrypoint
  membuat direktori DB → `drizzle-kit migrate` → **bootstrap admin pertama**
  (bila DB kosong) → `next start`; HEALTHCHECK memeriksa `/login`

Status verifikasi: set file & alur entrypoint **telah disimulasikan 1:1** di
mesin lokal (direktori bersih berisi persis file hasil COPY runner stage,
NODE_ENV=production, port terpisah): migrasi + `next start` berjalan,
API smoke 29/29 dan alur UI kasir→struk lulus tanpa error konsol.
Build image Linux itu sendiri perlu dijalankan di host Docker
(`docker compose up --build`) — Docker tidak terpasang di mesin pengembang.

## Deployment produksi

1. **Env wajib** (lihat `.env.example`): `BETTER_AUTH_URL` (URL publik,
   `https://` di produksi), `BETTER_AUTH_SECRET` (generate:
   `openssl rand -base64 32`), `DATABASE_URL`, dan `FIRST_ADMIN_*`.
2. **Admin pertama**: dibuat otomatis dari `FIRST_ADMIN_*` saat database
   kosong (idempotent). Setelah itu, akun Kasir/Gudang/tambahan Admin
   dikelola dari menu **Pengguna** oleh admin. Password minimum 8 karakter.
3. **Fail-fast**: aplikasi menolak start di produksi bila
   `BETTER_AUTH_URL`/`BETTER_AUTH_SECRET` tidak diisi — tidak ada default
   lemah. Cookie sesi `Secure` aktif otomatis untuk URL `https://`;
   rate limit auth aktif di produksi.
4. Jalankan: `docker compose up --build` (atau `npm run build && npm start`
   di server Node 24 dengan env di atas + `npx drizzle-kit migrate`).

## Pengguna & RBAC

| Role | Menu |
|------|------|
| Admin | Semua menu, termasuk Pengguna & Pengaturan Toko |
| Kasir | Kasir, Riwayat Pesanan, Pelanggan |
| Gudang | Stok, Supplier, Pembelian |

Data demo (`npm run db:seed`, `db:seed:force`) adalah **fixture dev** untuk
pengujian — tidak pernah dijalankan di produksi.

## Struktur

```
src/
├─ app/
│  ├─ login/                    halaman login
│  └─ (protected)/              AuthGuard + AppShell (sidebar RBAC)
│     ├─ dashboard/             rekap penjualan + ekspor CSV
│     ├─ pos/                   kasir: cari produk, keranjang, bayar, struk
│     ├─ orders/                riwayat pesanan, batal, cetak ulang
│     ├─ customers/             pelanggan (+detail & riwayat belanja)
│     ├─ inventory/             stok (+detail & log audit pergerakan)
│     ├─ suppliers/             data supplier
│     ├─ purchases/             pembelian + terima barang
│     └─ users/                 kelola pengguna (admin)
├─ components/                  UI per fitur (dialog, struk, tabel)
├─ store/
│  ├─ types.ts                  entitas (mirror skema PRD)
│  ├─ use-store.ts              klien cache API: seluruh aksi domain
│  ├─ use-shop-store.ts         konfigurasi toko lokal (struk)
│  └─ selectors.ts              agregasi (rekap, statistik pelanggan, RBAC)
├─ db/
│  ├─ client.ts, schema.ts      SQLite via Drizzle + skema domain
│  ├─ auth-schema.ts            tabel Better Auth
│  ├─ bootstrap.ts              admin pertama dari env (produksi)
│  └─ seed.ts                   fixture demo (DEV SAJA)
└─ lib/                         ids, format, konstanta, CSV, auth, api
```

Struktur backend:

```
src/app/api/                    route handlers (produk, pesanan, pembelian, dll.)
src/app/api/auth/[...all]       handler Better Auth
src/db/                         client (better-sqlite3), skema domain, skema
                                auth, seed
src/lib/auth.ts                 instance Better Auth (+ auth-options.ts)
src/lib/api.ts                  guard sesi & role, validasi zod
drizzle/                        migrasi SQL (drizzle-kit)
scripts/generate-auth-schema.ts generator skema auth (dev)
docker-entrypoint.sh            migrasi + seed otomatis di container
```

## Catatan

- **Cetak struk**: tombol di dialog struk memanggil dialog cetak browser —
  pilih printer thermal atau "Save as PDF" (CSS `@media print` 80mm di
  `globals.css`).
- **Ekspor CSV**: multi-section (penjualan, stok, pembelian) dengan BOM &
  CRLF agar rapi di Excel Windows, dihasilkan backend (`/api/export/csv`).
- Konfigurasi toko (nama/alamat/telepon di struk) disimpan per-perangkat di
  localStorage (`use-shop-store.ts`) — bukan bagian skema PRD.
- Data tersimpan di `data/pos.db` (SQLite server); sesi memakai cookie
  Better Auth.
- Better Auth menolak POST tanpa header `Origin` yang cocok (proteksi
  CSRF) dan mewajibkan body JSON valid (mis. `{}` untuk sign-out) —
  relevan untuk klien API non-browser.
#   P O S - m a n a j e m e n t - s t c o k  
 