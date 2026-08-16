"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { AccessDenied } from "@/components/access-denied";
import { useCanAccess } from "@/components/auth-guard";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useStore } from "@/store/use-store";
import type { Customer } from "@/store/types";
import { customerStats } from "@/store/selectors";
import { formatIDR } from "@/lib/format";

export default function CustomersPage() {
  const canAccess = useCanAccess("/customers");
  const state = useStore();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.customers
      .filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
      )
      .map((c) => ({ customer: c, stats: customerStats(state, c.id) }))
      .sort((a, b) => b.stats.totalSpent - a.stats.totalSpent);
  }, [state, query]);

  if (!canAccess) return <AccessDenied />;

  const confirmDelete = async () => {
    if (!deleting) return;
    const result = await state.deleteCustomer(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
    } else {
      toast.success(`Pelanggan "${deleting.name}" dihapus.`);
    }
    setDeleting(null);
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div>
      <PageHeader
        title="Pelanggan"
        description="Profil pelanggan beserta total belanja kumulatif."
      >
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pelanggan
        </Button>
      </PageHeader>

      <div className="relative mb-4 w-full max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari nama / telepon…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-white pl-9"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Belum ada pelanggan"
          description="Tambahkan pelanggan untuk mulai mencatat pesanan mereka."
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Pelanggan
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead className="hidden md:table-cell">Alamat</TableHead>
                <TableHead className="text-right">Total Belanja</TableHead>
                <TableHead className="text-right">Transaksi</TableHead>
                <TableHead className="w-28 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ customer, stats }) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-emerald-100 text-xs text-emerald-700">
                          {initials(customer.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.phone || "-"}
                  </TableCell>
                  <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">
                    {customer.address || "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatIDR(stats.totalSpent)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {stats.orderCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/customers/${customer.id}`}
                        aria-label={`Detail ${customer.name}`}
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(customer);
                          setFormOpen(true);
                        }}
                        aria-label={`Edit ${customer.name}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleting(customer)}
                        aria-label={`Hapus ${customer.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editing}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus pelanggan &ldquo;{deleting?.name}&rdquo;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Pelanggan dengan riwayat pesanan tidak dapat dihapus. Tindakan
              ini tidak dapat diurungkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {rows.length === 0 ? null : (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <UserRound className="h-3.5 w-3.5" />
          Total belanja hanya menghitung pesanan berstatus Selesai.
        </p>
      )}
    </div>
  );
}
