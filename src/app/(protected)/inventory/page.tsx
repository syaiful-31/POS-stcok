"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { History, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AccessDenied } from "@/components/access-denied";
import { useCanAccess } from "@/components/auth-guard";
import { ProductFormDialog } from "@/components/inventory/product-form-dialog";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { StockBadge } from "@/components/inventory/stock-badge";
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
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/store/use-store";
import type { Product } from "@/store/types";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  const canAccess = useCanAccess("/inventory");
  const state = useStore();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.products
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
      )
      .sort((a, b) => a.sku.localeCompare(b.sku));
  }, [state.products, query]);

  if (!canAccess) return <AccessDenied />;

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await state.deleteProduct(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success(`Produk "${deleting.name}" dihapus.`);
    }
    setDeleting(null);
  };

  return (
    <div>
      <PageHeader
        title="Stok"
        description="Inventaris produk, peringatan stok minimum, dan penyesuaian (opname)."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Produk
        </Button>
      </PageHeader>

      <div className="relative mb-4 w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama / SKU…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-white pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak ada produk"
          description="Tambahkan produk pertama Anda untuk mulai mencatat stok."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Produk
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Min. Stok</TableHead>
                <TableHead className="text-right">Harga Jual</TableHead>
                <TableHead className="w-32 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const low = p.stockQty <= p.minStock;
                return (
                  <TableRow key={p.id} className={cn(low && "bg-amber-50/50")}>
                    <TableCell className="font-mono text-xs font-medium">
                      {p.sku}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/inventory/${p.id}`}
                        className="font-medium hover:text-emerald-700 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.unit}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold tabular-nums",
                        p.stockQty === 0
                          ? "text-red-600"
                          : low
                            ? "text-amber-600"
                            : ""
                      )}
                    >
                      {p.stockQty}
                    </TableCell>
                    <TableCell>
                      <StockBadge product={p} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {p.minStock}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatIDR(p.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Penyesuaian stok"
                          onClick={() => {
                            setAdjusting(p);
                            setAdjustOpen(true);
                          }}
                          aria-label={`Penyesuaian ${p.name}`}
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                        <Link
                          href={`/inventory/${p.id}`}
                          aria-label={`Riwayat ${p.name}`}
                          className={buttonVariants({ variant: "ghost", size: "icon" })}
                        >
                          <History className="h-4 w-4" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${p.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(p)}
                          aria-label={`Hapus ${p.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
      />

      <AdjustStockDialog
        product={adjusting}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus produk &ldquo;{deleting?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk dengan riwayat transaksi tidak dapat dihapus. Tindakan ini
              tidak dapat diurungkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
