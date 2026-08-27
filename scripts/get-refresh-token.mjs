#!/usr/bin/env node
// One-time helper: obtains a Spotify refresh token for the account that owns
// the Sunday Bangers playlists. Run `npm run spotify:token`, log in in the
// browser, then paste the printed refresh token into your env vars.
//
// Requires SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in the environment or
// in a local .env file, and the app's redirect URI list must include:
//   http://127.0.0.1:8888/callback

import http from "node:http";
import { exec } from "node:child_process";
import { readFileSync } from "node:fs";
import crypto from "node:crypto";

// Tiny .env loader so this script has no dependencies
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
} catch {
  // no .env file — rely on the shell environment
}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET (env or .env) first.");
  process.exit(1);
}

const REDIRECT_URI = "http://127.0.0.1:8888/callback";
const SCOPES = "playlist-read-private playlist-read-collaborative";
const state = crypto.randomBytes(16).toString("hex");

const authUrl = new URL("https://accounts.spotify.com/authorize");
authUrl.search = new URLSearchParams({
  response_type: "code",
  client_id: CLIENT_ID,
  scope: SCOPES,
  redirect_uri: REDIRECT_URI,
  state,
}).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== "/callback") {
    res.writeHead(404).end();
    return;
  }
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error || !code || url.searchParams.get("state") !== state) {
    res.writeHead(400, { "Content-Type": "text/plain" }).end(`Auth failed: ${error ?? "bad state"}`);
    console.error("Authorization failed:", error ?? "state mismatch");
    process.exit(1);
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  const data = await tokenRes.json();

  if (!data.refresh_token) {
    res.writeHead(500, { "Content-Type": "text/plain" }).end("Token exchange failed — see terminal.");
    console.error("Token exchange failed:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  res.writeHead(200, { "Content-Type": "text/html" }).end(
    "<h1>Done ✔</h1><p>You can close this tab — the refresh token is in your terminal.</p>",
  );
  console.log("\nYour refresh token (add as SPOTIFY_REFRESH_TOKEN in .env and Netlify):\n");
  console.log(data.refresh_token + "\n");
  server.close();
  process.exit(0);
});

server.listen(8888, "127.0.0.1", () => {
  console.log("Opening Spotify login…\nIf the browser doesn't open, visit:\n" + authUrl.href + "\n");
  exec(`open "${authUrl.href}"`);
});
