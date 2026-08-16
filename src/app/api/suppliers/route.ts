import { like, or } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { ok, okList, requireRole, parseBody, isGuardError, uid, nowISO } from "@/lib/api";
import { toSupplier } from "@/lib/domain";

// GET /api/suppliers?q= — daftar supplier (admin/gudang)
export async function GET(req: NextRequest) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const rows = q
    ? await db
        .select()
        .from(schema.suppliers)
        .where(or(like(schema.suppliers.name, `%${q}%`), like(schema.suppliers.phone, `%${q}%`)))
        .all()
    : await db.select().from(schema.suppliers).orderBy(schema.suppliers.name).all();

  return okList(rows.map(toSupplier));
}

const supplierSchema = z.object({
  name: z.string().min(1),
  phone: z.string().default(""),
  address: z.string().default(""),
});

// POST /api/suppliers — tambah supplier (admin/gudang)
export async function POST(req: NextRequest) {
  const guard = await requireRole(["admin", "gudang"]);
  if (isGuardError(guard)) return guard.error;
  const body = await parseBody(supplierSchema, req);
  if ("error" in body) return body.error;

  const supplier = {
    id: uid(),
    name: body.data.name.trim(),
    phone: body.data.phone.trim(),
    address: body.data.address.trim(),
    createdAt: nowISO(),
  };
  await db.insert(schema.suppliers).values(supplier).run();
  return ok({ data: toSupplier(supplier) });
}
