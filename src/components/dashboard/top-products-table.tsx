"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TopProduct } from "@/store/selectors";
import { formatIDR, formatNumber } from "@/lib/format";

// Daftar produk terlaris: peringkat + nama sebagai label langsung,
// bar satu-hue sebagai penguat magnitude (bukan pembawa identitas).
export function TopProductsTable({ products }: { products: TopProduct[] }) {
  if (products.length === 0) return null;
  const maxQty = products[0].qty;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 text-center">#</TableHead>
          <TableHead>Produk</TableHead>
          <TableHead className="w-40">Qty Terjual</TableHead>
          <TableHead className="w-40 text-right">Pendapatan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.slice(0, 8).map((p, idx) => (
          <TableRow key={p.productId}>
            <TableCell className="text-center font-medium text-muted-foreground">
              {idx + 1}
            </TableCell>
            <TableCell>
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.sku}</div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.max(4, (p.qty / maxQty) * 100)}%` }}
                  />
                </div>
                <span className="w-12 text-right font-medium tabular-nums">
                  {formatNumber(p.qty)}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">
              {formatIDR(p.revenue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
