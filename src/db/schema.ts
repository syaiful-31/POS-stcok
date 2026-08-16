// Skema domain (tabel bisnis) sesuai PRD §6. Tabel auth (user, session,
// account, verification) dihasilkan Better Auth di src/db/auth-schema.ts.
// Kolom memakai snake_case sesuai PRD; API memetakan ke camelCase.

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ---------- pelanggan ----------

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

// ---------- produk ----------

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  price: integer("price").notNull(), // harga jual (Rupiah)
  stockQty: integer("stock_qty").notNull().default(0),
  minStock: integer("min_stock").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

// ---------- supplier ----------

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  createdAt: text("created_at").notNull(),
});

// ---------- pesanan (kasir) ----------

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: text("customer_id"), // null = umum
  userId: text("user_id").notNull(), // kasir
  orderDate: text("order_date").notNull(),
  total: integer("total").notNull(),
  status: text("status", { enum: ["selesai", "batal"] }).notNull().default("selesai"),
  paymentMethod: text("payment_method", { enum: ["tunai", "transfer"] }).notNull(),
  paidAmount: integer("paid_amount").notNull(),
  changeAmount: integer("change_amount").notNull(),
});

export const orderItems = sqliteTable("order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  productId: text("product_id").notNull(),
  // snapshot nama/harga saat transaksi (riwayat tetap utuh)
  productName: text("product_name").notNull(),
  sku: text("sku").notNull(),
  unit: text("unit").notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
  subtotal: integer("subtotal").notNull(),
});

// ---------- pembelian (gudang) ----------

export const purchases = sqliteTable("purchases", {
  id: text("id").primaryKey(),
  purchaseNumber: text("purchase_number").notNull().unique(),
  supplierId: text("supplier_id").notNull(),
  supplierName: text("supplier_name").notNull(), // snapshot
  userId: text("user_id").notNull(),
  purchaseDate: text("purchase_date").notNull(),
  total: integer("total").notNull(),
  status: text("status", { enum: ["menunggu", "diterima"] }).notNull().default("menunggu"),
  note: text("note"),
  receivedAt: text("received_at"),
});

export const purchaseItems = sqliteTable("purchase_items", {
  id: text("id").primaryKey(),
  purchaseId: text("purchase_id").notNull().references(() => purchases.id),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  sku: text("sku").notNull(),
  unit: text("unit").notNull(),
  quantity: integer("quantity").notNull(),
  cost: integer("cost").notNull(), // harga beli unit
  subtotal: integer("subtotal").notNull(),
});

// ---------- audit pergerakan stok ----------

export const stockMovements = sqliteTable("stock_movements", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(), // snapshot
  type: text("type", { enum: ["penjualan", "pembelian", "penyesuaian"] }).notNull(),
  quantity: integer("quantity").notNull(), // bertanda: + masuk, - keluar
  referenceType: text("reference_type", { enum: ["order", "purchase", "adjustment"] }).notNull(),
  referenceId: text("reference_id"),
  note: text("note").notNull().default(""),
  userId: text("user_id").notNull(),
  createdAt: text("created_at").notNull(),
});
