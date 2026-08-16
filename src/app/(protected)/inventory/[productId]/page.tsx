"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { AccessDenied } from "@/components/access-denied";
import { useCanAccess } from "@/components/auth-guard";
import { AdjustStockDialog } from "@/components/inventory/adjust-stock-dialog";
import { StockMovementsTable } from "@/components/inventory/stock-movements-table";
import { StockBadge } from "@/components/inventory/stock-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useStore } from "@/store/use-store";
import { formatIDR } from "@/lib/format";

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const canAccess = useCanAccess("/inventory");
  const product = useStore((s) =>
    s.products.find((p) => p.id === params.productId)
  );
  const [adjustOpen, setAdjustOpen] = useState(false);

  if (!canAccess) return <AccessDenied />;

  if (!product) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Produk tidak ditemukan.</p>
        <Link
          href="/inventory"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Daftar Stok
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/inventory"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-4 -ml-2" })}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Daftar Stok
      </Link>

      <PageHeader title={product.name} description={product.sku}>
        <Button onClick={() => setAdjustOpen(true)}>
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Penyesuaian Stok
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stok Saat Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {product.stockQty}{" "}
              <span className="text-base font-normal text-muted-foreground">
                {product.unit}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StockBadge product={product} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Stok Minimum
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {product.minStock}{" "}
              <span className="text-base font-normal text-muted-foreground">
                {product.unit}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Harga Jual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatIDR(product.price)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Audit Pergerakan Stok</CardTitle>
        </CardHeader>
        <CardContent>
          <StockMovementsTable productId={product.id} />
        </CardContent>
      </Card>

      <AdjustStockDialog
        product={product}
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
      />
    </div>
  );
}
