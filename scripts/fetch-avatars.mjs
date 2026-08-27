#!/usr/bin/env node
// Downloads member avatars from their public Spotify profile pages
// (og:image meta tag — the API's /users endpoint is forbidden for this app
// tier) and self-hosts them in public/avatars/{id}.jpg. Facebook-linked
// avatar URLs expire, so we snapshot the images rather than hotlink.
// Re-run whenever someone changes their picture: node scripts/fetch-avatars.mjs
// (requires: pip3 install pillow — used via python3 for the square crop)

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
for (const line of readFileSync(`${root}/.env`, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const members = await (
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/members?select=id,display_name`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
).json();

mkdirSync(`${root}/public/avatars`, { recursive: true });
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";

for (const { id, display_name } of members) {
  try {
    const html = await (
      await fetch(`https://open.spotify.com/user/${encodeURIComponent(id)}`, {
        headers: { "User-Agent": UA },
      })
    ).text();
    const raw = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    if (!raw) {
      console.log(`- ${display_name}: no avatar on profile`);
      continue;
    }
    const url = raw.replaceAll("&amp;", "&");
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) {
      console.log(`- ${display_name}: image fetch failed (${res.status})`);
      continue;
    }
    const tmp = `${root}/public/avatars/.${id}.tmp`;
    writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
    // centre-crop square + resize to 128px, always output jpg
    execFileSync("python3", [
      "-c",
      `
from PIL import Image
img = Image.open("${tmp}").convert("RGB")
w, h = img.size
s = min(w, h)
img = img.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
img.resize((128, 128), Image.LANCZOS).save("${root}/public/avatars/${id}.jpg", quality=88)
`,
    ]);
    execFileSync("rm", [tmp]);
    console.log(`✔ ${display_name} -> public/avatars/${id}.jpg`);
  } catch (err) {
    console.log(`- ${display_name}: ${err.message}`);
  }
}
