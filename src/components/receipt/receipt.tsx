import type { Order, ShopInfo } from "@/store/types";
import { formatIDR, formatDateTime } from "@/lib/format";

// Struk gaya thermal 80mm — hitam di atas putih (aman untuk printer thermal
// dan hemat tinta). Murni presentasional: tidak membaca store.
export function Receipt({
  order,
  cashierName,
  shopInfo,
}: {
  order: Order;
  cashierName: string;
  shopInfo: ShopInfo;
}) {
  return (
    <div className="mx-auto w-[72mm] bg-white font-mono text-[11px] leading-snug text-black">
      <div className="text-center">
        <div className="text-sm font-bold">{shopInfo.name}</div>
        <div>{shopInfo.address}</div>
        <div>Telp: {shopInfo.phone}</div>
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      <div className="grid grid-cols-2 gap-x-2">
        <div>No: {order.orderNumber}</div>
        <div className="text-right">{formatDateTime(order.createdAt)}</div>
        <div>Kasir: {cashierName}</div>
        <div className="text-right">Status: {order.status.toUpperCase()}</div>
        <div className="col-span-2">
          Pelanggan: {order.customerName ?? "Umum"}
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-black" />

      {order.items.map((it, idx) => (
        <div key={idx} className="mb-1">
          <div>{it.productName}</div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-2">
            <span>
              {it.qty} {it.unit} x {formatIDR(it.price)}
            </span>
            <span className="text-right">{formatIDR(it.subtotal)}</span>
          </div>
        </div>
      ))}

      <div className="my-2 border-t border-dashed border-black" />

      <div className="flex justify-between font-bold">
        <span>TOTAL</span>
        <span>{formatIDR(order.total)}</span>
      </div>
      <div className="flex justify-between">
        <span>{order.paymentMethod === "tunai" ? "Tunai" : "Transfer"}</span>
        <span>{formatIDR(order.paidAmount)}</span>
      </div>
      {order.paymentMethod === "tunai" ? (
        <div className="flex justify-between">
          <span>Kembali</span>
          <span>{formatIDR(order.changeAmount)}</span>
        </div>
      ) : (
        <div className="flex justify-between">
          <span>Kembali</span>
          <span>0 (Lunas)</span>
        </div>
      )}

      <div className="my-2 border-t border-dashed border-black" />
      <div className="text-center">
        <div>Terima kasih atas kunjungan Anda!</div>
        <div>Barang yang sudah dibeli tidak dapat ditukar.</div>
      </div>
    </div>
  );
}
