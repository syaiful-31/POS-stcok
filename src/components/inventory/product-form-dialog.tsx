"use client";

import { useState } from "react";
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
import { useStore } from "@/store/use-store";
import type { Product } from "@/store/types";

// Tambah/edit produk. Pada produk baru, stok awal dicatat sebagai
// pergerakan "penyesuaian" agar log audit tetap lengkap.
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  const addProduct = useStore((s) => s.addProduct);
  const updateProduct = useStore((s) => s.updateProduct);

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [minStock, setMinStock] = useState("");
  const [stockQty, setStockQty] = useState("");

  // reset field saat dialog dibuka (pola reset-state-di-render)
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setSku(product?.sku ?? "");
      setName(product?.name ?? "");
      setUnit(product?.unit ?? "");
      setPrice(product ? String(product.price) : "");
      setMinStock(product ? String(product.minStock) : "");
      setStockQty(product ? String(product.stockQty) : "");
    }
  }

  const parsedPrice = Number(price);
  const parsedMin = Math.floor(Number(minStock));
  const parsedStock = Math.floor(Number(stockQty));
  const valid =
    sku.trim() &&
    name.trim() &&
    unit.trim() &&
    Number.isFinite(parsedPrice) &&
    parsedPrice > 0 &&
    Number.isFinite(parsedMin) &&
    parsedMin >= 0 &&
    Number.isFinite(parsedStock) &&
    parsedStock >= 0;

  const submit = async () => {
    if (!valid) {
      toast.error("Lengkapi semua kolom dengan angka yang valid.");
      return;
    }
    if (product) {
      const result = await updateProduct(product.id, {
        sku: sku.trim(),
        name: name.trim(),
        unit: unit.trim(),
        price: parsedPrice,
        minStock: parsedMin,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Produk "${name.trim()}" diperbarui.`);
    } else {
      const result = await addProduct({
        sku: sku.trim(),
        name: name.trim(),
        unit: unit.trim(),
        price: parsedPrice,
        minStock: parsedMin,
        stockQty: parsedStock,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Produk "${name.trim()}" ditambahkan.`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Perbarui informasi produk. Stok diubah lewat menu Penyesuaian."
              : "Produk baru langsung tersedia di kasir dan pembelian."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prod-sku">SKU *</Label>
            <Input
              id="prod-sku"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="FMCG-011"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-unit">Satuan *</Label>
            <Input
              id="prod-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="dus / karton / pcs"
            />
          </div>
          <div className="col-span-2 space-y-2">
            <Label htmlFor="prod-name">Nama Produk *</Label>
            <Input
              id="prod-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Indomie Goreng Original (Dus 40)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-price">Harga Jual (Rp) *</Label>
            <Input
              id="prod-price"
              type="number"
              inputMode="numeric"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="112000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-min">Stok Minimum *</Label>
            <Input
              id="prod-min"
              type="number"
              inputMode="numeric"
              min={0}
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="50"
            />
          </div>
          {!product ? (
            <div className="col-span-2 space-y-2">
              <Label htmlFor="prod-stock">Stok Awal</Label>
              <Input
                id="prod-stock"
                type="number"
                inputMode="numeric"
                min={0}
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="0"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void submit()} disabled={!valid}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
