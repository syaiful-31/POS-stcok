"use client";

import { useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/store/use-store";
import type { MovementType } from "@/store/types";
import { formatNumber, formatRelativeDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<MovementType, string> = {
  penjualan: "Penjualan",
  pembelian: "Pembelian",
  penyesuaian: "Penyesuaian",
};

const TYPE_BADGE: Record<MovementType, string> = {
  penjualan: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  pembelian: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
  penyesuaian: "bg-amber-100 text-amber-700 hover:bg-amber-100",
};

// Log audit pergerakan stok per produk: kapan, siapa, kenapa.
// Data dimuat dari backend saat komponen dipasang (cache di store).
// PENTING: subscribe ke referensi array yang stabil lalu turunkan dengan
// useMemo — selector yang membuat array baru tiap snapshot memicu render
// tak berujung (zustand v5 + useSyncExternalStore).
export function StockMovementsTable({
  productId,
  limit,
}: {
  productId: string;
  limit?: number;
}) {
  const allMovements = useStore((s) => s.movements);
  const loadMovements = useStore((s) => s.loadMovements);

  useEffect(() => {
    void loadMovements(productId);
  }, [loadMovements, productId]);

  const rows = useMemo(() => {
    const filtered = allMovements
      .filter((m) => m.productId === productId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return limit ? filtered.slice(0, limit) : filtered;
  }, [allMovements, productId, limit]);

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Belum ada pergerakan stok untuk produk ini.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Waktu</TableHead>
          <TableHead>Tipe</TableHead>
          <TableHead className="text-right">Perubahan</TableHead>
          <TableHead>Pelaksana</TableHead>
          <TableHead>Catatan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((m) => {
          return (
            <TableRow key={m.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatRelativeDateTime(m.createdAt)}
              </TableCell>
              <TableCell>
                <Badge className={cn(TYPE_BADGE[m.type])}>
                  {TYPE_LABEL[m.type]}
                </Badge>
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-semibold tabular-nums",
                  m.quantity > 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {m.quantity > 0 ? "+" : ""}
                {formatNumber(m.quantity)}
              </TableCell>
              <TableCell>{m.userName ?? "-"}</TableCell>
              <TableCell className="max-w-64 truncate text-muted-foreground">
                {m.note}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
