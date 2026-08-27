// Sample data shown when Supabase env vars aren't set yet, so the dashboard
// can be previewed before the backend is wired up.
import type { Member, Playlist, PlaylistTrack, Track } from "./types.ts";

export const demoMembers: Member[] = [
  { id: "ryan", display_name: "Ryan" },
  { id: "jon", display_name: "Jon" },
  { id: "sam", display_name: "Sam" },
  { id: "alex", display_name: "Alex" },
  { id: "charlie", display_name: "Charlie" },
  { id: "jordan", display_name: "Jordan" },
];

export const demoPlaylists: Playlist[] = [
  { id: "pl1", name: "Sunday Bangers - 16/08", week_label: "16/08", week_date: "2026-08-16", spotify_url: null, synced_at: null },
  { id: "pl2", name: "Sunday Bangers - 23/08", week_label: "23/08", week_date: "2026-08-23", spotify_url: null, synced_at: null },
];

export const demoTracks: Track[] = [
  { id: "t1", name: "Demo Song One", artists: "The Examples", album: "Sample Album", album_art: null, duration_ms: 214000, spotify_url: null, genre: "Electronic" },
  { id: "t2", name: "Placeholder Anthem", artists: "Mock Data", album: "Fixtures", album_art: null, duration_ms: 187000, spotify_url: null, genre: "Pop" },
  { id: "t3", name: "Test Pattern", artists: "The Examples", album: "Sample Album", album_art: null, duration_ms: 255000, spotify_url: null, genre: "Rock" },
  { id: "t4", name: "Demo Song One", artists: "The Examples", album: "Sample Album (Deluxe)", album_art: null, duration_ms: 214000, spotify_url: null, genre: "Electronic" },
  { id: "t5", name: "Stand-In Serenade", artists: "Lorem & Ipsum", album: null, album_art: null, duration_ms: 302000, spotify_url: null, genre: "" },
  { id: "t6", name: "Repeat Offender", artists: "Mock Data", album: "Fixtures", album_art: null, duration_ms: 198000, spotify_url: null, genre: null },
];

export const demoLinks: PlaylistTrack[] = [
  { playlist_id: "pl1", position: 0, track_id: "t1", added_by: "ryan", added_at: "2026-08-14T10:00:00Z" },
  { playlist_id: "pl1", position: 1, track_id: "t2", added_by: "jon", added_at: "2026-08-14T11:00:00Z" },
  { playlist_id: "pl1", position: 2, track_id: "t6", added_by: "sam", added_at: "2026-08-14T12:00:00Z" },
  { playlist_id: "pl1", position: 3, track_id: "t5", added_by: "alex", added_at: "2026-08-14T13:00:00Z" },
  { playlist_id: "pl2", position: 0, track_id: "t3", added_by: "charlie", added_at: "2026-08-21T10:00:00Z" },
  { playlist_id: "pl2", position: 1, track_id: "t4", added_by: "jordan", added_at: "2026-08-21T11:00:00Z" },
  { playlist_id: "pl2", position: 2, track_id: "t6", added_by: "ryan", added_at: "2026-08-21T12:00:00Z" },
];
