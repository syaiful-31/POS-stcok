// Store frontend — kini menjadi klien cache untuk backend (Next.js API +
// SQLite). Kontrak aksi tetap sama dengan versi mock ({ ok, error?, ... }),
// tetapi kini async: memanggil route handler lalu menyegarkan cache lokal
// agar seluruh UI (yang dibaca lewat selector) otomatis konsisten.

"use client";

import { create } from "zustand";
import { apiFetch, apiList, ApiError } from "@/lib/api-client";
import type {
  Customer,
  Order,
  PaymentMethod,
  Product,
  Purchase,
  Role,
  StockMovement,
  Supplier,
} from "./types";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export interface CartLine {
  productId: string;
  qty: number;
}

type Ok<T> = { ok: true } & (T extends undefined ? object : T);
export type Result<T = undefined> = Ok<T> | { ok: false; error: string };

interface SessionResponse {
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
  session?: unknown;
}

export interface AppState {
  // status bootstrap (pengganti _hasHydrated — menunggu cek sesi server)
  ready: boolean;
  session: AuthUser | null;
  // cache data server
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  orders: Order[];
  purchases: Purchase[];
  movements: StockMovement[]; // cache per produk (dibuka via loadMovements)
  users: UserRow[];

  // bootstrap & auth
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<Result<{ user: AuthUser }>>;
  logout: () => Promise<void>;
  refreshAll: () => Promise<void>;
  loadMovements: (productId: string) => Promise<void>;
  loadUsers: () => Promise<void>;

  // pelanggan
  addCustomer: (input: { name: string; phone: string; address: string }) => Promise<Result<{ customer: Customer }>>;
  updateCustomer: (id: string, patch: { name: string; phone: string; address: string }) => Promise<Result>;
  deleteCustomer: (id: string) => Promise<Result>;

  // produk
  addProduct: (input: { sku: string; name: string; unit: string; price: number; minStock: number; stockQty: number }) => Promise<Result<{ product: Product }>>;
  updateProduct: (id: string, patch: Partial<Pick<Product, "sku" | "name" | "unit" | "price" | "minStock">>) => Promise<Result>;
  deleteProduct: (id: string) => Promise<Result>;
  adjustStock: (input: { productId: string; newQty: number; note?: string }) => Promise<Result<{ diff: number }>>;

  // supplier
  addSupplier: (input: { name: string; phone: string; address: string }) => Promise<Result<{ supplier: Supplier }>>;
  updateSupplier: (id: string, patch: { name: string; phone: string; address: string }) => Promise<Result>;
  deleteSupplier: (id: string) => Promise<Result>;

  // kasir
  createOrder: (input: {
    customerId: string | null;
    items: CartLine[];
    paymentMethod: PaymentMethod;
    paidAmount: number;
  }) => Promise<Result<{ order: Order }>>;
  cancelOrder: (orderId: string) => Promise<Result<{ order: Order }>>;

  // pembelian
  createPurchase: (input: {
    supplierId: string;
    items: { productId: string; qty: number; cost: number }[];
    note?: string;
  }) => Promise<Result<{ purchase: Purchase }>>;
  receivePurchase: (purchaseId: string) => Promise<Result<{ purchase: Purchase }>>;

  // pengguna (admin)
  addUser: (input: { name: string; email: string; password: string; role: Role }) => Promise<Result<{ user: UserRow }>>;
  updateUser: (id: string, patch: { name: string; email: string; role: Role; password?: string }) => Promise<Result>;
  deleteUser: (id: string) => Promise<Result>;
}

// bungkus panggilan API: kembalikan Result, lalu segarkan cache terkait
async function mutate<T extends object>(
  call: () => Promise<T>,
  refresh: () => Promise<void>
): Promise<Result<T>> {
  try {
    const data = await call();
    await refresh();
    return { ok: true, ...data };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof ApiError ? e.message : "Terjadi kesalahan jaringan. Coba lagi.",
    };
  }
}

