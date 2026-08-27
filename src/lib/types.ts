export interface Member {
  id: string;
  display_name: string;
}

export interface Playlist {
  id: string;
  name: string;
  week_label: string;
  week_date: string | null;
  spotify_url: string | null;
  synced_at: string | null;
}

export interface Track {
  id: string;
  name: string;
  artists: string;
  album: string | null;
  album_art: string | null;
  duration_ms: number;
  spotify_url: string | null;
  genre: string | null; // null = not yet resolved, "" = resolved, none found
}

export interface PlaylistTrack {
  playlist_id: string;
  position: number;
  track_id: string;
  added_by: string | null;
  added_at: string | null;
}

/** One appearance of a track in a weekly playlist. */
export interface Appearance {
  playlist: Playlist;
  addedBy: Member | null;
  addedAt: string | null;
}

/** A unique song across all weeks, with everywhere it appeared. */
export interface SongRow {
  track: Track;
  appearances: Appearance[];
  /** true when the same song (normalised title + artist) exists under other track ids too */
  crossVersionDupe: boolean;
}

export interface MemberTotal {
  member: Member;
  totalMs: number;
  songCount: number;
}
