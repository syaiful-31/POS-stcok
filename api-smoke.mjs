// API smoke test backend: login per role, RBAC, alur kasir (pesan/batal),
// stok (adjust), pembelian (buat/terima), rekap, CSV, kelola user.
// Jalankan dengan dev server aktif: node api-smoke.mjs
const BASE = "http://localhost:3000";
let passed = 0;
let failed = 0;
const check = (name, cond) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (cond) passed++;
  else failed++;
};

// klien dengan cookie jar sederhana
function client() {
  let cookie = "";
  return {
    get cookie() { return cookie; },
    async call(method, path, body) {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          Origin: BASE,
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const setCookie = res.headers.get("set-cookie");
      if (setCookie) {
        const token = setCookie.match(/better-auth\.session_token=[^;]+/)?.[0];
        if (token) cookie = token;
      }
      let json = null;
      const text = await res.text();
      try { json = JSON.parse(text); } catch { json = text; }
      return { status: res.status, json };
    },
  };
}

const c = client();

// ---------- login ----------
async function signIn(email, password) {
  const res = await c.call("POST", "/api/auth/sign-in/email", { email, password });
  return res;
}

const kasirLogin = await signIn("kasir@develer.id", "kasir123");
check("login kasir berhasil", kasirLogin.status === 200 && kasirLogin.json?.user);

// ---------- produk (semua role boleh GET) ----------
const products = await c.call("GET", "/api/products");
check("GET /api/products (kasir) 200 + 10 produk", products.status === 200 && products.json?.data?.length === 10);

// ---------- RBAC ----------
const forbidden = await c.call("POST", "/api/products", { sku: "X", name: "X", unit: "pcs", price: 1000, minStock: 0, stockQty: 1 });
check("POST /api/products (kasir) ditolak 403", forbidden.status === 403);

// ---------- alur pesanan ----------
const before = products.json.data[0];
const orderRes = await c.call("POST", "/api/orders", {
  customerId: null,
  items: [{ productId: before.id, quantity: 2 }],
  paymentMethod: "tunai",
  paidAmount: before.price * 2,
});
check("POST /api/orders berhasil", orderRes.status === 200 && orderRes.json?.ok && orderRes.json?.order?.orderNumber?.startsWith("SO-"));
const orderId = orderRes.json.order.id;

const afterOrder = await c.call("GET", "/api/products");
const productAfter = afterOrder.json.data.find((p) => p.id === before.id);
check(`stok berkurang setelah pesanan (${before.stockQty} -> ${productAfter.stockQty})`, productAfter.stockQty === before.stockQty - 2);

// over-stock ditolak & atomik
const overRes = await c.call("POST", "/api/orders", {
  customerId: null,
  items: [{ productId: before.id, quantity: productAfter.stockQty + 100 }],
  paymentMethod: "tunai",
  paidAmount: 999999999,
});
check("pesanan melebihi stok ditolak", overRes.status === 400 && !overRes.json.ok);
const stillSame = (await c.call("GET", "/api/products")).json.data.find((p) => p.id === before.id);
check("stok tidak berubah saat validasi gagal (atomik)", stillSame.stockQty === productAfter.stockQty);

// riwayat pesanan
const orderList = await c.call("GET", "/api/orders");
check("GET /api/orders memuat pesanan baru", orderList.json.data.some((o) => o.id === orderId));

// pembatalan
const cancelRes = await c.call("POST", `/api/orders/${orderId}/cancel`);
check("POST /api/orders/:id/cancel berhasil", cancelRes.status === 200 && cancelRes.json.ok);
const restored = (await c.call("GET", "/api/products")).json.data.find((p) => p.id === before.id);
check(`stok dikembalikan setelah batal (${restored.stockQty})`, restored.stockQty === before.stockQty);
const cancelAgain = await c.call("POST", `/api/orders/${orderId}/cancel`);
check("batal dua kali ditolak", cancelAgain.status === 400);

