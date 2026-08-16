import { AuthGuard } from "@/components/auth-guard";
import { AppShell } from "@/components/app-shell";

// Semua halaman aplikasi dibungkus penjaga sesi (klien) + kerangka navigasi.
export default function ProtectedLayout({ children }: LayoutProps<"/">) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}
