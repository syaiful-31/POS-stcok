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
import { useStore } from "@/store/use-store";
import type { Supplier } from "@/store/types";

// Tambah/edit supplier.
export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}) {
  const addSupplier = useStore((s) => s.addSupplier);
  const updateSupplier = useStore((s) => s.updateSupplier);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // reset field saat dialog dibuka (pola reset-state-di-render)
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(supplier?.name ?? "");
      setPhone(supplier?.phone ?? "");
      setAddress(supplier?.address ?? "");
    }
  }

  const submit = async () => {
    if (!name.trim()) return;
    const result =
      supplier
        ? await updateSupplier(supplier.id, {
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
          })
        : await addSupplier({
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
          });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {supplier ? "Edit Supplier" : "Tambah Supplier"}
          </DialogTitle>
          <DialogDescription>
            {supplier
              ? "Perbarui data kontak supplier."
              : "Supplier baru bisa langsung dipakai pada dokumen pembelian."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sup-name">Nama Supplier *</Label>
            <Input
              id="sup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PT Sinar Mas Distribusi"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-phone">Telepon</Label>
            <Input
              id="sup-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="022-xxxx-xxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sup-address">Alamat</Label>
            <Textarea
              id="sup-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. …"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={() => void submit()} disabled={!name.trim()}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
