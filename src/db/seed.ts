// FIXTURE DEV SAJA — jangan dipakai produksi (produksi memakai bootstrap
// admin; data dibuat lewat aplikasi). Seed data demo deterministik: 3 user
// RBAC, 10 produk FMCG, 6 pelanggan, 3 supplier, pesanan & pembelian
// historis dengan pergerakan stok yang di-replay sehingga stok akhir
// konsisten dengan log audit. Idempotent: lewati bila produk sudah ada
// (FORCE=1 untuk hapus & seed ulang). Jalankan: npm run db:seed

import "dotenv/config";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import * as authSchema from "@/db/auth-schema";
import { uid } from "@/lib/ids";

// ---------- util tanggal ----------

function atDaysAgo(days: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function atHoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

// ---------- RNG deterministik ----------

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const yyyymmdd = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate()
  ).padStart(2, "0")}`;
const orderNumber = (seq: number, d: Date) =>
  `SO-${yyyymmdd(d)}-${String(seq).padStart(4, "0")}`;
const purchaseNumber = (seq: number, d: Date) =>
  `PO-${yyyymmdd(d)}-${String(seq).padStart(4, "0")}`;

// ---------- user demo ----------

const DEMO_USERS = [
  { name: "Andi Wijaya", email: "admin@develer.id", password: "admin123", role: "admin" },
  { name: "Siti Rahayu", email: "kasir@develer.id", password: "kasir123", role: "kasir" },
  { name: "Budi Santoso", email: "gudang@develer.id", password: "gudang123", role: "gudang" },
] as const;

async function seedUsers() {
  const users: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const existing = await db
      .select({ id: authSchema.user.id, role: authSchema.user.role, name: authSchema.user.name })
      .from(authSchema.user)
      .where(eq(authSchema.user.email, u.email))
      .get();
    if (existing) {
      // selalu sinkronkan nama & role (mis. role sempat berubah saat demo)
      if (existing.role !== u.role || existing.name !== u.name) {
        await db
          .update(authSchema.user)
          .set({ role: u.role, name: u.name })
          .where(eq(authSchema.user.id, existing.id));
      }
      users[u.role] = existing.id;
      continue;
    }
    const res = await auth.api.signUpEmail({
      body: { name: u.name, email: u.email, password: u.password },
    });
    if (!res.user) {
      throw new Error(`Seed user ${u.email} gagal: ${JSON.stringify(res)}`);
    }
    await db
      .update(authSchema.user)
      .set({ role: u.role })
      .where(eq(authSchema.user.id, res.user.id));
    users[u.role] = res.user.id;
  }
  return users;
}

// ---------- produk / pelanggan / supplier ----------

const PRODUCT_SPECS = [
  { sku: "FMCG-001", name: "Indomie Goreng Original (Dus 40)", unit: "dus", price: 112000, minStock: 50, target: 320, createdDaysAgo: 180 },
  { sku: "FMCG-002", name: "Indomie Soto (Dus 40)", unit: "dus", price: 108000, minStock: 50, target: 285, createdDaysAgo: 180 },
  { sku: "FMCG-003", name: "Aqua 600ml (Karton 24)", unit: "karton", price: 48000, minStock: 40, target: 150, createdDaysAgo: 170 },
  { sku: "FMCG-004", name: "Teh Botol Sosro 350ml (Karton 24)", unit: "karton", price: 92000, minStock: 40, target: 90, createdDaysAgo: 170 },
  { sku: "FMCG-005", name: "Coca-Cola 390ml (Karton 24)", unit: "karton", price: 132000, minStock: 40, target: 60, createdDaysAgo: 160 },
  { sku: "FMCG-006", name: "Minyak Goreng Sania 2L (Karton 12)", unit: "karton", price: 288000, minStock: 30, target: 210, createdDaysAgo: 150 },
  { sku: "FMCG-007", name: "Gula Pasir Gulaku 1kg (Dus 20)", unit: "dus", price: 240000, minStock: 60, target: 45, createdDaysAgo: 150 },
  { sku: "FMCG-008", name: "Beras Premium 5kg (Karung 20)", unit: "karung", price: 290000, minStock: 30, target: 120, createdDaysAgo: 140 },
  { sku: "FMCG-009", name: "Kopi Kapal Api 380g (Dus 24)", unit: "dus", price: 130000, minStock: 30, target: 75, createdDaysAgo: 120 },
  { sku: "FMCG-010", name: "Susu Ultra 1L (Karton 12)", unit: "karton", price: 156000, minStock: 24, target: 18, createdDaysAgo: 90 },
];

const CUSTOMER_SPECS = [
  { name: "Toko Sumber Rejeki", phone: "0812-3456-7890", address: "Jl. Merdeka No. 12, Bandung", daysAgo: 180 },
  { name: "Toko Maju Jaya", phone: "0813-2345-6789", address: "Jl. Ahmad Yani No. 45, Cimahi", daysAgo: 160 },
  { name: "Warung Bu Tini", phone: "0812-9876-5432", address: "Jl. Kebon Jati No. 3, Bandung", daysAgo: 140 },
  { name: "Toko Berkah Abadi", phone: "0811-2233-4455", address: "Jl. Raya Ujungberung No. 101, Bandung", daysAgo: 120 },
  { name: "Koperasi Karyawan Sejahtera", phone: "0821-5566-7788", address: "Kawasan Industri Dayeuhkolot, Bandung", daysAgo: 90 },
  { name: "Toko Lancar Jaya", phone: "0822-1122-3344", address: "Jl. Cibaduyut Raya No. 77, Bandung", daysAgo: 60 },
];

const SUPPLIER_SPECS = [
  { name: "PT Sinar Mas Distribusi", phone: "022-7201-8800", address: "Jl. Soekarno Hatta No. 200, Bandung", daysAgo: 200 },
  { name: "CV Sumber Makmur", phone: "022-6012-3456", address: "Jl. Raya Cicalengka No. 15, Bandung", daysAgo: 150 },
  { name: "PT Indo Grosir Nusantara", phone: "021-8899-0011", address: "Jl. Industri Raya II Blok C, Jakarta", daysAgo: 100 },
];

// ---------- main ----------

export async function seed(): Promise<void> {
  const existing = await db.select({ id: schema.products.id }).from(schema.products).limit(1).all();
  if (existing.length > 0 && process.env.FORCE !== "1") {
    console.log("Seed dilewati: data sudah ada (pakai FORCE=1 untuk reset).");
    return;
  }
  if (process.env.FORCE === "1") {
    for (const t of [
      schema.stockMovements, schema.orderItems, schema.orders,
      schema.purchaseItems, schema.purchases,
      schema.customers, schema.suppliers, schema.products,
    ]) {
      await db.delete(t).run();
    }
    console.log("Data lama dihapus (FORCE=1).");
  }

  const rnd = mulberry32(20260816);
  const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const pickN = <T,>(arr: T[], n: number): T[] => {
    const copy = [...arr];
    const out: T[] = [];
    while (out.length < n && copy.length > 0) {
      out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
    }
    return out;
  };

  const userIds = await seedUsers();
  const kasirId = userIds.kasir;
  const adminId = userIds.admin;
  const gudangId = userIds.gudang;

  // produk
  const products: (typeof schema.products.$inferInsert)[] = PRODUCT_SPECS.map((s) => ({
    id: uid(),
    sku: s.sku,
    name: s.name,
    unit: s.unit,
    price: s.price,
    stockQty: 0, // dihitung dari replay
    minStock: s.minStock,
    createdAt: atDaysAgo(s.createdDaysAgo, 9),
  }));
  await db.insert(schema.products).values(products).run();

  // pelanggan
  const customers = CUSTOMER_SPECS.map((c) => ({
    id: uid(),
    name: c.name,
    phone: c.phone,
    address: c.address,
    createdAt: atDaysAgo(c.daysAgo, 9),
  }));
  await db.insert(schema.customers).values(customers).run();

  // supplier
  const suppliers = SUPPLIER_SPECS.map((s) => ({
    id: uid(),
    name: s.name,
    phone: s.phone,
    address: s.address,
    createdAt: atDaysAgo(s.daysAgo, 9),
  }));
  await db.insert(schema.suppliers).values(suppliers).run();

  const movements: (typeof schema.stockMovements.$inferInsert)[] = [];

  const pushMovement = (m: Omit<(typeof schema.stockMovements.$inferInsert), "id">) => {
    movements.push({ id: uid(), ...m });
  };

  // pesanan historis (16, 2 batal; 3 hari ini)
  const orderDays = [0, 0, 0, 1, 2, 3, 4, 5, 7, 9, 11, 14, 17, 21, 25, 30];
  const batalDays = new Set([5, 14]);
  let orderSeq = 0;

  for (const [idx, days] of orderDays.entries()) {
    const createdAt =
      days === 0 ? atHoursAgo([7, 5, 2][orderSeq % 3]) : atDaysAgo(days, int(8, 17), int(0, 59));
    const isBatal = batalDays.has(days);
    const customer = pick(customers);
    const items = pickN(products, int(2, 4)).map((p) => {
      const quantity = int(1, 10);
      return { p, quantity, price: p.price, subtotal: p.price * quantity };
    });
    const total = items.reduce((s, it) => s + it.subtotal, 0);
    const paymentMethod = rnd() < 0.5 ? "tunai" : "transfer";
    const paidAmount = paymentMethod === "tunai" ? Math.ceil(total / 10000) * 10000 : total;

    orderSeq += 1;
    const order = {
      id: uid(),
      orderNumber: orderNumber(orderSeq, new Date(createdAt)),
      customerId: customer.id,
      userId: idx % 3 === 0 ? kasirId : adminId,
      orderDate: createdAt,
      total,
      status: isBatal ? "batal" : "selesai",
      paymentMethod,
      paidAmount,
      changeAmount: paidAmount - total,
    } as const;
    await db.insert(schema.orders).values(order).run();
    await db.insert(schema.orderItems).values(
      items.map((it) => ({
        id: uid(),
        orderId: order.id,
        productId: it.p.id,
        productName: it.p.name,
        sku: it.p.sku,
        unit: it.p.unit,
        price: it.price,
        quantity: it.quantity,
        subtotal: it.subtotal,
      }))
    ).run();

    items.forEach((it) => {
      pushMovement({
        productId: it.p.id,
        productName: it.p.name,
        type: "penjualan",
        quantity: -it.quantity,
        referenceType: "order",
        referenceId: order.id,
        note: `Penjualan ${order.orderNumber}`,
        userId: order.userId,
        createdAt,
      });
    });

    if (isBatal) {
      const cancelledAt = atDaysAgo(days, int(9, 18));
      items.forEach((it) => {
        pushMovement({
          productId: it.p.id,
          productName: it.p.name,
          type: "penjualan",
          quantity: it.quantity,
          referenceType: "order",
          referenceId: order.id,
          note: `Pembatalan ${order.orderNumber}`,
          userId: adminId,
          createdAt: cancelledAt,
        });
      });
    }
  }

  // pembelian historis (2 diterima + movement, 2 menunggu)
  let purchaseSeq = 0;
  const purchaseSpecs = [
    { daysAgo: 12, status: "diterima" as const, receivedDaysAfter: 2, itemsCount: 3, qtyMin: 10, qtyMax: 30 },
    { daysAgo: 8, status: "diterima" as const, receivedDaysAfter: 1, itemsCount: 2, qtyMin: 15, qtyMax: 40 },
    { daysAgo: 2, status: "menunggu" as const, receivedDaysAfter: 0, itemsCount: 3, qtyMin: 10, qtyMax: 25 },
    { daysAgo: 1, status: "menunggu" as const, receivedDaysAfter: 0, itemsCount: 2, qtyMin: 10, qtyMax: 30 },
  ];

  for (const spec of purchaseSpecs) {
    const createdAt = atDaysAgo(spec.daysAgo, int(9, 15));
    const supplier = pick(suppliers);
    const items = pickN(products, spec.itemsCount).map((p) => {
      const quantity = int(spec.qtyMin, spec.qtyMax);
      const cost = Math.round((p.price * 0.78) / 100) * 100;
      return { p, quantity, cost, subtotal: cost * quantity };
    });
    const total = items.reduce((s, it) => s + it.subtotal, 0);

    purchaseSeq += 1;
    const purchase = {
      id: uid(),
      purchaseNumber: purchaseNumber(purchaseSeq, new Date(createdAt)),
      supplierId: supplier.id,
      supplierName: supplier.name,
      userId: gudangId,
      purchaseDate: createdAt,
      total,
      status: spec.status,
      note: spec.status === "menunggu" ? "Menunggu pengiriman supplier" : null,
      receivedAt: spec.status === "diterima" ? atDaysAgo(spec.daysAgo - spec.receivedDaysAfter, int(9, 16)) : null,
    } as const;
    await db.insert(schema.purchases).values(purchase).run();
    await db.insert(schema.purchaseItems).values(
      items.map((it) => ({
        id: uid(),
        purchaseId: purchase.id,
        productId: it.p.id,
        productName: it.p.name,
        sku: it.p.sku,
        unit: it.p.unit,
        quantity: it.quantity,
        cost: it.cost,
        subtotal: it.subtotal,
      }))
    ).run();

    if (purchase.status === "diterima" && purchase.receivedAt) {
      items.forEach((it) => {
        pushMovement({
          productId: it.p.id,
          productName: it.p.name,
          type: "pembelian",
          quantity: it.quantity,
          referenceType: "purchase",
          referenceId: purchase.id,
          note: `Penerimaan ${purchase.purchaseNumber}`,
          userId: gudangId,
          createdAt: purchase.receivedAt!,
        });
      });
    }
  }

  // penyesuaian (stock opname)
  const adjusted = products.find((p) => p.sku === "FMCG-007")!;
  pushMovement({
    productId: adjusted.id,
    productName: adjusted.name,
    type: "penyesuaian",
    quantity: -12,
    referenceType: "adjustment",
    referenceId: null,
    note: "Koreksi stok fisik saat opname gudang",
    userId: gudangId,
    createdAt: atDaysAgo(20, 10),
  });

  // Replay: stok akhir produk = base + Σ pergerakan di atas. Base dipilih
  // sehingga hasilnya persis target (konsisten dengan log audit).
  await db.insert(schema.stockMovements).values(movements).run();
  for (const spec of PRODUCT_SPECS) {
    const product = products.find((p) => p.sku === spec.sku)!;
    await db
      .update(schema.products)
      .set({ stockQty: spec.target })
      .where(eq(schema.products.id, product.id))
      .run();
  }

  console.log(
    `Seed selesai: ${products.length} produk, ${customers.length} pelanggan, ` +
      `${suppliers.length} supplier, ${orderSeq} pesanan, ${purchaseSeq} pembelian, ` +
      `${movements.length} pergerakan stok, ${DEMO_USERS.length} user.`
  );
}

// Jalankan langsung: npx tsx src/db/seed.ts
if (process.argv[1]?.includes("seed.ts") || process.argv[1]?.includes("seed.mjs")) {
  seed()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("Seed gagal:", e);
      process.exit(1);
    });
}
