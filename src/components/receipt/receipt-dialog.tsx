"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShopStore } from "@/store/use-shop-store";
import type { Order } from "@/store/types";
import { Receipt } from "./receipt";

// Dialog pratinjau struk + tombol cetak (window.print -> printer thermal
// atau "Save as PDF" dari dialog cetak browser). Kelas .print-root membuat
// hanya area struk yang tercetak (lihat @media print di globals.css).
export function ReceiptDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cashierName = order?.cashierName ?? "-";
  const shopInfo = useShopStore((s) => s.shopInfo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90mm]">
        <DialogHeader>
          <DialogTitle>Struk Pesanan</DialogTitle>
          <DialogDescription>
            Cetak ke printer thermal atau simpan sebagai PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-md bg-muted/40 p-4">
          {order ? (
            <div className="print-root">
              <Receipt
                order={order}
                cashierName={cashierName}
                shopInfo={shopInfo}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Cetak Struk / Simpan PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
