"use client";

import { useMemo, useState } from "react";
import { Banknote, Landmark, Loader2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/format";
import { useStore, type CartLine } from "@/store/use-store";
import type { Order, PaymentMethod } from "@/store/types";

// Dialog pembayaran: pilih pelanggan, metode Tunai/Transfer,
// jumlah bayar + kembalian, lalu simpan pesanan (validasi stok atomik
// dilakukan store). Transfer otomatis lunas sebesar total.
export function PaymentDialog({
  open,
  onOpenChange,
  lines,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: CartLine[];
  onSuccess: (order: Order) => void;
}) {
  const customers = useStore((s) => s.customers);
  const products = useStore((s) => s.products);
  const createOrder = useStore((s) => s.createOrder);

  const [customerId, setCustomerId] = useState<string>("umum");
  const [method, setMethod] = useState<PaymentMethod>("tunai");
  const [paidInput, setPaidInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = products.find((p) => p.id === line.productId);
        return sum + (product ? product.price * line.qty : 0);
      }, 0),
    [lines, products]
  );

  const paidAmount = method === "transfer" ? total : Number(paidInput) || 0;
  const change = paidAmount - total;
  const canSubmit = lines.length > 0 && (method === "transfer" || change >= 0);

  const quickAmounts = useMemo(() => {
    const roundedUp = Math.ceil(total / 50000) * 50000;
    return [...new Set([total, roundedUp, roundedUp + 50000, roundedUp + 100000])].slice(0, 4);
  }, [total]);

  const reset = () => {
    setCustomerId("umum");
    setMethod("tunai");
    setPaidInput("");
  };

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const result = await createOrder({
      customerId: customerId === "umum" ? null : customerId,
      items: lines,
      paymentMethod: method,
      paidAmount,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Pesanan ${result.order.orderNumber} tersimpan.`);
    reset();
    onOpenChange(false);
    onSuccess(result.order);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !submitting) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
          <DialogDescription>
            Total belanja{" "}
            <span className="font-bold text-foreground">{formatIDR(total)}</span>{" "}
            ({lines.reduce((s, l) => s + l.qty, 0)} item)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Pelanggan</Label>
            <Select
              value={customerId}
              onValueChange={(v) => setCustomerId(v ?? "umum")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih pelanggan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="umum">Umum (Tanpa Pelanggan)</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod("tunai")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  method === "tunai"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "hover:bg-muted"
                )}
              >
                <Banknote className="h-4 w-4" />
                Tunai
              </button>
              <button
                type="button"
                onClick={() => setMethod("transfer")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  method === "transfer"
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "hover:bg-muted"
                )}
              >
                <Landmark className="h-4 w-4" />
                Transfer
              </button>
            </div>
          </div>

          {method === "tunai" ? (
            <div className="space-y-2">
              <Label htmlFor="paid">Jumlah Dibayar</Label>
              <Input
                id="paid"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="0"
                value={paidInput}
                onChange={(e) => setPaidInput(e.target.value)}
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5">
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPaidInput(String(amt))}
                    className={cn(
                      "rounded-md border px-2 py-1 text-xs font-medium tabular-nums transition-colors",
                      Number(paidInput) === amt
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {amt === total ? "Uang pas" : formatIDR(amt)}
                  </button>
                ))}
              </div>
              <div
                className={cn(
                  "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                  change >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
                )}
              >
                <span className="font-medium">Kembalian</span>
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    change >= 0 ? "text-emerald-700" : "text-red-600"
                  )}
                >
                  {change >= 0
                    ? formatIDR(change)
                    : `Kurang ${formatIDR(Math.abs(change))}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              Pembayaran transfer dianggap lunas sebesar{" "}
              <span className="font-bold">{formatIDR(total)}</span> — pastikan
              dana sudah diterima sebelum menyimpan.
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit || submitting}>
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Simpan Pesanan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
