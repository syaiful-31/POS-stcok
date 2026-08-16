import { desc, eq, inArray, like, or } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import * as authSchema from "@/db/auth-schema";
import { err, ok, okList, requireRole, parseBody, isGuardError, uid, nowISO } from "@/lib/api";
import { localYyyymmdd, nextDocSeq, toOrder } from "@/lib/domain";

// GET /api/orders?q=&status= — riwayat pesanan (admin/kasir)
export async function GET(req: NextRequest) {
  const guard = await requireRole(["admin", "kasir"]);
  if (isGuardError(guard)) return guard.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const status = req.nextUrl.searchParams.get("status");
  const where = [];
  if (q) where.push(or(like(schema.orders.orderNumber, `%${q}%`)));
  if (status === "selesai" || status === "batal") where.push(eq(schema.orders.status, status));

  const query = db
    .select()
    .from(schema.orders)
    .orderBy(desc(schema.orders.orderDate))
    .limit(200)
    .$dynamic();
  if (where.length > 0) query.where(or(...where));
  const orders = await query.all();  const ids = orders.map((o) => o.id);
  const items = ids.length > 0
    ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids)).all()
    : [];
  const customers = ids.length > 0
    ? await db
        .select({ id: schema.customers.id, name: schema.customers.name })
        .from(schema.customers)
        .where(inArray(schema.customers.id, orders.map((o) => o.customerId).filter((c): c is string => c !== null)))
        .all()
    : [];
  const users = await db
    .select({ id: authSchema.user.id, name: authSchema.user.name })
    .from(authSchema.user)
    .all();

  const customerName = new Map(customers.map((c) => [c.id, c.name]));
  const userName = new Map(users.map((u) => [u.id, u.name]));
  const itemsByOrder = new Map<string, (typeof schema.orderItems.$inferSelect)[]>();
  items.forEach((it) => {
    const list = itemsByOrder.get(it.orderId) ?? [];
    list.push(it);
    itemsByOrder.set(it.orderId, list);
  });

  const data = orders.map((o) => {
    const dto = toOrder(o, itemsByOrder.get(o.id) ?? [], userName);
    return { ...dto, customerName: o.customerId ? (customerName.get(o.customerId) ?? null) : null };
  });
  return okList(data);
}

const createOrderSchema = z.object({
  customerId: z.string().nullable().default(null),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
  paymentMethod: z.enum(["tunai", "transfer"]),
  paidAmount: z.number().int().min(0),
});

// POST /api/orders — buat pesanan lunas (admin/kasir).
// Validasi stok atomik dalam satu transaksi: semua item dicek & stok
// dikurangi sekaligus; gagal satu item -> seluruh transaksi dibatalkan.
export async function POST(req: NextRequest) {
  const guard = await requireRole(["admin", "kasir"]);
  if (isGuardError(guard)) return guard.error;
  const body = await parseBody(createOrderSchema, req);
  if ("error" in body) return body.error;

  const { customerId, items: lines, paymentMethod, paidAmount } = body.data;

  const customer = customerId
    ? await db.select().from(schema.customers).where(eq(schema.customers.id, customerId)).get()
    : null;
  if (customerId && !customer) return err("Pelanggan tidak ditemukan.", 404);

  const failure = { message: "" };
  const orderId = uid();
  const createdAt = nowISO();
  let orderItemsDto: {
    productId: string;
    productName: string;
    sku: string;
    unit: string;
    price: number;
    qty: number;
    subtotal: number;
  }[] = [];

  const order = db.transaction((tx) => {
    // cek & kunci semua produk (better-sqlite3 serial: transaksi = atomik)
    const resolved: { product: typeof schema.products.$inferSelect; quantity: number }[] = [];
    for (const line of lines) {
      const product = tx
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, line.productId))
        .get();
      if (!product) {
        failure.message = "Produk tidak ditemukan.";
        return null;
      }
      if (line.quantity > product.stockQty) {
        failure.message = `Stok tidak mencukupi untuk ${product.name} (tersedia ${product.stockQty}).`;
        return null;
      }
      resolved.push({ product, quantity: line.quantity });
    }

    const total = resolved.reduce((s, r) => s + r.product.price * r.quantity, 0);
    if (paidAmount < total) {
      failure.message = "Jumlah bayar kurang dari total belanja.";
      return null;
    }

    const seq = nextDocSeq(tx, schema.orders, "SO");
    const orderNumber = `SO-${localYyyymmdd()}-${String(seq).padStart(4, "0")}`;

    tx.insert(schema.orders)
      .values({
        id: orderId,
        orderNumber,
        customerId: customer?.id ?? null,
        userId: guard.user.id,
        orderDate: createdAt,
        total,
        status: "selesai",
        paymentMethod,
        paidAmount,
        changeAmount: paidAmount - total,
      })
      .run();

    orderItemsDto = resolved.map((r) => ({
      productId: r.product.id,
      productName: r.product.name,
      sku: r.product.sku,
      unit: r.product.unit,
      price: r.product.price,
      qty: r.quantity,
      subtotal: r.product.price * r.quantity,
    }));

    for (const item of orderItemsDto) {
      const r = resolved.find((x) => x.product.id === item.productId)!;
      tx.insert(schema.orderItems)
        .values({
          id: uid(),
          orderId,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          unit: item.unit,
          price: item.price,
          quantity: item.qty,
          subtotal: item.subtotal,
        })
        .run();
      tx.update(schema.products)
        .set({ stockQty: r.product.stockQty - r.quantity })
        .where(eq(schema.products.id, r.product.id))
        .run();
      tx.insert(schema.stockMovements)
        .values({
          id: uid(),
          productId: r.product.id,
          productName: r.product.name,
          type: "penjualan",
          quantity: -r.quantity,
          referenceType: "order",
          referenceId: orderId,
          note: `Penjualan ${orderNumber}`,
          userId: guard.user.id,
          createdAt,
        })
        .run();
    }

    return { orderNumber, total, changeAmount: paidAmount - total };
  });

  if (!order) return err(failure.message || "Gagal membuat pesanan.");

  return ok({
    order: {
      id: orderId,
      orderNumber: order.orderNumber,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
      createdBy: guard.user.id,
      cashierName: guard.user.name,
      items: orderItemsDto,
      total: order.total,
      status: "selesai" as const,
      paymentMethod,
      paidAmount,
      changeAmount: order.changeAmount,
      createdAt,
    },
  });
}
