-- Public read-only access; writes only via the service role (sync function),
-- which bypasses RLS.

alter table members enable row level security;
alter table playlists enable row level security;
alter table tracks enable row level security;
alter table playlist_tracks enable row level security;

create policy "public read members"         on members         for select using (true);
create policy "public read playlists"       on playlists       for select using (true);
create policy "public read tracks"          on tracks          for select using (true);
create policy "public read playlist_tracks" on playlist_tracks for select using (true);
