"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, MapPin, Phone } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/components/access-denied";
import { useCanAccess } from "@/components/auth-guard";
import { OrderDetailDialog, orderStatusBadge } from "@/components/orders/order-detail-dialog";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { customerStats } from "@/store/selectors";
import { formatIDR, formatDate, formatRelativeDateTime } from "@/lib/format";

export default function CustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const canAccess = useCanAccess("/customers");
  const state = useStore();

  const customer = state.customers.find((c) => c.id === params.customerId);
  const [detail, setDetail] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const stats = useMemo(
    () => (customer ? customerStats(state, customer.id) : null),
    [state, customer]
  );
  const history = useMemo(
    () =>
      customer
        ? state.orders
            .filter((o) => o.customerId === customer.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [state, customer]
  );

  if (!canAccess) return <AccessDenied />;

  if (!customer) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Pelanggan tidak ditemukan.</p>
        <Link
          href="/customers"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Daftar Pelanggan
        </Link>
      </div>
    );
  }

  const initials = customer.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      <Link
        href="/customers"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-4 -ml-2" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Daftar Pelanggan
      </Link>

      <PageHeader title={customer.name} description={customer.phone || "-"} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Belanja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatIDR(stats?.totalSpent ?? 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jumlah Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.orderCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Terakhir Belanja
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.lastOrderAt
                ? formatDate(stats.lastOrderAt)
                : "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Kontak & Alamat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {customer.phone || "-"}
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                {customer.address || "-"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Pesanan</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-muted text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              Belum ada pesanan untuk pelanggan ini.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Order</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRelativeDateTime(o.createdAt)}
                    </TableCell>
                    <TableCell className="capitalize">
                      {o.paymentMethod}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
