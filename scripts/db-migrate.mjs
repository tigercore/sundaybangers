#!/usr/bin/env node
// Applies supabase/migrations/*.sql in order, tracking what's been run in a
// _migrations table. Usage: SUPABASE_DB_PASSWORD in .env, then `npm run db:migrate`.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = fileURLToPath(new URL("..", import.meta.url));
try {
  for (const line of readFileSync(`${root}/.env`, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  // rely on shell env
}

const password = process.env.SUPABASE_DB_PASSWORD;
const ref = (process.env.SUPABASE_URL ?? "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!password || !ref) {
  console.error("Need SUPABASE_URL and SUPABASE_DB_PASSWORD in .env");
  process.exit(1);
}

// Direct host is IPv6-only; poolers are IPv4. Try in order.
const candidates = [
  { host: `db.${ref}.supabase.co`, port: 5432, user: "postgres" },
  ...["aws-0-eu-west-2", "aws-1-eu-west-2", "aws-0-eu-west-1", "aws-1-eu-west-1", "aws-0-eu-central-1", "aws-1-eu-central-1"].flatMap(
    (region) => [
      { host: `${region}.pooler.supabase.com`, port: 5432, user: `postgres.${ref}` },
    ],
  ),
];

let client = null;
for (const c of candidates) {
  const attempt = new pg.Client({
    host: c.host,
    port: c.port,
    user: c.user,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    await attempt.connect();
    console.log(`Connected via ${c.host}`);
    client = attempt;
    break;
  } catch (err) {
    console.log(`  ${c.host}: ${err.code ?? err.message}`);
  }
}
if (!client) {
  console.error("Could not connect to the database on any host.");
  process.exit(1);
}

await client.query(
  "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
);
const { rows } = await client.query("select name from _migrations");
const applied = new Set(rows.map((r) => r.name));

const files = readdirSync(`${root}/supabase/migrations`).filter((f) => f.endsWith(".sql")).sort();
for (const file of files) {
  if (applied.has(file)) {
    console.log(`= ${file} (already applied)`);
    continue;
  }
  const sql = readFileSync(`${root}/supabase/migrations/${file}`, "utf8");
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into _migrations (name) values ($1)", [file]);
    await client.query("commit");
    console.log(`✔ ${file}`);
  } catch (err) {
    await client.query("rollback");
    console.error(`✘ ${file}: ${err.message}`);
    await client.end();
    process.exit(1);
  }
}
await client.end();
console.log("Done.");
