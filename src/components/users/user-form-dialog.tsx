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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore, type UserRow } from "@/store/use-store";
import type { Role } from "@/store/types";
import { ROLE_LABELS } from "@/lib/constants";

const ROLE_ORDER: Role[] = ["admin", "kasir", "gudang"];

// Tambah/edit pengguna (khusus admin). Password kosong saat edit
// berarti password lama tetap dipakai.
export function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRow | null;
}) {
  const addUser = useStore((s) => s.addUser);
  const updateUser = useStore((s) => s.updateUser);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("kasir");
  const [password, setPassword] = useState("");

  // reset field saat dialog dibuka (pola reset-state-di-render)
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(user?.name ?? "");
      setEmail(user?.email ?? "");
      setRole(user?.role ?? "kasir");
      setPassword("");
    }
  }

  const submit = async () => {
    if (user) {
      const result = await updateUser(user.id, {
        name,
        email,
        role,
        password: password || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`User "${name.trim()}" diperbarui.`);
    } else {
      const result = await addUser({ name, email, password, role });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`User "${name.trim()}" ditambahkan.`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{user ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle>
          <DialogDescription>
            {user
              ? "Perbarui data akun. Kosongkan password jika tidak diubah."
              : "Akun baru langsung bisa login ke aplikasi."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Nama *</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Budi Hartono"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-email">Email *</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@develer.id"
            />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <Select
              value={role}
              onValueChange={(v) => v && setRole(v as Role)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_ORDER.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">
              {user ? "Password Baru (opsional)" : "Password *"}
            </Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={user ? "Kosongkan jika tidak diubah" : "min. 8 karakter"}
              autoComplete="new-password"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!name.trim() || !email.trim() || (!user && password.length < 8)}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
