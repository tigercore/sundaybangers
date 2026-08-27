# 🎵 Sunday Bangers

Dashboard for the weekly collaborative Spotify playlist club. Every week one of
the six members creates a playlist named `Sunday Bangers - DD/MM` and everyone
adds 3 songs in the Spotify app. This app mirrors those playlists into Supabase
and shows:

- **All songs ever added**, searchable — check before you add, repeats are flagged
  (including "same song, different version")
- **Total song time per member** leaderboard
- Week filter, per-week playlists, stats

**Stack:** Vite + React + TypeScript · Supabase (Postgres) · Netlify (hosting +
functions) — same shape as Happy Squad.

## How it works

```
Spotify API ──(daily cron + "Sync now" button)──▶ Netlify Function ──▶ Supabase
                                                                          │
                                              React dashboard ◀──(anon, read-only RLS)
```

Only **one** Spotify account (the one that owns/follows all the weekly
playlists) ever authenticates. Everyone else's songs are attributed via the
`added_by` field Spotify stores on collaborative playlist tracks. Songs continue
to be added manually in the Spotify app — this dashboard is read-only.

The sync function ([netlify/functions/_shared/sync.ts](netlify/functions/_shared/sync.ts)):

1. Lists the account's playlists, keeps those matching `Sunday Bangers … DD/MM`
2. Skips playlists whose `snapshot_id` hasn't changed since last sync
3. Pulls tracks with `added_by`/`added_at`, resolves member display names
4. Upserts into `playlists` / `tracks` / `members` / `playlist_tracks`

It runs daily ([sync-cron.ts](netlify/functions/sync-cron.ts)) and on demand via
`POST /api/sync` ([sync.ts](netlify/functions/sync.ts), the dashboard's
"Sync now" button).

## Setup (one-time)

Until env vars are configured the dashboard runs on built-in **sample data**, so
`npm install && npm run dev` works immediately.

### 1. Spotify app

1. Go to <https://developer.spotify.com/dashboard> (log in with the account that
   has all the Sunday Bangers playlists) → **Create app**
2. Redirect URI: `http://127.0.0.1:8888/callback` · API: **Web API**
3. Copy the **Client ID** and **Client Secret** into `.env`
   (copy [.env.example](.env.example) → `.env`)
4. Run the one-time auth:

```bash
npm run spotify:token
```

   Log in in the browser, then paste the printed token into `.env` as
   `SPOTIFY_REFRESH_TOKEN`. (The app can stay in Development mode — only this
   one account needs access.)

### 2. Supabase

1. Create a project at <https://supabase.com/dashboard>
2. Run the two files in [supabase/migrations](supabase/migrations) in the SQL
   editor (in order)
3. From **Project Settings → API**, copy into `.env`:
   - Project URL → `VITE_SUPABASE_URL` **and** `SUPABASE_URL`
   - `anon` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-side only!)

### 3. Netlify

1. Push the repo to GitHub, then in Netlify: **Add new project → Import from
   Git** (build settings are picked up from [netlify.toml](netlify.toml))
2. Add all the variables from `.env` under **Project configuration →
   Environment variables**
3. Deploy. The daily sync starts working on the first published deploy; press
   **Sync now** in the dashboard for the initial backfill.

## Local development

```bash
netlify dev
```

Runs Vite + the functions together (the "Sync now" button works locally).
Plain `npm run dev` also works for UI-only work (sample data if no `.env`).

To invoke the scheduled sync locally:

```bash
netlify functions:invoke sync-cron
```

## Notes & gotchas

- **Playlist naming matters**: syncing matches `/^sunday bangers/i` plus a
  `DD/MM` anywhere in the name. `Sunday Bangers - 23/08` ✔
- The year isn't in the playlist name; it's inferred from when the first track
  was added, so week ordering stays correct across New Year.
- Spotify local files (not from Spotify's catalog) are skipped — they have no
  track id or reliable duration.
- `/api/sync` is unauthenticated but harmless: it only refreshes the mirror of
  data that's already publicly readable.
