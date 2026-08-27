import { createClient } from "@supabase/supabase-js";
import { getAccessToken, getMyPlaylists, getPlaylistTracks } from "./spotify.ts";

// Matches "Sunday Bangers - 23/08" (case-insensitive, tolerant of spacing)
const PLAYLIST_NAME_RE = /^sunday\s+bangers\b.*?(\d{1,2})\s*\/\s*(\d{1,2})/i;

export interface SyncResult {
  playlistsFound: number;
  playlistsSynced: number;
  playlistsSkipped: number; // snapshot unchanged
  tracksUpserted: number;
  errors: string[]; // playlists that failed (e.g. Spotify 403s one of them)
}

function getDb() {
  const url = Netlify.env.get("SUPABASE_URL");
  const key = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * The playlist name only has DD/MM. Pick the year that puts the date
 * closest to when the first track was actually added.
 */
function resolveWeekDate(day: number, month: number, earliestAddedAt: string | null): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const anchor = earliestAddedAt ? new Date(earliestAddedAt) : new Date();
  const anchorYear = anchor.getUTCFullYear();
  let best: Date | null = null;
  for (const year of [anchorYear - 1, anchorYear, anchorYear + 1]) {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (!best || Math.abs(candidate.getTime() - anchor.getTime()) < Math.abs(best.getTime() - anchor.getTime())) {
      best = candidate;
    }
  }
  return best ? best.toISOString().slice(0, 10) : null;
}

export async function runSync(): Promise<SyncResult> {
  const db = getDb();
  const token = await getAccessToken();

  const all = await getMyPlaylists(token);
  const bangers = all.filter((p) => PLAYLIST_NAME_RE.test(p.name));

  const { data: existing } = await db.from("playlists").select("id, snapshot_id");
  const knownSnapshots = new Map((existing ?? []).map((p) => [p.id, p.snapshot_id]));

  const memberIds = new Set<string>();
  const result: SyncResult = {
    playlistsFound: bangers.length,
    playlistsSynced: 0,
    playlistsSkipped: 0,
    tracksUpserted: 0,
    errors: [],
  };

  for (const playlist of bangers) {
    if (knownSnapshots.get(playlist.id) === playlist.snapshot_id) {
      result.playlistsSkipped++;
      continue;
    }

    let items;
    try {
      items = (await getPlaylistTracks(token, playlist.id)).filter(
        (entry) => entry.item?.id && !entry.is_local, // drop local files / removed tracks
      );
    } catch (err) {
      // One unreadable playlist shouldn't sink the rest of the sync
      const message = `${playlist.name}: ${err instanceof Error ? err.message : String(err)}`;
      console.error("Playlist sync failed —", message);
      result.errors.push(message);
      continue;
    }

    // /users/{id} is forbidden for this app tier, so new members are inserted
    // with their raw id as the name; friendly names are set manually in the
    // members table and never overwritten by the sync.
    for (const entry of items) {
      const userId = entry.added_by?.id;
      if (userId) memberIds.add(userId);
    }

    const match = playlist.name.match(PLAYLIST_NAME_RE)!;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const earliestAddedAt = items.reduce<string | null>(
      (min, entry) => (min === null || entry.added_at < min ? entry.added_at : min),
      null,
    );

    const memberRows = [...memberIds].map((id) => ({
      id,
      display_name: id,
      updated_at: new Date().toISOString(),
    }));
    if (memberRows.length > 0) {
      const { error } = await db
        .from("members")
        .upsert(memberRows, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw new Error(`members upsert: ${error.message}`);
    }

    const { error: playlistError } = await db.from("playlists").upsert({
      id: playlist.id,
      name: playlist.name,
      week_label: `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`,
      week_date: resolveWeekDate(day, month, earliestAddedAt),
      snapshot_id: playlist.snapshot_id,
      spotify_url: playlist.external_urls.spotify,
      synced_at: new Date().toISOString(),
    });
    if (playlistError) throw new Error(`playlists upsert: ${playlistError.message}`);

    const trackRows = items.map((entry) => ({
      id: entry.item!.id!,
      name: entry.item!.name,
      artists: entry.item!.artists.map((a) => a.name).join(", "),
      album: entry.item!.album?.name ?? null,
      duration_ms: entry.item!.duration_ms,
      spotify_url: entry.item!.external_urls.spotify ?? null,
    }));
    if (trackRows.length > 0) {
      const { error } = await db.from("tracks").upsert(trackRows, { onConflict: "id" });
      if (error) throw new Error(`tracks upsert: ${error.message}`);
    }

    // Replace the playlist's rows wholesale so removals/reorders are reflected
    const { error: deleteError } = await db
      .from("playlist_tracks")
      .delete()
      .eq("playlist_id", playlist.id);
    if (deleteError) throw new Error(`playlist_tracks delete: ${deleteError.message}`);

    const linkRows = items.map((entry, position) => ({
      playlist_id: playlist.id,
      position,
      track_id: entry.item!.id!,
      added_by: entry.added_by?.id ?? null,
      added_at: entry.added_at,
    }));
    if (linkRows.length > 0) {
      const { error } = await db.from("playlist_tracks").insert(linkRows);
      if (error) throw new Error(`playlist_tracks insert: ${error.message}`);
    }

    result.playlistsSynced++;
    result.tracksUpserted += trackRows.length;
  }

  return result;
}
