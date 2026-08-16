// Fungsi turunan (selector) murni — agregasi data untuk halaman-halaman UI.

import type { AppState } from "./use-store";
import type { Role, StockMovement } from "./types";
import { ROLE_ROUTES } from "@/lib/constants";

type Range = { from?: string; to?: string };

function inRange(iso: string, range: Range): boolean {
  const t = new Date(iso).getTime();
  if (range.from && t < new Date(range.from).getTime()) return false;
  if (range.to && t > endOfDay(range.to).getTime()) return false;
  return true;
}

function endOfDay(iso: string): Date {
  const d = new Date(iso);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfDayISO(d: Date): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

// ---------- auth ----------

export function hasAccess(role: Role, path: string): boolean {
  return ROLE_ROUTES[role].some(
    (allowed) => allowed === path || path.startsWith(`${allowed}/`)
  );
}

// ---------- pelanggan ----------

export function customerStats(
  state: AppState,
  customerId: string
): { totalSpent: number; orderCount: number; lastOrderAt: string | null } {
  const done = state.orders.filter(
    (o) => o.customerId === customerId && o.status === "selesai"
  );
  return {
    totalSpent: done.reduce((sum, o) => sum + o.total, 0),
    orderCount: done.length,
    lastOrderAt:
      done.length > 0
        ? done.reduce((max, o) => (o.createdAt > max ? o.createdAt : max), done[0].createdAt)
        : null,
  };
}

// ---------- stok ----------

export function productMovements(
  state: AppState,
  productId: string
): StockMovement[] {
  return state.movements
    .filter((m) => m.productId === productId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function lowStockCount(state: AppState): number {
  return state.products.filter((p) => p.stockQty <= p.minStock).length;
}

// ---------- rekap penjualan ----------

export interface DailyRow {
  date: string;
  revenue: number;
  txCount: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  revenue: number;
}

export function dashboardSummary(
  state: AppState,
  range: Range
): { revenue: number; txCount: number; avgTicket: number; daily: DailyRow[]; topProducts: TopProduct[] } {
  const done = state.orders.filter(
    (o) => o.status === "selesai" && inRange(o.createdAt, range)
  );

  const byDay = new Map<string, DailyRow>();
  done.forEach((o) => {
    const key = o.createdAt.slice(0, 10);
    const row = byDay.get(key) ?? { date: key, revenue: 0, txCount: 0 };
    row.revenue += o.total;
    row.txCount += 1;
    byDay.set(key, row);
  });
  const daily = [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date));

  const top = new Map<string, TopProduct>();
  done.forEach((o) => {
    o.items.forEach((it) => {
      const cur = top.get(it.productId) ?? {
        productId: it.productId,
        name: it.productName,
        sku: it.sku,
        qty: 0,
        revenue: 0,
      };
      cur.qty += it.qty;
      cur.revenue += it.subtotal;
      top.set(it.productId, cur);
    });
  });
  const topProducts = [...top.values()].sort((a, b) => b.qty - a.qty);

  const revenue = done.reduce((sum, o) => sum + o.total, 0);
  return {
    revenue,
    txCount: done.length,
    avgTicket: done.length > 0 ? Math.round(revenue / done.length) : 0,
    daily,
    topProducts,
  };
}

