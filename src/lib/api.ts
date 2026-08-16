// Helper rute API: otentikasi sesi, penjagaan role (RBAC), dan validasi
// body dengan zod. Kontrak respons sengaja mengikuti mock store frontend:
// sukses  -> { ok: true, ...data }          (list: { ok: true, data: [...] })
// gagal   -> { ok: false, error: "pesan" }  dengan status HTTP 4xx.

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type { z } from "zod";
import { auth } from "@/lib/auth";
import type { Role } from "@/store/types";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export function err(message: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export function ok<T extends Record<string, unknown>>(data: T): NextResponse {
  return NextResponse.json({ ok: true, ...data });
}

export function okList<T>(data: T[]): NextResponse {
  return NextResponse.json({ ok: true, data });
}

// Ambil user dari sesi Better Auth (cookie browser).
export async function getSessionUser(): Promise<AuthUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as { id: string; name: string; email: string; role?: Role };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role ?? "kasir",
  };
}

type GuardResult = { user: AuthUser } | { error: NextResponse };

export async function requireAuth(): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { error: err("Tidak terautentikasi. Silakan login.", 401) };
  return { user };
}

export async function requireRole(roles: Role[]): Promise<GuardResult> {
  const user = await getSessionUser();
  if (!user) return { error: err("Tidak terautentikasi. Silakan login.", 401) };
  if (!roles.includes(user.role)) {
    return { error: err("Akses ditolak untuk role Anda.", 403) };
  }
  return { user };
}

export function isGuardError(r: GuardResult): r is { error: NextResponse } {
  return "error" in r;
}

// Validasi body JSON dengan zod.
export async function parseBody<S extends z.ZodType>(
  schema: S,
  req: Request
): Promise<{ data: z.infer<S> } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { error: err("Body JSON tidak valid.", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const field = first?.path?.join(".") ?? "input";
    return { error: err(`Validasi gagal pada ${field}: ${first?.message ?? "nilai tidak valid"}.`, 400) };
  }
  return { data: parsed.data };
}

// ID unik untuk baris DB.
export function uid(): string {
  return crypto.randomUUID();
}

export function nowISO(): string {
  return new Date().toISOString();
}
