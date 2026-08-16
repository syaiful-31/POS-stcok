"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/use-store";
import { ROLE_HOME } from "@/lib/constants";

export function AccessDenied() {
  const router = useRouter();
  const home = useStore((s) => (s.session ? ROLE_HOME[s.session.role] : "/login"));

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Akses ditolak</h2>
        <p className="text-sm text-muted-foreground">
          Role Anda tidak memiliki izin untuk membuka halaman ini.
        </p>
      </div>
      <Button onClick={() => router.replace(home)}>Kembali ke Beranda</Button>
    </div>
  );
}
