"use client";

import { Badge } from "@/components/ui/badge";
import type { Product } from "@/store/types";

// Badge status stok: hijau aman / kuning menipis / merah habis.
// Warna status selalu berpasangan dengan label teks.
export function StockBadge({ product }: { product: Product }) {
  if (product.stockQty === 0) {
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Habis</Badge>
    );
  }
  if (product.stockQty <= product.minStock) {
    return (
      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
        Menipis
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
      Aman
    </Badge>
  );
}