export const useStore = create<AppState>()((set, get) => ({
  ready: false,
  session: null,
  products: [],
  customers: [],
  suppliers: [],
  orders: [],
  purchases: [],
  movements: [],
  users: [],

  // ---------- bootstrap & auth ----------

  bootstrap: async () => {
    try {
      const res = await apiFetch<SessionResponse>("/api/auth/get-session");
      const u = res?.user;
      if (u) {
        set({
          session: {
            id: u.id,
            name: u.name,
            email: u.email,
            role: (u.role as Role) ?? "kasir",
          },
        });
        await get().refreshAll();
      } else {
        set({ session: null });
      }
    } catch {
      // jaringan bermasalah -> anggap belum login
      set({ session: null });
    } finally {
      set({ ready: true });
    }
  },

  login: async (email, password) => {
    try {
      const res = await apiFetch<{
        user?: { id: string; name: string; email: string; role?: string };
      }>("/api/auth/sign-in/email", {
        method: "POST",
        body: { email, password },
      });
      if (!res?.user) return { ok: false, error: "Email atau password salah." };
      const user: AuthUser = {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: (res.user.role as Role) ?? "kasir",
      };
      set({ session: user });
      await get().refreshAll();
      return { ok: true, user };
    } catch (e) {
      return {
        ok: false,
        error:
          e instanceof ApiError
            ? e.status === 403
              ? "Email atau password salah."
              : e.message
            : "Terjadi kesalahan jaringan. Coba lagi.",
      };
    }
  },

  logout: async () => {
    try {
      // Better Auth mewajibkan body JSON valid pada sign-out
      await apiFetch("/api/auth/sign-out", { method: "POST", body: {} });
    } catch {
      // abaikan — sesi lokal tetap dihapus
    }
    set({
      session: null,
      products: [],
      customers: [],
      suppliers: [],
      orders: [],
      purchases: [],
      movements: [],
      users: [],
    });
  },

  refreshAll: async () => {
    const role = get().session?.role ?? null;
    // fetch sesuai RBAC (hindari 403 yang tak perlu)
    const canKasir = role === "admin" || role === "kasir";
    const canGudang = role === "admin" || role === "gudang";
    const [products, customers, suppliers, orders, purchases] = await Promise.all([
      apiList<Product>("/api/products"),
      canKasir ? apiList<Customer>("/api/customers") : Promise.resolve([]),
      canGudang ? apiList<Supplier>("/api/suppliers") : Promise.resolve([]),
      canKasir ? apiList<Order>("/api/orders") : Promise.resolve([]),
      canGudang ? apiList<Purchase>("/api/purchases") : Promise.resolve([]),
    ]);
    set({ products, customers, suppliers, orders, purchases });
  },

  loadMovements: async (productId) => {
    const rows = await apiList<StockMovement>(
      `/api/products/${productId}/movements`
    );
    set({ movements: rows });
  },

  loadUsers: async () => {
    const users = await apiList<UserRow>("/api/users");
    set({ users });
  },

  // ---------- pelanggan ----------

  addCustomer: (input) =>
    mutate(
      async () => {
        const res = await apiFetch<{ data: Customer }>("/api/customers", { method: "POST", body: input });
        return { customer: res.data };
      },
      async () => set({ customers: await apiList<Customer>("/api/customers") })
    ),

  updateCustomer: (id, patch) =>
    mutate(
      () => apiFetch(`/api/customers/${id}`, { method: "PATCH", body: patch }),
      async () => set({ customers: await apiList<Customer>("/api/customers") })
    ),

  deleteCustomer: (id) =>
    mutate(
      () => apiFetch(`/api/customers/${id}`, { method: "DELETE" }),
      async () => set({ customers: await apiList<Customer>("/api/customers") })
    ),

  // ---------- produk ----------

  addProduct: (input) =>
    mutate(
      async () => {
        const res = await apiFetch<{ data: Product }>("/api/products", { method: "POST", body: input });
        return { product: res.data };
      },
      async () => set({ products: await apiList<Product>("/api/products"), movements: [] })
    ),

  updateProduct: (id, patch) =>
    mutate(
      () => apiFetch(`/api/products/${id}`, { method: "PATCH", body: patch }),
      async () => set({ products: await apiList<Product>("/api/products"), movements: [] })
    ),

  deleteProduct: (id) =>
    mutate(
      () => apiFetch(`/api/products/${id}`, { method: "DELETE" }),
      async () => set({ products: await apiList<Product>("/api/products") })
    ),

  adjustStock: (input) =>
    mutate(
      () => apiFetch<{ diff: number }>(`/api/products/${input.productId}/adjust`, {
        method: "POST",
        body: { newQty: input.newQty, note: input.note },
      }),
      async () => set({ products: await apiList<Product>("/api/products"), movements: [] })
    ),

  // ---------- supplier ----------

  addSupplier: (input) =>
    mutate(
      async () => {
        const res = await apiFetch<{ data: Supplier }>("/api/suppliers", { method: "POST", body: input });
        return { supplier: res.data };
      },
      async () => set({ suppliers: await apiList<Supplier>("/api/suppliers") })
    ),

  updateSupplier: (id, patch) =>
    mutate(
      () => apiFetch(`/api/suppliers/${id}`, { method: "PATCH", body: patch }),
      async () => set({ suppliers: await apiList<Supplier>("/api/suppliers") })
    ),

  deleteSupplier: (id) =>
    mutate(
      () => apiFetch(`/api/suppliers/${id}`, { method: "DELETE" }),
      async () => set({ suppliers: await apiList<Supplier>("/api/suppliers") })
    ),

  // ---------- kasir ----------

  createOrder: (input) =>
    mutate(
      () =>
        apiFetch<{ order: Order }>("/api/orders", {
          method: "POST",
          body: {
            ...input,
            // CartLine (qty) -> skema API PRD (quantity)
            items: input.items.map((l) => ({ productId: l.productId, quantity: l.qty })),
          },
        }),
      async () =>
        set({
          products: await apiList<Product>("/api/products"),
          orders: await apiList<Order>("/api/orders"),
          movements: [],
        })
    ),

  cancelOrder: (orderId) =>
    mutate(
      () => apiFetch<{ order: Order }>(`/api/orders/${orderId}/cancel`, { method: "POST" }),
      async () =>
        set({
          products: await apiList<Product>("/api/products"),
          orders: await apiList<Order>("/api/orders"),
          movements: [],
        })
    ),

  // ---------- pembelian ----------

  createPurchase: (input) =>
    mutate(
      () =>
        apiFetch<{ purchase: Purchase }>("/api/purchases", {
          method: "POST",
          body: {
            ...input,
            // qty -> quantity (skema API PRD)
            items: input.items.map((it) => ({
              productId: it.productId,
              quantity: it.qty,
              cost: it.cost,
            })),
          },
        }),
      async () => set({ purchases: await apiList<Purchase>("/api/purchases") })
    ),

  receivePurchase: (purchaseId) =>
    mutate(
      () => apiFetch<{ purchase: Purchase }>(`/api/purchases/${purchaseId}/receive`, {
        method: "POST",
      }),
      async () =>
        set({
          purchases: await apiList<Purchase>("/api/purchases"),
          products: await apiList<Product>("/api/products"),
          movements: [],
        })
    ),

  // ---------- pengguna (admin) ----------

  addUser: (input) =>
    mutate(
      () => apiFetch<{ user: UserRow }>("/api/users", { method: "POST", body: input }),
      async () => set({ users: await apiList<UserRow>("/api/users") })
    ),

  updateUser: (id, patch) =>
    mutate(
      () => apiFetch(`/api/users/${id}`, { method: "PATCH", body: patch }),
      async () => set({ users: await apiList<UserRow>("/api/users") })
    ),

  deleteUser: (id) =>
    mutate(
      () => apiFetch(`/api/users/${id}`, { method: "DELETE" }),
      async () => set({ users: await apiList<UserRow>("/api/users") })
    ),
}));
