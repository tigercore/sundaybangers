#!/usr/bin/env node
// Runs the sync locally (same code the Netlify functions use).
// Handy for the initial 42-week backfill and debugging: npm run sync
// Requires Node 22.6+ (imports the .ts module directly via type stripping).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
try {
  for (const line of readFileSync(`${root}/.env`, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  // rely on shell env
}

globalThis.Netlify = { env: { get: (name) => process.env[name] } };

const { runSync } = await import("../netlify/functions/_shared/sync.ts");
const started = Date.now();
// --genres-all: resolve every pending genre in one throttled run (backfill)
const options = process.argv.includes("--genres-all")
  ? { genreLimit: 999999, genreDelayMs: 3200 }
  : {};
const result = await runSync(options);
console.log(`Sync finished in ${((Date.now() - started) / 1000).toFixed(1)}s:`);
console.log(JSON.stringify(result, null, 2));
