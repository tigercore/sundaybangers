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
