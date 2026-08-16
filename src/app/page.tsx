"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/use-store";
import { ROLE_HOME } from "@/lib/constants";

// Titik masuk: arahkan sesuai sesi — halaman utama per role, atau /login.
export default function Home() {
  const router = useRouter();
  const ready = useStore((s) => s.ready);
  const session = useStore((s) => s.session);
  const bootstrap = useStore((s) => s.bootstrap);
  const booted = useRef(false);

  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      void bootstrap();
    }
  }, [bootstrap]);

  useEffect(() => {
    if (!ready) return;
    router.replace(session ? ROLE_HOME[session.role] : "/login");
  }, [ready, session, router]);

  return null;
}