// ---------- gudang: penyesuaian stok ----------
const gudang = client();
const gudangLogin = await gudang.call("POST", "/api/auth/sign-in/email", { email: "gudang@develer.id", password: "gudang123" });
check("login gudang berhasil", gudangLogin.status === 200);
const targetProduct = products.json.data[1];
const adjustRes = await gudang.call("POST", `/api/products/${targetProduct.id}/adjust`, { newQty: targetProduct.stockQty + 5, note: "uji smoke" });
check("POST adjust (+5) berhasil", adjustRes.status === 200 && adjustRes.json.diff === 5);
const movementsRes = await gudang.call("GET", `/api/products/${targetProduct.id}/movements`);
check("GET movements memuat penyesuaian baru", movementsRes.json.data.some((m) => m.type === "penyesuaian" && m.note === "uji smoke"));

// ---------- pembelian: buat + terima ----------
const suppliers = await gudang.call("GET", "/api/suppliers");
check("GET /api/suppliers (gudang) 3 supplier", suppliers.json.data.length === 3);
const purchaseRes = await gudang.call("POST", "/api/purchases", {
  supplierId: suppliers.json.data[0].id,
  items: [{ productId: targetProduct.id, quantity: 10, cost: 50000 }],
});
check("POST /api/purchases (menunggu) berhasil", purchaseRes.status === 200 && purchaseRes.json.purchase.status === "menunggu");
const stockBeforeReceive = (await gudang.call("GET", "/api/products")).json.data.find((p) => p.id === targetProduct.id).stockQty;
const receiveRes = await gudang.call("POST", `/api/purchases/${purchaseRes.json.purchase.id}/receive`);
check("POST receive berhasil", receiveRes.status === 200);
const stockAfterReceive = (await gudang.call("GET", "/api/products")).json.data.find((p) => p.id === targetProduct.id).stockQty;
check(`stok +10 setelah terima barang (${stockBeforeReceive} -> ${stockAfterReceive})`, stockAfterReceive === stockBeforeReceive + 10);
const receiveAgain = await gudang.call("POST", `/api/purchases/${purchaseRes.json.purchase.id}/receive`);
check("terima dua kali ditolak", receiveAgain.status === 400);

// ---------- admin: rekap + CSV + kelola user ----------
const admin = client();
const adminLogin = await admin.call("POST", "/api/auth/sign-in/email", { email: "admin@develer.id", password: "admin123" });
check("login admin berhasil", adminLogin.status === 200);

const kasirDashboard = await c.call("GET", "/api/dashboard/summary");
check("dashboard ditolak untuk kasir (403)", kasirDashboard.status === 403);
const dash = await admin.call("GET", "/api/dashboard/summary");
check(
  "dashboard admin: revenue & topProducts terisi",
  dash.status === 200 && dash.json.summary.txCount > 0 && dash.json.summary.topProducts.length > 0 && dash.json.summary.lowStockCount >= 2
);

const csv = await admin.call("GET", "/api/export/csv");
check("CSV multi-section terunduh", csv.status === 200 && String(csv.json).includes("LAPORAN PENJUALAN") && String(csv.json).includes("LAPORAN STOK") && String(csv.json).includes("LAPORAN PEMBELIAN"));

const usersList = await admin.call("GET", "/api/users");
check("GET /api/users (admin) 3 user", usersList.json.data.length === 3);
const newUser = await admin.call("POST", "/api/users", { name: "Budi Test", email: "budi.test@develer.id", password: "budi12345", role: "kasir" });
check("POST /api/users berhasil", newUser.status === 200 && newUser.json.user.role === "kasir");
const patched = await admin.call("PATCH", `/api/users/${newUser.json.user.id}`, { role: "gudang", password: "budi45678" });
check("PATCH /api/users (role + password) berhasil", patched.status === 200 && patched.json.user.role === "gudang");
const newLogin = await client().call("POST", "/api/auth/sign-in/email", { email: "budi.test@develer.id", password: "budi45678" });
check("user baru login dengan password baru", newLogin.status === 200);
const deleted = await admin.call("DELETE", `/api/users/${newUser.json.user.id}`);
check("DELETE /api/users berhasil", deleted.status === 200);
const demoteSelf = await admin.call("PATCH", `/api/users/${adminLogin.json.user.id}`, { role: "kasir" });
check("demote admin terakhir ditolak", demoteSelf.status === 400);

console.log(`\nHasil: ${passed} PASS, ${failed} FAIL`);
process.exit(failed > 0 ? 1 : 0);
