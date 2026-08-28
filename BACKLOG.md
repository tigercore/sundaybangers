# Backlog

## Leaderboard attribution — decide with the group

For the first 18 weeks (5 Oct 2025 → 1 Mar 2026) Preeceman's 3 songs were
added on his behalf, almost always by Burke (twice by MrSalim), so Spotify
credits them to the wrong person. From 8 Mar 2026 every week is a clean
3-3-3-3-3-3. Spotify has no record of who *picked* those early songs, so it
can't be fixed from the API. Options:

- [ ] **Manual re-attribution**: add a `picked_by` override column defaulting
      to Spotify's `added_by`; someone identifies which 3 of Burke's 6 were
      Preeceman's for each old week (dashboard could get a "claim/assign" mode)
- [ ] **Fair-era leaderboard**: totals from 8 Mar 2026 onward (all-time still
      shown), since that's when attribution became trustworthy
- [ ] **Leave as-is**: leaderboard measures "who pressed the button"

## Play-count leaderboard — awaiting group buy-in (feasibility PROVEN)

Track plays of club songs *from the Sunday Bangers playlists* (not global
popularity) and credit the member who picked each song: "whose picks are
the most popular". Verified working on 28 Aug 2026 with Ryan's account:
the recently-played endpoint returns plays on our restricted app tier AND
stamps each play with its source playlist (`context.uri`), so filtering to
club-playlist plays is reliable.

Requirements / decisions:

- [ ] Every member does a one-time Spotify login (scope
      `user-read-recently-played`) — needs each member's Spotify account
      email added to the app's User Management allowlist first
- [ ] Decide: do self-plays of your own picks count? (Recommended: no —
      otherwise gameable by looping your own songs)
- [ ] Optional bonus stat: club songs played *outside* the playlists
      (someone loved a pick enough to play it from their own library)

Build plan (once emails are in): `/api/join` + `/api/callback` Netlify
functions storing per-member refresh tokens in a service-role-only table;
hourly scheduled collector polling each member's last 50 plays into a
`plays` table (going-forward only — no historical backfill exists); new
"Most played picks" tab on Club stats. Note: member tokens expire after
180 days (app setting), so everyone re-approves twice a year.

## Ideas not in the initial build

- [ ] Per-week page: show each week's playlist as Spotify renders it (order, art)
- [ ] More leaderboards: longest single song, shortest, most artists repeated,
      average song length per member
- [ ] Artist stats: most-added artists across the club
- [ ] "On this week last year" throwback panel
- [ ] Genre breakdown per member (Spotify artist genres)
- [ ] Highlight who hasn't added their 3 songs yet this week
- [ ] Notify (email/WhatsApp link) when someone adds a duplicate
- [ ] Auth-protect the dashboard if the group wants it private (Netlify Identity)
