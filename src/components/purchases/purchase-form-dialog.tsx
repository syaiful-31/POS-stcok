"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useStore } from "@/store/use-store";
import type { Purchase } from "@/store/types";
import { formatIDR } from "@/lib/format";

interface Row {
  productId: string;
  qty: string;
  cost: string;
}

const emptyRow = (): Row => ({ productId: "", qty: "", cost: "" });

// Buat dokumen pembelian: supplier + baris item dinamis (produk, qty, harga
// beli). Status awal "Menunggu" — stok belum berubah sampai "Terima Barang".
export function PurchaseFormDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (purchase: Purchase) => void;
}) {
  const suppliers = useStore((s) => s.suppliers);
  const products = useStore((s) => s.products);
  const createPurchase = useStore((s) => s.createPurchase);

  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // reset field saat dialog dibuka (pola reset-state-di-render)
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setSupplierId("");
      setRows([emptyRow()]);
      setNote("");
    }
  }

  const total = useMemo(
    () =>
      rows.reduce((sum, r) => {
        const qty = Number(r.qty);
        const cost = Number(r.cost);
        if (!Number.isFinite(qty) || !Number.isFinite(cost)) return sum;
        return sum + qty * cost;
      }, 0),
    [rows]
  );

  const validRows = useMemo(
    () =>
      rows.filter((r) => {
        const qty = Number(r.qty);
        const cost = Number(r.cost);
        return (
          r.productId &&
          Number.isFinite(qty) &&
          qty > 0 &&
          Number.isFinite(cost) &&
          cost > 0
        );
      }),
    [rows]
  );
  const canSubmit = supplierId !== "" && validRows.length > 0 && !submitting;

  const updateRow = (idx: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const setRowProduct = (idx: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    // default harga beli ≈ 80% harga jual, dibulatkan ke ratusan
    const defaultCost = product
      ? String(Math.round((product.price * 0.8) / 100) * 100)
      : "";
    updateRow(idx, { productId, cost: defaultCost });
  };

  const removeRow = (idx: number) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const result = await createPurchase({
      supplierId,
      items: validRows.map((r) => ({
        productId: r.productId,
        qty: Math.floor(Number(r.qty)),
        cost: Number(r.cost),
      })),
      note,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      `Pembelian ${result.purchase.purchaseNumber} dibuat — status Menunggu.`
    );
    onOpenChange(false);
    onCreated(result.purchase);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buat Pembelian</DialogTitle>
          <DialogDescription>
            Catat belanja stok ke supplier. Stok bertambah setelah tombol
            &ldquo;Terima Barang&rdquo; pada daftar pembelian.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Supplier *</Label>
            <Select
              value={supplierId}
              onValueChange={(v) => setSupplierId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Item Barang</Label>
            <div className="space-y-2">
              {rows.map((row, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Select
                      value={row.productId}
                      onValueChange={(v) => v && setRowProduct(idx, v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih produk" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="Qty"
                      value={row.qty}
                      onChange={(e) => updateRow(idx, { qty: e.target.value })}
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="Harga beli"
                      value={row.cost}
                      onChange={(e) => updateRow(idx, { cost: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mb-0.5 shrink-0"
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    aria-label="Hapus baris"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRows((prev) => [...prev, emptyRow()])}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Tambah Baris
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="po-note">Catatan (opsional)</Label>
            <Textarea
              id="po-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. PO via telepon, estimasi kirim 3 hari"
              rows={2}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Belanja</span>
            <span className="text-lg font-bold tabular-nums">
              {formatIDR(total)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Simpan Pembelian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
