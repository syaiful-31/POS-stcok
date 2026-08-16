"use client";

import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AccessDenied } from "@/components/access-denied";
import { useCanAccess } from "@/components/auth-guard";
import { OrderDetailDialog, orderStatusBadge } from "@/components/orders/order-detail-dialog";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatIDR, formatRelativeDateTime } from "@/lib/format";

export default function OrdersPage() {
  const canAccess = useCanAccess("/orders");
  const orders = useStore((s) => s.orders);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"semua" | "selesai" | "batal">("semua");
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => (status === "semua" ? true : o.status === status))
      .filter((o) => {
        if (!q) return true;
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          (o.customerName ?? "umum").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, query, status]);

  if (!canAccess) return <AccessDenied />;

  return (
    <div>
      <PageHeader
        title="Riwayat Pesanan"
        description="Semua transaksi kasir — batalkan pesanan atau cetak ulang struk."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari no. pesanan / pelanggan…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-white pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => setStatus((v ?? "semua") as typeof status)}
        >
          <SelectTrigger className="w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Status</SelectItem>
            <SelectItem value="selesai">Selesai</SelectItem>
            <SelectItem value="batal">Batal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada pesanan"
          description="Coba ubah pencarian atau filter status."
        />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Order</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Pelanggan</TableHead>
                <TableHead>Kasir</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => {
                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">
                      {o.orderNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeDateTime(o.createdAt)}
                    </TableCell>
                    <TableCell>{o.customerName ?? "Umum"}</TableCell>
                    <TableCell>{o.cashierName ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {o.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatIDR(o.total)}
                    </TableCell>
                    <TableCell>{orderStatusBadge(o.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDetail(o);
                          setDetailOpen(true);
                        }}
                        aria-label={`Detail ${o.orderNumber}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <OrderDetailDialog
        order={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onPrint={(o) => {
          setReceiptOrder(o);
          setReceiptOpen(true);
        }}
      />

      <ReceiptDialog
        order={receiptOrder}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </div>
  );
}
