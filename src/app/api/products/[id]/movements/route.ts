import { eq, desc } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import * as authSchema from "@/db/auth-schema";
import { okList, requireAuth, isGuardError } from "@/lib/api";
import { toMovement } from "@/lib/domain";

// GET /api/products/[id]/movements — log audit pergerakan stok produk.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/products/[id]/movements">) {
  const guard = await requireAuth();
  if (isGuardError(guard)) return guard.error;
  const { id } = await ctx.params;

  const rows = await db
    .select()
    .from(schema.stockMovements)
    .where(eq(schema.stockMovements.productId, id))
    .orderBy(desc(schema.stockMovements.createdAt))
    .all();

  const users = await db.select().from(authSchema.user).all();
  const userName = new Map(users.map((u) => [u.id, u.name]));

  return okList(rows.map((r) => toMovement(r, userName.get(r.userId))));
}
