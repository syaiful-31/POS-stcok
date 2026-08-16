import type { Role } from "@/store/types";

export const APP_NAME = "Develer POS";
export const APP_TAGLINE = "Sistem Kasir & Stok Distributor FMCG";

export const SHOP_INFO = {
  name: "Develer Distribusi",
  address: "Jl. Raya Industri No. 88, Bandung",
  phone: "(022) 1234-5678",
} as const;

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  kasir: "Kasir",
  gudang: "Gudang",
};

// RBAC sesuai PRD §5:
// - Admin : akses penuh
// - Kasir : Kasir, Riwayat Pesanan (cetak struk), Pelanggan
// - Gudang: Stok, Supplier, Pembelian
// Rekap Penjualan tidak tercantum untuk Kasir/Gudang -> khusus Admin.
export const ROLE_ROUTES: Record<Role, string[]> = {
  admin: [
    "/dashboard",
    "/pos",
    "/orders",
    "/inventory",
    "/customers",
    "/suppliers",
    "/purchases",
    "/users",
  ],
  kasir: ["/pos", "/orders", "/customers"],
  gudang: ["/inventory", "/suppliers", "/purchases"],
};

export const ROLE_HOME: Record<Role, string> = {
  admin: "/dashboard",
  kasir: "/pos",
  gudang: "/inventory",
};
