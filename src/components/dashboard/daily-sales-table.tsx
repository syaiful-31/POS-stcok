"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DailyRow } from "@/store/selectors";
import { formatIDR, formatDate } from "@/lib/format";

export function DailySalesTable({ daily }: { daily: DailyRow[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tanggal</TableHead>
          <TableHead className="w-32 text-right">Transaksi</TableHead>
          <TableHead className="w-44 text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {daily.map((row) => (
          <TableRow key={row.date}>
            <TableCell className="font-medium">
              {formatDate(`${row.date}T00:00:00`)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.txCount}
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatIDR(row.revenue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
