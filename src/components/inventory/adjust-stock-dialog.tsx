"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/use-store";
import type { Product } from "@/store/types";
import { formatNumber } from "@/lib/format";

// Penyesuaian stok (stock opname): petugas memasukkan angka stok fisik
// terbaru; sistem menghitung selisih dan mencatatnya sebagai "penyesuaian".
export function AdjustStockDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const adjustStock = useStore((s) => s.adjustStock);
  const [input, setInput] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // reset field saat dialog dibuka (pola reset-state-di-render)
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setInput("");
      setNote("");
    }
  }

  const newQty = input === "" ? null : Math.floor(Number(input));
  const diff = useMemo(() => {
    if (!product || newQty === null || !Number.isFinite(newQty) || newQty < 0)
      return null;
    return newQty - product.stockQty;
  }, [product, newQty]);

  if (!product) return null;

  const submit = async () => {
    if (newQty === null || !Number.isFinite(newQty) || newQty < 0) {
      toast.error("Masukkan angka stok fisik yang valid (≥ 0).");
      return;
    }
    setSubmitting(true);
    const result = await adjustStock({ productId: product.id, newQty, note });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.diff === 0
        ? "Stok tidak berubah."
        : `Stok disesuaikan (${result.diff > 0 ? "+" : ""}${result.diff} ${product.unit}).`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok</DialogTitle>
          <DialogDescription>
            {product.name} — stok sistem saat ini:{" "}
            <span className="font-semibold text-foreground">
              {product.stockQty} {product.unit}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adj-qty">Stok Fisik Terbaru</Label>
            <Input
              id="adj-qty"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={`mis. ${product.stockQty}`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Selisih</span>
            {diff === null ? (
              <span className="text-muted-foreground">—</span>
            ) : diff === 0 ? (
              <span className="font-medium">Tidak ada perubahan</span>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-1.5 font-bold tabular-nums",
                  diff > 0 ? "text-emerald-600" : "text-red-600"
                )}
              >
                {product.stockQty} <ArrowRight className="h-3.5 w-3.5" />{" "}
                {newQty} ({diff > 0 ? "+" : ""}
                {formatNumber(diff)} {product.unit})
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-note">Catatan (opsional)</Label>
            <Textarea
              id="adj-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. Hasil opname gudang, barang rusak, dll."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void submit()} disabled={diff === null || submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Simpan Penyesuaian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
