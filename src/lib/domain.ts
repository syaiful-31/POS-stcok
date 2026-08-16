// Pemetaan baris DB (snake_case) -> JSON API (camelCase) dan generator
// nomor dokumen. Bentuk JSON sengaja sama dengan tipe frontend di
// src/store/types.ts agar wiring frontend ke backend tinggal pasang.

import { like, sql } from "drizzle-orm";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import * as authSchema from "@/db/auth-schema";

// tipe transaksi better-sqlite3 yang diturunkan dari client
export type DBTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const toProduct = (r: typeof schema.products.$inferSelect) => ({
  id: r.id,
  sku: r.sku,
  name: r.name,
  unit: r.unit,
  price: r.price,
  stockQty: r.stockQty,
  minStock: r.minStock,
  createdAt: r.createdAt,
});

export const toCustomer = (r: typeof schema.customers.$inferSelect) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  address: r.address,
  createdAt: r.createdAt,
});

export const toSupplier = (r: typeof schema.suppliers.$inferSelect) => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  address: r.address,
  createdAt: r.createdAt,
});

export const toOrder = (
  r: typeof schema.orders.$inferSelect,
  items: (typeof schema.orderItems.$inferSelect)[],
  userNames: Map<string, string>
) => ({
  id: r.id,
  orderNumber: r.orderNumber,
  customerId: r.customerId,
  customerName: null as string | null,
  createdBy: r.userId,
  cashierName: userNames.get(r.userId) ?? null,
  items: items.map((it) => ({
    productId: it.productId,
    productName: it.productName,
    sku: it.sku,
    unit: it.unit,
    price: it.price,
    qty: it.quantity,
    subtotal: it.subtotal,
  })),
  total: r.total,
  status: r.status,
  paymentMethod: r.paymentMethod,
  paidAmount: r.paidAmount,
  changeAmount: r.changeAmount,
  createdAt: r.orderDate,
});

export const toPurchase = (
  r: typeof schema.purchases.$inferSelect,
  items: (typeof schema.purchaseItems.$inferSelect)[],
  userName?: string | null
) => ({
  id: r.id,
  purchaseNumber: r.purchaseNumber,
  supplierId: r.supplierId,
  supplierName: r.supplierName,
  createdBy: r.userId,
  userName: userName ?? null,
  items: items.map((it) => ({
    productId: it.productId,
    productName: it.productName,
    sku: it.sku,
    unit: it.unit,
    qty: it.quantity,
    cost: it.cost,
    subtotal: it.subtotal,
  })),
  total: r.total,
  status: r.status,
  note: r.note,
  createdAt: r.purchaseDate,
  receivedAt: r.receivedAt,
});

export const toMovement = (
  r: typeof schema.stockMovements.$inferSelect,
  userName?: string | null
) => ({
  id: r.id,
  productId: r.productId,
  productName: r.productName,
  type: r.type,
  quantity: r.quantity,
  referenceType: r.referenceType,
  referenceId: r.referenceId,
  note: r.note,
  createdBy: r.userId,
  userName: userName ?? null,
  createdAt: r.createdAt,
});

export const toUser = (r: typeof authSchema.user.$inferSelect) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
});

// yyyymmdd dari tanggal LOKAL — sumber tunggal untuk nomor dokumen.
// (Jangan pakai toISOString/UTC di sini: nomor seed & nextDocSeq memakai
// tanggal lokal, beda hari di sekitar tengah malam WIB.)
export function localYyyymmdd(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

// Nomor dokumen berikutnya untuk tanggal tertentu (di dalam transaksi).
export function nextDocSeq(
  tx: DBTx,
  table: typeof schema.orders | typeof schema.purchases,
  prefix: string,
  date = new Date()
): number {
  const pattern = `${prefix}-${localYyyymmdd(date)}-%`;
  const column =
    table === schema.orders ? schema.orders.orderNumber : schema.purchases.purchaseNumber;
  const rows = tx
    .select({ n: sql<number>`count(*)` })
    .from(table)
    .where(like(column, pattern))
    .all();
  return Number(rows[0]?.n ?? 0) + 1;
}
