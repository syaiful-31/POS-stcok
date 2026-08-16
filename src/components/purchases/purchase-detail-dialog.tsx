"use client";

import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Purchase } from "@/store/types";
import { formatIDR, formatDateTime } from "@/lib/format";

export function purchaseStatusBadge(status: Purchase["status"]) {
  return status === "diterima" ? (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
      Diterima
    </Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
      Menunggu
    </Badge>
  );
}

// Detail pembelian + tombol "Terima Barang" (menambah stok otomatis).
export function PurchaseDetailDialog({
  purchase,
  open,
  onOpenChange,
  onReceive,
}: {
  purchase: Purchase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReceive: (purchase: Purchase) => void;
}) {
  if (!purchase) return null;

  const petugas = purchase.userName ?? "-";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {purchase.purchaseNumber}
            {purchaseStatusBadge(purchase.status)}
          </DialogTitle>
          <DialogDescription>
            Dibuat {formatDateTime(purchase.createdAt)} · Petugas: {petugas}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Supplier</span>
            <span className="font-medium">{purchase.supplierName}</span>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead className="w-20 text-right">Qty</TableHead>
                  <TableHead className="w-32 text-right">Harga Beli</TableHead>
                  <TableHead className="w-32 text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items.map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="font-medium">{it.productName}</div>
                      <div className="text-xs text-muted-foreground">{it.sku}</div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {it.qty} {it.unit}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatIDR(it.cost)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatIDR(it.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {purchase.note ? (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Catatan: {purchase.note}
            </p>
          ) : null}

          {purchase.status === "diterima" && purchase.receivedAt ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              Barang diterima {formatDateTime(purchase.receivedAt)} — stok
              sudah bertambah otomatis.
            </p>
          ) : (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Barang belum diterima. Stok akan bertambah saat tombol
              &ldquo;Terima Barang&rdquo; ditekan.
            </p>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Belanja</span>
            <span className="text-lg font-bold tabular-nums">
              {formatIDR(purchase.total)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          {purchase.status === "menunggu" ? (
            <Button onClick={() => onReceive(purchase)}>
              <PackageCheck className="mr-2 h-4 w-4" />
              Terima Barang
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
