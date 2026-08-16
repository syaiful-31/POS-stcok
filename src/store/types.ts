// Tipe entitas mock — meniru skema PRD (tabel users, customers, products,
// orders, order_items, suppliers, purchases, purchase_items, stock_movements).
// Item pesanan/pembelian didenormalisasi (snapshot nama & harga saat kejadian)
// agar riwayat tetap utuh meski produk/entitas induk diubah atau dihapus.

export type Role = "admin" | "kasir" | "gudang";

// Identitas toko — tercetak di struk; dapat diubah oleh admin.
export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // plaintext — hanya untuk demo mock
  role: Role;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  price: number;
  stockQty: number;
  minStock: number;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  createdAt: string;
}

export type OrderStatus = "selesai" | "batal";
export type PaymentMethod = "tunai" | "transfer";

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  price: number; // harga saat transaksi
  qty: number;
  subtotal: number;
}

export interface Order {
  id: string;
  orderNumber: string; // SO-YYYYMMDD-####
  customerId: string | null;
  customerName: string | null;
  createdBy: string; // user id kasir
  cashierName?: string | null; // dari backend (join user)
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  changeAmount: number;
  createdAt: string;
}

export type PurchaseStatus = "menunggu" | "diterima";

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  qty: number;
  cost: number; // harga beli unit
  subtotal: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string; // PO-YYYYMMDD-####
  supplierId: string;
  supplierName: string;
  createdBy: string; // user id petugas
  userName?: string | null; // dari backend (join user)
  items: PurchaseItem[];
  total: number;
  status: PurchaseStatus;
  note?: string | null;
  createdAt: string;
  receivedAt?: string | null;
}

// type sesuai PRD: Penjualan, Pembelian, Penyesuaian.
// Pembatalan pesanan dicatat sebagai "penjualan" dengan qty positif + note.
export type MovementType = "penjualan" | "pembelian" | "penyesuaian";

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number; // bertanda: + masuk, - keluar
  referenceType: "order" | "purchase" | "adjustment";
  referenceId: string | null;
  note: string;
  createdBy: string;
  userName?: string | null; // dari backend (join user)
  createdAt: string;
}
