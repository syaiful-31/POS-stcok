"use client";

import { useMemo, useState } from "react";
import { Eye, PackageCheck, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AccessDenied } from "@/components/access-denied";
import { useCanAccess } from "@/components/auth-guard";
import { PurchaseFormDialog } from "@/components/purchases/purchase-form-dialog";
import {
  PurchaseDetailDialog,
  purchaseStatusBadge,
} from "@/components/purchases/purchase-detail-dialog";
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
import type { Purchase } from "@/store/types";
import { formatIDR, formatRelativeDateTime } from "@/lib/format";

export default function PurchasesPage() {
  const canAccess = useCanAccess("/purchases");
  const state = useStore();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"semua" | "menunggu" | "diterima">("semua");
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiving, setReceiving] = useState<Purchase | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.purchases
      .filter((p) => (status === "semua" ? true : p.status === status))
      .filter(
        (p) =>
          !q ||
          p.purchaseNumber.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q)
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.purchases, query, status]);

  if (!canAccess) return <AccessDenied />;

  const openReceive = (purchase: Purchase) => {
    setReceiving(purchase);
    setConfirmOpen(true);
  };

  const confirmReceive = async () => {
    if (!receiving) return;
    const result = await state.receivePurchase(receiving.id);
    setConfirmOpen(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Barang ${receiving.purchaseNumber} diterima — stok bertambah.`
    );
    setDetail(result.purchase);
    setDetailOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Pembelian"
        description="Dokumen belanja stok dari supplier — terima barang untuk menambah stok."
      >
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Buat Pembelian
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari no. pembelian / supplier…"
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
            <SelectItem value="menunggu">Menunggu</SelectItem>
            <SelectItem value="diterima">Diterima</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Belum ada pembelian"
          description="Buat dokumen pembelian pertama Anda."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Buat Pembelian
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Pembelian</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Item</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.purchaseNumber}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatRelativeDateTime(p.createdAt)}
                  </TableCell>
                  <TableCell>{p.supplierName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.items.reduce((s, it) => s + it.qty, 0)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatIDR(p.total)}
                  </TableCell>
                  <TableCell>{purchaseStatusBadge(p.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.status === "menunggu" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Terima Barang"
                          onClick={() => openReceive(p)}
                          aria-label={`Terima ${p.purchaseNumber}`}
                        >
                          <PackageCheck className="h-4 w-4 text-emerald-600" />
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDetail(p);
                          setDetailOpen(true);
                        }}
                        aria-label={`Detail ${p.purchaseNumber}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PurchaseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(p) => {
          setDetail(p);
          setDetailOpen(true);
        }}
      />

      <PurchaseDetailDialog
        purchase={detail}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onReceive={openReceive}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="data-[size=default]:sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Terima barang dari {receiving?.supplierName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {receiving
                ? `Stok produk berikut akan bertambah otomatis sesuai dokumen ${receiving.purchaseNumber}:`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {receiving ? (
            <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border bg-muted/40 p-3 text-sm">
              {receiving.items.map((it, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {it.productName}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {it.qty} {it.unit}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmReceive()}>
              Ya, Terima Barang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
