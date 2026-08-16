"use client";

import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/empty-state";
import type { CartLine } from "@/store/use-store";
import type { Product } from "@/store/types";
import { formatIDR } from "@/lib/format";

export function CartPanel({
  lines,
  products,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
}: {
  lines: CartLine[];
  products: Product[];
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}) {
  const resolved = lines
    .map((line) => ({
      line,
      product: products.find((p) => p.id === line.productId),
    }))
    .filter((r) => r.product) as { line: CartLine; product: Product }[];

  const total = resolved.reduce(
    (sum, { line, product }) => sum + product.price * line.qty,
    0
  );
  const totalQty = resolved.reduce((sum, { line }) => sum + line.qty, 0);

  return (
    <div className="flex flex-col rounded-xl border bg-white lg:sticky lg:top-6">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-semibold">
            Keranjang{" "}
            {totalQty > 0 ? (
              <span className="text-muted-foreground">({totalQty} item)</span>
            ) : null}
          </h2>
        </div>
      </div>

      <div className="max-h-[45vh] flex-1 overflow-y-auto p-3 lg:max-h-[50vh]">
        {resolved.length === 0 ? (
          <EmptyState
            title="Keranjang kosong"
            description="Klik produk di sebelah kiri untuk menambahkan."
          />
        ) : (
          <div className="space-y-2">
            {resolved.map(({ line, product }) => {
              const atCap = line.qty >= product.stockQty;
              return (
                <div
                  key={product.id}
                  className="rounded-lg border p-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatIDR(product.price)} / {product.unit}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemove(product.id)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label={`Hapus ${product.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onDecrement(product.id)}
                        aria-label="Kurangi"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center font-medium tabular-nums">
                        {line.qty}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        disabled={atCap}
                        onClick={() => onIncrement(product.id)}
                        aria-label="Tambah"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {formatIDR(product.price * line.qty)}
                    </span>
                  </div>
                  {atCap ? (
                    <div className="mt-1 text-right text-[11px] text-amber-600">
                      Stok maksimal tercapai
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Belanja</span>
          <span className="text-xl font-bold tabular-nums">
            {formatIDR(total)}
          </span>
        </div>
        <Separator className="my-3" />
        <Button
          className="w-full"
          size="lg"
          disabled={resolved.length === 0}
          onClick={onCheckout}
        >
          Bayar — {formatIDR(total)}
        </Button>
      </div>
    </div>
  );
}
