import { supabase } from "./supabase.ts";
import type {
  Member,
  MemberTotal,
  Playlist,
  PlaylistTrack,
  SongRow,
  Track,
} from "./types.ts";

export interface Dashboard {
  playlists: Playlist[]; // newest first
  members: Member[];
  songs: SongRow[]; // one row per unique track, newest appearance first
  totals: MemberTotal[]; // sorted by total time desc
  lastSyncedAt: string | null;
  demo: boolean; // true when showing sample data (Supabase not configured)
}

interface RawData {
  playlists: Playlist[];
  members: Member[];
  tracks: Track[];
  links: PlaylistTrack[];
  demo: boolean;
}

/** Key used to catch the same song under different track ids (remaster, single vs album). */
function normKey(track: Track): string {
  const firstArtist = track.artists.split(",")[0] ?? "";
  const name = track.name
    .toLowerCase()
    .replace(/\s*[([-].*(remaster|edit|version|mix|mono|stereo|live|deluxe).*$/i, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${name}::${firstArtist.toLowerCase().trim()}`;
}

async function fetchRaw(): Promise<RawData> {
  if (!supabase) {
    const { demoMembers, demoPlaylists, demoTracks, demoLinks } = await import("./demo.ts");
    return {
      playlists: demoPlaylists,
      members: demoMembers,
      tracks: demoTracks,
      links: demoLinks,
      demo: true,
    };
  }
  const [playlistsRes, membersRes, tracksRes, linksRes] = await Promise.all([
    supabase.from("playlists").select("id, name, week_label, week_date, spotify_url, synced_at"),
    supabase.from("members").select("id, display_name"),
    supabase.from("tracks").select("id, name, artists, album, duration_ms, spotify_url"),
    supabase.from("playlist_tracks").select("playlist_id, position, track_id, added_by, added_at"),
  ]);
  for (const res of [playlistsRes, membersRes, tracksRes, linksRes]) {
    if (res.error) throw new Error(res.error.message);
  }
  return {
    playlists: playlistsRes.data as Playlist[],
    members: membersRes.data as Member[],
    tracks: tracksRes.data as Track[],
    links: linksRes.data as PlaylistTrack[],
    demo: false,
  };
}

export async function loadDashboard(): Promise<Dashboard> {
  const { members, tracks, links, demo, ...raw } = await fetchRaw();
  const playlists = raw.playlists.sort((a, b) =>
    (b.week_date ?? "").localeCompare(a.week_date ?? ""),
  );

  const playlistById = new Map(playlists.map((p) => [p.id, p]));
  const memberById = new Map(members.map((m) => [m.id, m]));
  const trackById = new Map(tracks.map((t) => [t.id, t]));

  // Group appearances per track
  const songByTrackId = new Map<string, SongRow>();
  for (const link of links) {
    const track = trackById.get(link.track_id);
    const playlist = playlistById.get(link.playlist_id);
    if (!track || !playlist) continue;
    let song = songByTrackId.get(track.id);
    if (!song) {
      song = { track, appearances: [], crossVersionDupe: false };
      songByTrackId.set(track.id, song);
    }
    song.appearances.push({
      playlist,
      addedBy: link.added_by ? (memberById.get(link.added_by) ?? null) : null,
      addedAt: link.added_at,
    });
  }

  // Flag same-song-different-id duplicates
  const byNormKey = new Map<string, SongRow[]>();
  for (const song of songByTrackId.values()) {
    const key = normKey(song.track);
    byNormKey.set(key, [...(byNormKey.get(key) ?? []), song]);
  }
  for (const group of byNormKey.values()) {
    if (group.length > 1) for (const song of group) song.crossVersionDupe = true;
  }

  const songs = [...songByTrackId.values()];
  for (const song of songs) {
    song.appearances.sort((a, b) =>
      (b.playlist.week_date ?? "").localeCompare(a.playlist.week_date ?? ""),
    );
  }
  songs.sort((a, b) =>
    (b.appearances[0]?.playlist.week_date ?? "").localeCompare(
      a.appearances[0]?.playlist.week_date ?? "",
    ),
  );

  // Per-member totals across every appearance they added
  const totalsById = new Map<string, MemberTotal>();
  for (const link of links) {
    if (!link.added_by) continue;
    const member = memberById.get(link.added_by);
    const track = trackById.get(link.track_id);
    if (!member || !track) continue;
    let total = totalsById.get(member.id);
    if (!total) {
      total = { member, totalMs: 0, songCount: 0 };
      totalsById.set(member.id, total);
    }
    total.totalMs += track.duration_ms;
    total.songCount += 1;
  }
  const totals = [...totalsById.values()].sort((a, b) => b.totalMs - a.totalMs);

  const lastSyncedAt = playlists.reduce<string | null>(
    (max, p) => (p.synced_at && (!max || p.synced_at > max) ? p.synced_at : max),
    null,
  );

  return { playlists, members, songs, totals, lastSyncedAt, demo };
}
