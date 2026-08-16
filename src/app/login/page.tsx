"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/store/use-store";
import { APP_NAME, APP_TAGLINE, ROLE_HOME } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const ready = useStore((s) => s.ready);
  const session = useStore((s) => s.session);
  const bootstrap = useStore((s) => s.bootstrap);
  const login = useStore((s) => s.login);
  const booted = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // bootstrap sesi: bila sudah login (cookie valid) -> langsung beranda
  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      void bootstrap();
    }
  }, [bootstrap]);

  useEffect(() => {
    if (ready && session) router.replace(ROLE_HOME[session.role]);
  }, [ready, session, router]);

  const submit = async (creds?: { email: string; password: string }) => {
    const target = creds ?? { email, password };
    if (!target.email.trim() || !target.password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await login(target.email, target.password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(`Selamat datang, ${result.user.name}!`);
    router.replace(ROLE_HOME[result.user.role]);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Masuk</CardTitle>
            <CardDescription>
              Gunakan akun Anda untuk mengakses aplikasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@develer.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                autoComplete="current-password"
              />
            </div>
            {error ? (
              <p className="text-sm font-medium text-destructive">{error}</p>
            ) : null}
            <Button
              className="w-full"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Masuk
            </Button>
          </CardContent>
        </Card>

        <CardFooter className="block p-0 text-center text-xs text-muted-foreground">
          Belum punya akun? Hubungi administrator toko Anda.
        </CardFooter>
      </div>
    </div>
  );
}
