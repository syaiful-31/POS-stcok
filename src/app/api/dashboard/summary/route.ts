import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { ok, requireRole, isGuardError } from "@/lib/api";

// GET /api/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD (admin)
// Ringkasan rekap penjualan: pendapatan, jumlah transaksi, rata-rata,
// deret harian, produk terlaris, dan jumlah stok menipis.
// Pesanan berstatus "batal" tidak dihitung.
export async function GET(req: NextRequest) {
  const guard = await requireRole(["admin"]);
  if (isGuardError(guard)) return guard.error;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const conditions = [eq(schema.orders.status, "selesai")];
  if (from) conditions.push(gte(schema.orders.orderDate, new Date(from).toISOString()));
  if (to) conditions.push(lte(schema.orders.orderDate, new Date(`${to}T23:59:59.999`).toISOString()));

  const orders = await db
    .select()
    .from(schema.orders)
    .where(and(...conditions))
    .all();
  const orderIds = orders.map((o) => o.id);
  const items = orderIds.length > 0
    ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, orderIds)).all()
    : [];

  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const avgTicket = orders.length > 0 ? Math.round(revenue / orders.length) : 0;

  const byDay = new Map<string, { date: string; revenue: number; txCount: number }>();
  for (const o of orders) {
    const key = o.orderDate.slice(0, 10);
    const row = byDay.get(key) ?? { date: key, revenue: 0, txCount: 0 };
    row.revenue += o.total;
    row.txCount += 1;
    byDay.set(key, row);
  }
  const daily = [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date));

  const top = new Map<string, { productId: string; name: string; sku: string; qty: number; revenue: number }>();
  for (const it of items) {
    const cur = top.get(it.productId) ?? { productId: it.productId, name: it.productName, sku: it.sku, qty: 0, revenue: 0 };
    cur.qty += it.quantity;
    cur.revenue += it.subtotal;
    top.set(it.productId, cur);
  }
  const topProducts = [...top.values()].sort((a, b) => b.qty - a.qty);

  const products = await db.select().from(schema.products).all();
  const lowStock = products.filter((p) => p.stockQty <= p.minStock).length;

  return ok({
    summary: {
      revenue,
      txCount: orders.length,
      avgTicket,
      daily,
      topProducts,
      lowStockCount: lowStock,
    },
  });
}
