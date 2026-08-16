import { like, or } from "drizzle-orm";
import { z } from "zod";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { ok, okList, requireRole, parseBody, isGuardError, uid, nowISO } from "@/lib/api";
import { toCustomer } from "@/lib/domain";

// GET /api/customers?q= — daftar pelanggan (admin/kasir)
export async function GET(req: NextRequest) {
  const guard = await requireRole(["admin", "kasir"]);
  if (isGuardError(guard)) return guard.error;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const rows = q
    ? await db
        .select()
        .from(schema.customers)
        .where(or(like(schema.customers.name, `%${q}%`), like(schema.customers.phone, `%${q}%`)))
        .all()
    : await db.select().from(schema.customers).orderBy(schema.customers.name).all();

  return okList(rows.map(toCustomer));
}

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().default(""),
  address: z.string().default(""),
});

// POST /api/customers — tambah pelanggan (admin/kasir)
export async function POST(req: NextRequest) {
  const guard = await requireRole(["admin", "kasir"]);
  if (isGuardError(guard)) return guard.error;
  const body = await parseBody(customerSchema, req);
  if ("error" in body) return body.error;

  const customer = {
    id: uid(),
    name: body.data.name.trim(),
    phone: body.data.phone.trim(),
    address: body.data.address.trim(),
    createdAt: nowISO(),
  };
  await db.insert(schema.customers).values(customer).run();
  return ok({ data: toCustomer(customer) });
}
