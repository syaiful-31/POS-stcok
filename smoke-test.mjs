// Smoke test browser-driven untuk Develer POS.
// Jalankan dengan dev server aktif (npm run dev), lalu: node smoke-test.mjs
// Screenshot tersimpan di smoke-shots/.
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const results = [];
const check = (name, cond) => {
  results.push([cond ? "PASS" : "FAIL", name]);
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({
  acceptDownloads: true,
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});
const shot = (name) =>
  page.screenshot({ path: `smoke-shots/${name}.png` });

async function login(email, password, expectedPath) {
  await page.goto(`${BASE}/login`);
  await page.waitForSelector("text=Develer POS");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button:has-text('Masuk')");
  await page.waitForURL(`**${expectedPath}`);
  check(`login ${email} -> ${expectedPath}`, page.url().includes(expectedPath));
}

// ---------- 1. Login page & login sebagai kasir ----------
await page.goto(`${BASE}/login`);
await page.waitForSelector("text=Develer POS");
await page.waitForSelector("text=Masuk");
check("halaman login tampil", true);
await shot("01-login");

await login("kasir@develer.id", "kasir123", "/pos");
await page.waitForSelector("text=Keranjang");
const navText = await page.locator("nav").first().innerText();
check(
  "RBAC kasir: tanpa menu Stok/Supplier/Pembelian",
  navText.includes("Kasir") &&
    !navText.includes("Stok") &&
    !navText.includes("Supplier") &&
    !navText.includes("Pembelian")
);
await shot("02-pos-kasir");

// ---------- 2. POS: cari produk, keranjang, bayar tunai ----------
await page.fill("input[placeholder*='Cari produk']", "Indomie Goreng");
await page.waitForSelector("text=Indomie Goreng Original");
await page.click("button:has-text('Indomie Goreng Original')");
await page.waitForSelector("text=Keranjang");
await page.click("button[aria-label='Tambah']");
await shot("03-cart");

await page.click("button:has-text('Bayar —')");
await page.waitForSelector("text=Pembayaran");
await page.click("button:has-text('Uang pas')");
await page.waitForSelector("text=Kembalian");
await shot("04-payment");
await page.click("button:has-text('Simpan Pesanan')");

// ---------- 3. Struk muncul ----------
await page.waitForSelector("text=Struk Pesanan");
await page.waitForSelector("text=/Pesanan SO-\\d{8}-\\d{4} tersimpan/");
const toastText = (
  await page.locator("text=/Pesanan SO-\\d{8}-\\d{4} tersimpan/").first().innerText()
).trim();
const orderNo = toastText.match(/SO-\d{8}-\d{4}/)?.[0] ?? "";
check(`struk muncul setelah simpan (${orderNo})`, /^SO-\d{8}-\d{4}$/.test(orderNo));
await shot("05-receipt");
await page.click("button:has-text('Tutup')");

// ---------- 4. Pesanan tercatat + persist setelah reload ----------
await page.goto(`${BASE}/orders`);
await page.waitForSelector(`text=${orderNo}`);
check("pesanan baru muncul di riwayat", true);
await page.reload();
await page.waitForSelector(`text=${orderNo}`);
check("data persist setelah reload (SQLite server)", true);

// ---------- 5. Batalkan pesanan -> stok kembali ----------
await page.click(`tr:has-text('${orderNo}') button[aria-label^='Detail']`);
await page.waitForSelector("text=Batalkan Pesanan");
await page.click("button:has-text('Batalkan Pesanan')");
await page.waitForSelector("text=Ya, Batalkan");
await page.click("button:has-text('Ya, Batalkan')");
await page.waitForSelector("text=stok dikembalikan");
check("pembatalan pesanan berhasil (stok kembali)", true);

// ---------- 6. Logout & login sebagai admin ----------
await page.click("aside button:has-text('Siti Rahayu')");
await page.waitForSelector("text=Keluar");
await page.click("text=Keluar");
await page.waitForURL("**/login");
check("logout kembali ke /login", true);

await login("admin@develer.id", "admin123", "/dashboard");

// ---------- 7. Dashboard rekap ----------
await page.waitForSelector("text=Rekap Penjualan");
await page.waitForSelector("text=Produk Terlaris");
await page.waitForSelector("text=Penjualan Harian");
check("dashboard admin menampilkan rekap", true);
await shot("06-dashboard");

// ekspor CSV
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.click("button:has-text('Ekspor CSV')"),
]);
check(
  `CSV terunduh (${download.suggestedFilename()})`,
  download.suggestedFilename().endsWith(".csv")
);
await shot("07-dashboard-csv");

// ---------- 8. Stok: peringatan menipis ----------
await page.goto(`${BASE}/inventory`);
await page.waitForSelector("text=FMCG-007");
const lowBadges = await page.locator("text=Menipis").count();
check(`badge stok menipis tampil (${lowBadges} produk)`, lowBadges >= 2);
await shot("08-inventory");

// ---------- 9. Pembelian: terima barang ----------
await page.goto(`${BASE}/purchases`);
await page.waitForSelector("text=Menunggu");
await page.click("button[aria-label^='Terima']");
await page.waitForSelector("text=Ya, Terima Barang");
await page.click("button:has-text('Ya, Terima Barang')");
await page.waitForSelector("text=stok bertambah");
check("terima barang menambah stok", true);
await shot("09-purchases");

// ---------- 9b. Pelanggan: daftar + detail ----------
await page.goto(`${BASE}/customers`);
await page.waitForSelector("text=Toko Sumber Rejeki");
await page.click("a[aria-label^='Detail']");
await page.waitForSelector("text=Riwayat Pesanan");
check("detail pelanggan menampilkan riwayat", true);
await shot("10-customer-detail");

// ---------- 9c. Produk: detail + log audit ----------
await page.goto(`${BASE}/inventory`);
await page.click("a[href^='/inventory/']");
await page.waitForSelector("text=Log Audit Pergerakan Stok");
await page.waitForSelector("text=Penjualan");
check("detail produk menampilkan log audit pergerakan", true);
await shot("11-product-detail");

// ---------- 10. Cek error konsol ----------
console.log("\n--- Console errors ---");
if (errors.length === 0) {
  console.log("(tidak ada)");
  check("tanpa error konsol/halaman", true);
} else {
  errors.forEach((e) => console.log(e));
  check("tanpa error konsol/halaman", false);
}

const failed = results.filter(([r]) => r === "FAIL");
console.log(`\nHasil: ${results.length - failed.length}/${results.length} PASS`);
await browser.close();
process.exit(failed.length > 0 ? 1 : 0);
