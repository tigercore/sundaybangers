// One-off: null out playlist snapshot_ids so the next sync re-pulls every
// playlist (needed to backfill the new album_art column).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
for (const line of readFileSync("/Users/ryan/Projects 2026/Bangers/.env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { error, count } = await db
  .from("playlists")
  .update({ snapshot_id: null }, { count: "exact" })
  .not("id", "is", null);
if (error) throw error;
console.log(`Cleared snapshot_id on ${count} playlists`);
