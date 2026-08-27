// Minimal Spotify Web API client using a long-lived refresh token.
// Only Ryan's account ever authenticates; everyone else's additions are
// visible via `added_by` on the playlist items.
//
// NOTE: apps created after Spotify's 2025/26 API changes get a revised schema:
// playlist contents live at /playlists/{id}/items (the old /tracks endpoint
// returns 403), each entry nests the track under `item` instead of `track`,
// and /users/{id} lookups are forbidden (so display names are managed
// manually in the members table).

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

export interface SpotifyPlaylist {
  id: string;
  name: string;
  snapshot_id: string;
  external_urls: { spotify: string };
}

export interface SpotifyPlaylistItem {
  added_at: string;
  added_by: { id: string } | null;
  is_local?: boolean;
  item: {
    id: string | null; // null for local files
    name: string;
    duration_ms: number;
    album: { name: string; images?: { url: string; width: number }[] } | null;
    artists: { name: string }[];
    external_urls: { spotify?: string };
  } | null;
}

function env(name: string): string {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function getAccessToken(): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          `${env("SPOTIFY_CLIENT_ID")}:${env("SPOTIFY_CLIENT_SECRET")}`,
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: env("SPOTIFY_REFRESH_TOKEN"),
    }),
  });
  if (!res.ok) {
    throw new Error(`Spotify token refresh failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function apiGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After") ?? "1");
    await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
    return apiGet(token, path);
  }
  if (!res.ok) {
    throw new Error(`Spotify GET ${path} failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

/** All playlists on the authed account (paginated). */
export async function getMyPlaylists(token: string): Promise<SpotifyPlaylist[]> {
  const playlists: SpotifyPlaylist[] = [];
  let next: string | null = "/me/playlists?limit=50";
  while (next) {
    const page: { items: SpotifyPlaylist[]; next: string | null } = await apiGet(token, next);
    playlists.push(...page.items.filter(Boolean));
    next = page.next ? page.next.replace(API_BASE, "") : null;
  }
  return playlists;
}

/** All items in a playlist, with who added them (paginated). */
export async function getPlaylistTracks(
  token: string,
  playlistId: string,
): Promise<SpotifyPlaylistItem[]> {
  const fields =
    "items(added_at,added_by.id,is_local,item(id,name,duration_ms,album(name,images),artists(name),external_urls(spotify))),next";
  const items: SpotifyPlaylistItem[] = [];
  let next: string | null =
    `/playlists/${playlistId}/items?limit=100&fields=${encodeURIComponent(fields)}`;
  while (next) {
    const page: { items: SpotifyPlaylistItem[]; next: string | null } = await apiGet(token, next);
    items.push(...page.items);
    next = page.next ? page.next.replace(API_BASE, "") : null;
  }
  return items;
}
