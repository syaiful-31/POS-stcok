// Konfigurasi toko (nama/alamat/telepon di struk) — murni preferensi lokal
// per perangkat kasir, disimpan di localStorage (tidak ada di skema PRD).

"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ShopInfo } from "./types";
import { SHOP_INFO } from "@/lib/constants";

interface ShopState {
  shopInfo: ShopInfo;
  updateShopInfo: (input: ShopInfo) => void;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      shopInfo: { ...SHOP_INFO },
      updateShopInfo: (input) => set({ shopInfo: { ...input } }),
    }),
    {
      name: "develer-pos-shop",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
