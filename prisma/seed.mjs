// Loads the demo data in prisma/seed.sql into the database DATABASE_URL points at.
//
//   pnpm db:migrate   (or db:deploy)  — schema first; migrations own it
//   pnpm db:seed
//
// seed.sql is a pg_dump. Its `COPY ... FROM stdin` data blocks can only be run
// by psql, so they are converted to INSERTs here; the dump's own schema DDL is
// ignored. Rows that already exist are skipped, so re-running is harmless.
// Passwords in the dump are already scrypt-hashed (see adapters/security/password.ts).
import { readFileSync } from "node:fs";
import prismaPkg from "./generated/prisma/index.js";

const { PrismaClient } = prismaPkg;
// Foreign-key order: parents before children.
const TABLE_ORDER = ["User", "Vendor", "Product", "Order", "Invoice", "Log"];

const unescapeCopyValue = (raw) =>
  raw === "\\N"
    ? null
    : raw.replace(/\\(.)/g, (_, c) => ({ t: "\t", n: "\n", r: "\r" })[c] ?? c);
const sqlLiteral = (value) => (value === null ? "NULL" : `'${value.replace(/'/g, "''")}'`);

const dump = readFileSync(new URL("./seed.sql", import.meta.url), "utf8");
const inserts = new Map();
for (const [, table, columns, body] of dump.matchAll(
  /^COPY public\."(\w+)" \(([^)]*)\) FROM stdin;\n([\s\S]*?)^\\\.$/gm
)) {
  const rows = body.split("\n").filter(Boolean);
  if (!rows.length) continue;
  const values = rows
    .map((row) => `(${row.split("\t").map(unescapeCopyValue).map(sqlLiteral).join(", ")})`)
    .join(",\n");
  inserts.set(table, `INSERT INTO "${table}" (${columns}) VALUES\n${values}\nON CONFLICT DO NOTHING;`);
}

const prisma = new PrismaClient();
try {
  for (const table of TABLE_ORDER) {
    if (!inserts.has(table)) continue;
    const added = await prisma.$executeRawUnsafe(inserts.get(table));
    console.log(`${table}: ${added} row(s) added`);
  }
} finally {
  await prisma.$disconnect();
}
