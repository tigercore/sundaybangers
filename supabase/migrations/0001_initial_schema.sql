-- Sunday Bangers: mirror of the weekly collaborative Spotify playlists.
-- All data is written by the sync Netlify function (service role) and
-- read-only for the dashboard (anon key).

create table members (
  id           text primary key,          -- Spotify user id
  display_name text,
  updated_at   timestamptz not null default now()
);

create table playlists (
  id          text primary key,           -- Spotify playlist id
  name        text not null,              -- e.g. "Sunday Bangers - 23/08"
  week_label  text not null,              -- "23/08"
  week_date   date,                       -- resolved full date (year inferred)
  snapshot_id text,                       -- Spotify snapshot; skip resync when unchanged
  spotify_url text,
  synced_at   timestamptz
);

create table tracks (
  id          text primary key,           -- Spotify track id
  name        text not null,
  artists     text not null,              -- artist names, ", "-joined
  album       text,
  duration_ms integer not null,
  spotify_url text
);

create table playlist_tracks (
  playlist_id text not null references playlists (id) on delete cascade,
  position    integer not null,           -- 0-based position within the playlist
  track_id    text not null references tracks (id),
  added_by    text references members (id),
  added_at    timestamptz,
  primary key (playlist_id, position)
);

create index playlist_tracks_track_idx on playlist_tracks (track_id);
create index playlist_tracks_added_by_idx on playlist_tracks (added_by);
create index playlists_week_date_idx on playlists (week_date);
