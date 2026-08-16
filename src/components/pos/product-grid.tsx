"use client";

import { PackagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Product } from "@/store/types";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

// Kisi produk: klik untuk menambah ke keranjang. Badge stok memakai
// warna status (hijau normal / kuning menipis / merah habis) + teks.
export function ProductGrid({
  products,
  onAdd,
}: {
  products: Product[];
  onAdd: (product: Product) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => {
        const habis = p.stockQty === 0;
        const menipis = !habis && p.stockQty <= p.minStock;
        return (
          <button
            key={p.id}
            type="button"
            disabled={habis}
            onClick={() => onAdd(p)}
            className={cn(
              "group flex flex-col gap-1.5 rounded-xl border bg-white p-3 text-left transition-all",
              habis
                ? "cursor-not-allowed opacity-60"
                : "hover:border-emerald-500 hover:shadow-sm active:scale-[0.98]"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {p.sku}
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  "shrink-0 text-[10px]",
                  habis && "bg-red-100 text-red-700",
                  menipis && "bg-amber-100 text-amber-700",
                  !habis && !menipis && "bg-emerald-100 text-emerald-700"
                )}
              >
                {habis ? "Habis" : menipis ? `Sisa ${p.stockQty}` : `Stok ${p.stockQty}`}
              </Badge>
            </div>
            <span className="line-clamp-2 min-h-10 text-sm font-medium leading-tight">
              {p.name}
            </span>
            <div className="mt-auto flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-700">
                {formatIDR(p.price)}
              </span>
              <span className="text-[11px] text-muted-foreground">/ {p.unit}</span>
              {!habis ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
                  <PackagePlus className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}
