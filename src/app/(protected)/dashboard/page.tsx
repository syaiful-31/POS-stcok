"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AccessDenied } from "@/components/access-denied";
import { useCanAccess } from "@/components/auth-guard";
import { StatCards } from "@/components/dashboard/stats-cards";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import { DailySalesTable } from "@/components/dashboard/daily-sales-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/use-store";
import { dashboardSummary, lowStockCount, startOfDayISO } from "@/store/selectors";

type Preset = "hari-ini" | "7-hari" | "30-hari" | "semua" | "kustom";

const PRESETS: { key: Preset; label: string }[] = [
  { key: "hari-ini", label: "Hari Ini" },
  { key: "7-hari", label: "7 Hari" },
  { key: "30-hari", label: "30 Hari" },
  { key: "semua", label: "Semua" },
];

function rangeForPreset(preset: Preset, from: string, to: string) {
  const today = startOfDayISO(new Date());
  const daysAgoISO = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return startOfDayISO(d);
  };
  switch (preset) {
    case "hari-ini":
      return { from: today, to: today };
    case "7-hari":
      return { from: daysAgoISO(6), to: today };
    case "30-hari":
      return { from: daysAgoISO(29), to: today };
    case "semua":
      return { from: undefined, to: undefined };
    case "kustom":
      return { from: from || undefined, to: to || undefined };
  }
}

export default function DashboardPage() {
  const canAccess = useCanAccess("/dashboard");
  const state = useStore();
  const [preset, setPreset] = useState<Preset>("hari-ini");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const range = useMemo(() => rangeForPreset(preset, from, to), [preset, from, to]);
  const summary = useMemo(() => dashboardSummary(state, range), [state, range]);
  const lowStock = useMemo(() => lowStockCount(state), [state]);

  // delta vs kemarin hanya saat melihat "Hari Ini"
  const delta = useMemo(() => {
    if (preset !== "hari-ini") return null;
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = startOfDayISO(d);
    const prev = dashboardSummary(state, { from: yesterday, to: yesterday });
    if (prev.revenue === 0) return null;
    const diff = summary.revenue - prev.revenue;
    return { value: diff, pct: Math.round((diff / prev.revenue) * 100) };
  }, [preset, summary.revenue, state]);

  if (!canAccess) return <AccessDenied />;

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (range.from) params.set("from", range.from.slice(0, 10));
      if (range.to) params.set("to", range.to.slice(0, 10));
      const res = await fetch(`/api/export/csv?${params.toString()}`);
      if (!res.ok) {
        toast.error("Gagal mengunduh laporan CSV.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = `${range.from?.slice(0, 10) ?? "semua"}${range.to ? `-${range.to.slice(0, 10)}` : ""}`;
      a.href = url;
      a.download = `laporan-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Laporan CSV diunduh.");
    } catch {
      toast.error("Gagal mengunduh laporan CSV.");
    }
  };

  const hasData = summary.txCount > 0;

  return (
    <div>
      <PageHeader
        title="Rekap Penjualan"
        description="Pendapatan, volume transaksi, dan produk terlaris."
      >
        <Button variant="outline" onClick={() => void handleExport()}>
          <Download className="mr-2 h-4 w-4" />
          Ekspor CSV
        </Button>
      </PageHeader>

      {/* Filter periode — satu baris di atas konten */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border bg-white p-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                preset === p.key
                  ? "bg-emerald-600 text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "kustom" ? (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-auto"
            />
            <span className="text-sm text-muted-foreground">s/d</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-auto"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPreset("kustom")}
            className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline"
          >
            Rentang tanggal lain…
          </button>
        )}
      </div>

      <div className="space-y-6">
        <StatCards
          revenue={summary.revenue}
          txCount={summary.txCount}
          avgTicket={summary.avgTicket}
          lowStock={lowStock}
          delta={delta}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Penjualan Harian</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.daily.length > 0 ? (
                <DailySalesTable daily={summary.daily} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada penjualan pada periode ini.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Produk Terlaris</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.topProducts.length > 0 ? (
                <TopProductsTable products={summary.topProducts} />
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada penjualan pada periode ini.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {!hasData ? (
          <EmptyState
            title="Tidak ada data pada periode ini"
            description="Coba rentang tanggal lain atau buat pesanan baru di menu Kasir."
          />
        ) : null}
      </div>
    </div>
  );
}
