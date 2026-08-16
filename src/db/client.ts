import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";

// Klien SQLite (better-sqlite3, sinkron & transaksional) via Drizzle.
// Path database: DATABASE_URL "file:./data/pos.db" relatif terhadap cwd proyek.
const url = process.env.DATABASE_URL ?? "file:./data/pos.db";
const dbPath = url.replace(/^file:/, "");

if (dbPath !== ":memory:") {
  fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
}

const sqlite = new Database(dbPath);
// wajib untuk integritas FK di SQLite
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema: { ...schema, ...authSchema } });

export function pingDatabase(): boolean {
  db.run(sql`SELECT 1`);
  return true;
}
