"use client";

import { useState } from "react";
import { Printer, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/store/use-store";
import type { Order } from "@/store/types";
import { formatIDR, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function orderStatusBadge(status: Order["status"]) {
  return status === "selesai" ? (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
      Selesai
    </Badge>
  ) : (
    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Batal</Badge>
  );
}

// Detail pesanan: daftar item, ringkasan pembayaran, cetak ulang struk,
// dan pembatalan (dengan konfirmasi — stok dikembalikan oleh store).
export function OrderDetailDialog({
  order,
  open,
  onOpenChange,
  onPrint,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: (order: Order) => void;
}) {
  const cancelOrder = useStore((s) => s.cancelOrder);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!order) return null;

  const kasir = order.cashierName ?? "-";

  const handleCancel = async () => {
    const result = await cancelOrder(order.id);
    setConfirmOpen(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Pesanan ${order.orderNumber} dibatalkan — stok dikembalikan.`
    );
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {order.orderNumber}
              {orderStatusBadge(order.status)}
            </DialogTitle>
            <DialogDescription>
              {formatDateTime(order.createdAt)} · Kasir: {kasir}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Pelanggan: </span>
                <span className="font-medium">
                  {order.customerName ?? "Umum"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Metode: </span>
                <span className="font-medium capitalize">
                  {order.paymentMethod}
                </span>
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="w-20 text-right">Qty</TableHead>
                    <TableHead className="w-32 text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((it, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <div className="font-medium">{it.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {it.sku} · {formatIDR(it.price)} / {it.unit}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {it.qty}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatIDR(it.subtotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{formatIDR(order.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {order.paymentMethod === "tunai" ? "Dibayar (Tunai)" : "Dibayar (Transfer)"}
                </span>
                <span>{formatIDR(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kembalian</span>
                <span>{formatIDR(order.changeAmount)}</span>
              </div>
            </div>

            {order.status === "batal" ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                Pesanan ini dibatalkan — stok sudah dikembalikan ke inventaris.
              </p>
            ) : null}
          </div>

          <Separator />

          <DialogFooter className="sm:justify-between">
            <Button
              variant={order.status === "selesai" ? "destructive" : "outline"}
              disabled={order.status === "batal"}
              onClick={() => setConfirmOpen(true)}
              className={cn(order.status === "batal" && "opacity-50")}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Batalkan Pesanan
            </Button>
            <Button variant="outline" onClick={() => onPrint(order)}>
              <Printer className="mr-2 h-4 w-4" />
              Cetak Ulang Struk
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan pesanan {order.orderNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              Status pesanan akan menjadi <strong>Batal</strong> dan stok semua
              item akan otomatis dikembalikan ke inventaris. Tindakan ini tidak
              dapat diurungkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tidak, Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleCancel()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
