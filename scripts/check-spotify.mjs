#!/usr/bin/env node
// Sanity check: uses the saved refresh token to list the Sunday Bangers
// playlists Spotify can see. Run with: npm run spotify:check

import { readFileSync } from "node:fs";

try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
} catch {
  // rely on shell env
}

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
  console.error("Missing Spotify env vars — fill in .env and run `npm run spotify:token` first.");
  process.exit(1);
}

const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization:
      "Basic " + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64"),
  },
  body: new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: SPOTIFY_REFRESH_TOKEN,
  }),
});
if (!tokenRes.ok) {
  console.error(`Token refresh failed (${tokenRes.status}):`, await tokenRes.text());
  process.exit(1);
}
const { access_token } = await tokenRes.json();
console.log("✔ Access token OK\n");

const NAME_RE = /^sunday\s+bangers\b.*?(\d{1,2})\s*\/\s*(\d{1,2})/i;
let next = "https://api.spotify.com/v1/me/playlists?limit=50";
const matches = [];
let total = 0;
while (next) {
  const res = await fetch(next, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!res.ok) {
    console.error(`Playlist fetch failed (${res.status}):`, await res.text());
    process.exit(1);
  }
  const page = await res.json();
  for (const p of page.items.filter(Boolean)) {
    total++;
    if (NAME_RE.test(p.name)) matches.push(p);
  }
  next = page.next;
}

console.log(`Playlists on the account: ${total}`);
console.log(`Matching "Sunday Bangers - DD/MM": ${matches.length}\n`);
for (const p of matches) {
  console.log(`  • ${p.name}  (${p.tracks.total} tracks)`);
}
if (matches.length === 0) {
  console.log("  None found — check the playlists are saved/followed on this account.");
}
