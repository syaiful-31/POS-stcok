"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/use-store";
import { hasAccess } from "@/store/selectors";
import { Skeleton } from "@/components/ui/skeleton";

// Penjaga rute: menunggu bootstrap (cek sesi server via cookie), mengarahkan
// ke /login bila belum ada sesi, dan menyediakan useCanAccess() untuk RBAC.
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const ready = useStore((s) => s.ready);
  const session = useStore((s) => s.session);
  const bootstrap = useStore((s) => s.bootstrap);
  const router = useRouter();
  const booted = useRef(false);

  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      void bootstrap();
    }
  }, [bootstrap]);

  useEffect(() => {
    if (ready && !session) {
      router.replace("/login");
    }
  }, [ready, session, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-96 w-[640px] max-w-[90vw] rounded-xl" />
      </div>
    );
  }

  if (!session) return null; // sedang dialihkan ke /login
  return <>{children}</>;
}

export function useCanAccess(path: string): boolean {
  const session = useStore((s) => s.session);
  return session ? hasAccess(session.role, path) : false;
}
