"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/components/access-denied";
import { useCanAccess } from "@/components/auth-guard";
import { ProductGrid } from "@/components/pos/product-grid";
import { CartPanel } from "@/components/pos/cart-panel";
import { PaymentDialog } from "@/components/pos/payment-dialog";
import { ReceiptDialog } from "@/components/receipt/receipt-dialog";
import { Input } from "@/components/ui/input";
import { useStore, type CartLine } from "@/store/use-store";
import type { Order, Product } from "@/store/types";

export default function PosPage() {
  const canAccess = useCanAccess("/pos");
  const products = useStore((s) => s.products);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    );
  }, [products, query]);

  const addToCart = (product: Product) => {
    const existing = cart.find((l) => l.productId === product.id);
    const currentQty = existing?.qty ?? 0;
    if (currentQty >= product.stockQty) {
      toast.warning(`Stok ${product.name} tersisa ${product.stockQty} ${product.unit}.`);
      return;
    }
    setCart((prev) =>
      existing
        ? prev.map((l) =>
            l.productId === product.id ? { ...l, qty: l.qty + 1 } : l
          )
        : [...prev, { productId: product.id, qty: 1 }]
    );
  };

  const increment = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    const line = cart.find((l) => l.productId === productId);
    if (!product || !line) return;
    if (line.qty >= product.stockQty) {
      toast.warning(`Stok ${product.name} tersisa ${product.stockQty} ${product.unit}.`);
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l))
    );
  };

  const decrement = (productId: string) => {
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0)
    );
  };

  const remove = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const handleOrderSaved = (order: Order) => {
    setCart([]);
    setReceiptOrder(order);
    setReceiptOpen(true);
  };

  if (!canAccess) return <AccessDenied />;

  return (
    <div>
      <PageHeader
        title="Kasir"
        description="Cari produk, tambahkan ke keranjang, lalu proses pembayaran."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        <div>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari produk berdasarkan nama atau SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-white pl-9"
            />
          </div>
          <ProductGrid products={filtered} onAdd={addToCart} />
          {filtered.length === 0 ? (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Tidak ada produk yang cocok dengan pencarian &ldquo;{query}&rdquo;.
            </p>
          ) : null}
        </div>

        <CartPanel
          lines={cart}
          products={products}
          onIncrement={increment}
          onDecrement={decrement}
          onRemove={remove}
          onCheckout={() => setPaymentOpen(true)}
        />
      </div>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        lines={cart}
        onSuccess={handleOrderSaved}
      />

      <ReceiptDialog
        order={receiptOrder}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </div>
  );
}
