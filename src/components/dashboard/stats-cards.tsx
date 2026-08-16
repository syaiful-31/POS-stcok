"use client";

import { ArrowDownRight, ArrowUpRight, Wallet, ReceiptText, TrendingUp, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface StatCardsProps {
  revenue: number;
  txCount: number;
  avgTicket: number;
  lowStock: number;
  /** delta pendapatan vs periode sebelumnya (null = tidak ditampilkan) */
  delta?: { value: number; pct: number } | null;
}

// Kartu KPI — angka utama tanpa grafik (hero number). Delta memakai
// warna status + ikon + label (tidak pernah warna saja).
export function StatCards({ revenue, txCount, avgTicket, lowStock, delta }: StatCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pendapatan
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatIDR(revenue)}</div>
          {delta ? (
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-medium",
                delta.value >= 0 ? "text-[#006300]" : "text-[#d03b3b]"
              )}
            >
              {delta.value >= 0 ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              vs kemarin {delta.pct >= 0 ? "+" : ""}
              {delta.pct.toLocaleString("id-ID")}%
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">dalam periode terpilih</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Transaksi
          </CardTitle>
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {txCount.toLocaleString("id-ID")}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            pesanan selesai (tidak termasuk batal)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Rata-rata per Transaksi
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatIDR(avgTicket)}</div>
          <p className="mt-1 text-xs text-muted-foreground">nilai rata-rata pesanan</p>
        </CardContent>
      </Card>

      <Link href="/inventory">
        <Card className="transition-colors hover:border-amber-400">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stok Menipis
            </CardTitle>
            <TriangleAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", lowStock > 0 && "text-amber-600")}>
              {lowStock.toLocaleString("id-ID")}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              produk ≤ stok minimum — klik untuk lihat
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
