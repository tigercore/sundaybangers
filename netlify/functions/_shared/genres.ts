// Genre lookup via the iTunes Search API — no auth needed. Spotify stripped
// genre data from artist objects for this app tier, so this is the source.
// Returns: a genre name, "" when iTunes has no match (resolved, none found),
// or null on a transient failure (rate limit etc) so the track stays pending.

const NOISE_RE = /\s*[-([–].*?(remaster|edit|version|mix|mono|stereo|live|deluxe|single|feat).*$/i;

interface ItunesResult {
  artistName?: string;
  primaryGenreName?: string;
}

export async function lookupGenre(artists: string, trackName: string): Promise<string | null> {
  const artist = (artists.split(",")[0] ?? "").trim();
  const name = trackName.replace(NOISE_RE, "").trim() || trackName;
  const url =
    "https://itunes.apple.com/search?media=music&entity=song&limit=5&term=" +
    encodeURIComponent(`${artist} ${name}`);

  let results: ItunesResult[];
  try {
    const res = await fetch(url);
    if (!res.ok) return null; // rate limited or transient — retry next sync
    results = ((await res.json()) as { results?: ItunesResult[] }).results ?? [];
  } catch {
    return null;
  }

  // Prefer a result whose artist actually matches
  const wanted = artist.toLowerCase();
  const best =
    results.find((r) => {
      const got = r.artistName?.toLowerCase() ?? "";
      return got.includes(wanted) || wanted.includes(got);
    }) ?? results[0];
  return best?.primaryGenreName ?? "";
}
