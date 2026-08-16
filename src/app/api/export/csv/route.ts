import { and, gte, inArray, lte } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import * as authSchema from "@/db/auth-schema";
import { requireRole, isGuardError } from "@/lib/api";
import { csvEscape } from "@/lib/csv";

// GET /api/export/csv?from=YYYY-MM-DD&to=YYYY-MM-DD (admin)
// CSV multi-section (PRD Fase 4): penjualan + stok + pembelian dalam satu
// file, dengan BOM & CRLF agar rapi di Excel Windows.
export async function GET(req: NextRequest) {
  const guard = await requireRole(["admin"]);
  if (isGuardError(guard)) return guard.error;

  const from = req.nextUrl.searchParams.get("from") ?? undefined;
  const to = req.nextUrl.searchParams.get("to") ?? undefined;
  const rangeLabel = `${from ? `dari ${from}` : "semua data"}${to ? ` s/d ${to}` : ""}`;

  // ---------- penjualan ----------
  const orderCond = [];
  if (from) orderCond.push(gte(schema.orders.orderDate, new Date(from).toISOString()));
  if (to) orderCond.push(lte(schema.orders.orderDate, new Date(`${to}T23:59:59.999`).toISOString()));
  const orders = await db
    .select()
    .from(schema.orders)
    .where(orderCond.length > 0 ? and(...orderCond) : undefined)
    .orderBy(schema.orders.orderDate)
    .all();
  const orderIds = orders.map((o) => o.id);

  const users = await db.select().from(authSchema.user).all();
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const customers = await db
    .select({ id: schema.customers.id, name: schema.customers.name })
    .from(schema.customers)
    .where(inArray(schema.customers.id, orders.map((o) => o.customerId).filter((c): c is string => c !== null)))
    .all();
  const customerName = new Map(customers.map((c) => [c.id, c.name]));

  const orderItems = orderIds.length > 0
    ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, orderIds)).all()
    : [];
  const orderItemsById = new Map<string, (typeof schema.orderItems.$inferSelect)[]>();
  for (const it of orderItems) {
    const list = orderItemsById.get(it.orderId) ?? [];
    list.push(it);
    orderItemsById.set(it.orderId, list);
  }

  const sales = [
    `LAPORAN PENJUALAN (${rangeLabel})`,
    "Tanggal,No. Order,Pelanggan,Kasir,Metode,Produk,Qty,Satuan,Harga,Subtotal,Total,Status",
  ];
  for (const o of orders) {
    for (const it of orderItemsById.get(o.id) ?? []) {
      sales.push(
        [
          o.orderDate,
          o.orderNumber,
          o.customerId ? (customerName.get(o.customerId) ?? "—") : "Umum",
          userName.get(o.userId) ?? "-",
          o.paymentMethod,
          it.productName,
          it.quantity,
          it.unit,
          it.price,
          it.subtotal,
          o.total,
          o.status,
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }

  // ---------- stok (snapshot) ----------
  const products = await db.select().from(schema.products).orderBy(schema.products.sku).all();
  const stock = ["LAPORAN STOK", "SKU,Produk,Satuan,Stok,Min. Stok,Harga Jual"];
  for (const p of products) {
    stock.push([p.sku, p.name, p.unit, p.stockQty, p.minStock, p.price].map(csvEscape).join(","));
  }

  // ---------- pembelian ----------
  const purchaseCond = [];
  if (from) purchaseCond.push(gte(schema.purchases.purchaseDate, new Date(from).toISOString()));
  if (to) purchaseCond.push(lte(schema.purchases.purchaseDate, new Date(`${to}T23:59:59.999`).toISOString()));
  const purchases = await db
    .select()
    .from(schema.purchases)
    .where(purchaseCond.length > 0 ? and(...purchaseCond) : undefined)
    .orderBy(schema.purchases.purchaseDate)
    .all();
  const purchaseIds = purchases.map((p) => p.id);
  const purchaseItems = purchaseIds.length > 0
    ? await db.select().from(schema.purchaseItems).where(inArray(schema.purchaseItems.purchaseId, purchaseIds)).all()
    : [];
  const purchaseItemsByPurchase = new Map<string, (typeof schema.purchaseItems.$inferSelect)[]>();
  for (const it of purchaseItems) {
    const list = purchaseItemsByPurchase.get(it.purchaseId) ?? [];
    list.push(it);
    purchaseItemsByPurchase.set(it.purchaseId, list);
  }

  const purchasesCsv = [
    `LAPORAN PEMBELIAN (${rangeLabel})`,
    "Tanggal,No. Pembelian,Supplier,Produk,Qty,Satuan,Harga Beli,Subtotal,Total,Status",
  ];
  for (const p of purchases) {
    for (const it of purchaseItemsByPurchase.get(p.id) ?? []) {
      purchasesCsv.push(
        [
          p.purchaseDate,
          p.purchaseNumber,
          p.supplierName,
          it.productName,
          it.quantity,
          it.unit,
          it.cost,
          it.subtotal,
          p.total,
          p.status,
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }

  const csv = `﻿${[sales.join("\r\n"), stock.join("\r\n"), purchasesCsv.join("\r\n")].join("\r\n\r\n")}\r\n`;
  const stamp = `${from ?? "semua"}${to ? `-${to}` : ""}`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${stamp}.csv"`,
    },
  });
}
