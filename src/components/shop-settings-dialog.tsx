"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useShopStore } from "@/store/use-shop-store";

// Pengaturan toko (khusus admin): nama toko, alamat, dan telepon yang
// tercetak pada struk. Tersimpan di store -> localStorage.
export function ShopSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const shopInfo = useShopStore((s) => s.shopInfo);
  const updateShopInfo = useShopStore((s) => s.updateShopInfo);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // reset field saat dialog dibuka (pola reset-state-di-render)
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(shopInfo.name);
      setAddress(shopInfo.address);
      setPhone(shopInfo.phone);
    }
  }

  const submit = () => {
    if (!name.trim()) {
      toast.error("Nama toko wajib diisi.");
      return;
    }
    updateShopInfo({
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
    });
    toast.success("Pengaturan toko disimpan.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pengaturan Toko</DialogTitle>
          <DialogDescription>
            Informasi ini tercetak pada struk belanja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shop-name">Nama Toko *</Label>
            <Input
              id="shop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Develer Distribusi"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop-address">Alamat</Label>
            <Textarea
              id="shop-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. …"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop-phone">Telepon</Label>
            <Input
              id="shop-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(022) xxxx-xxxx"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
