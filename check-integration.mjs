import { chromium } from "playwright";
const browser = await chromium.launch();
const check = (n, ok) => console.log(`${ok ? "PASS" : "FAIL"}  ${n}`);
async function loginAs(page, email, pass) {
  await page.goto("http://localhost:3000/login");
  await page.fill("#email", email);
  await page.fill("#password", pass);
  await page.click("button:has-text('Masuk')");
  await page.waitForURL(/\/(pos|dashboard|inventory)$/);
}

// --- konteks 1: kasir buat pesanan ---
const ctx1 = await browser.newContext();
const p1 = await ctx1.newPage();
await loginAs(p1, "kasir@develer.id", "kasir123");
await p1.waitForSelector("text=Keranjang");
await p1.click("button:has-text('Aqua 600ml')");
await p1.click("button:has-text('Bayar —')");
await p1.waitForSelector("text=Pembayaran");
await p1.click("button:has-text('Uang pas')");
await p1.click("button:has-text('Simpan Pesanan')");
await p1.waitForSelector("text=Struk Pesanan");
const receiptText = await p1.locator(".print-root").innerText();
const orderNo = receiptText.match(/SO-\d{8}-\d{4}/)[0];
check(`pesanan dibuat di konteks 1 (${orderNo})`, /^SO-\d{8}-\d{4}$/.test(orderNo));
await ctx1.close();

// --- konteks 2 (fresh browser): data pesanan TERSEDIA dari SQLite ---
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await loginAs(p2, "admin@develer.id", "admin123");
await p2.goto("http://localhost:3000/orders");
await p2.waitForSelector(`text=${orderNo}`);
check("pesanan dari konteks 1 terlihat di konteks 2 (persistensi SQLite)", true);

// --- halaman pengguna dari backend ---
await p2.goto("http://localhost:3000/users");
await p2.waitForSelector("text=Andi Wijaya");
check("halaman Pengguna memuat data backend", true);

// --- menu pengguna tanpa Reset Data Demo (produksi) ---
await p2.click("aside button:has-text('Andi Wijaya')");
await p2.waitForSelector("text=Pengaturan Toko");
const menuText = await p2.locator("[data-slot='dropdown-menu-content']").first().innerText().catch(() => "");
check("menu user produksi: tanpa Reset Data Demo", !menuText.includes("Reset Data Demo"));

// --- kasir masih bisa login (sesi independen) ---
const ctx3 = await browser.newContext();
const p3 = await ctx3.newPage();
await loginAs(p3, "kasir@develer.id", "kasir123");
check("login kasir tetap bekerja", true);
await ctx3.close();
await browser.close();
