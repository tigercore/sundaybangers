import { useMemo, useState } from "react";
import type { Playlist, SongRow } from "../lib/types.ts";
import { formatTrackTime } from "../lib/format.ts";

interface Props {
  songs: SongRow[];
  playlists: Playlist[];
  colorFor: Map<string, string>;
}

type SortKey = "title" | "album" | "genre" | "addedBy" | "week" | "length";

const SORT_VALUE: Record<SortKey, (s: SongRow) => string | number> = {
  title: (s) => s.track.name.toLowerCase(),
  album: (s) => (s.track.album ?? "").toLowerCase(),
  genre: (s) => (s.track.genre ?? "").toLowerCase(),
  addedBy: (s) => (s.appearances[0]?.addedBy?.display_name ?? "").toLowerCase(),
  week: (s) => s.appearances[0]?.playlist.week_date ?? "",
  length: (s) => s.track.duration_ms,
};

export default function SongTable({ songs, playlists, colorFor }: Props) {
  const [query, setQuery] = useState("");
  const [week, setWeek] = useState("all");
  const [dupesOnly, setDupesOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  // asc -> desc -> back to default order
  const cycleSort = (key: SortKey) =>
    setSort((s) =>
      s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null,
    );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = songs.filter((song) => {
      if (dupesOnly && song.appearances.length < 2 && !song.crossVersionDupe) return false;
      if (week !== "all" && !song.appearances.some((a) => a.playlist.id === week)) return false;
      if (q) {
        const haystack =
          `${song.track.name} ${song.track.artists} ${song.track.album ?? ""} ${song.track.genre ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    if (sort) {
      const value = SORT_VALUE[sort.key];
      rows.sort((a, b) => {
        const va = value(a);
        const vb = value(b);
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
      });
    }
    return rows;
  }, [songs, query, week, dupesOnly, sort]);

  const SortableTh = ({
    label,
    sortKey,
    className,
    title,
  }: {
    label: string;
    sortKey: SortKey;
    className?: string;
    title?: string;
  }) => (
    <th
      className={`sortable${className ? ` ${className}` : ""}${sort?.key === sortKey ? " sorted" : ""}`}
      title={title}
      onClick={() => cycleSort(sortKey)}
    >
      {label}
      <span className="sort-arrow">
        {sort?.key === sortKey ? (sort.dir === 1 ? "▲" : "▼") : ""}
      </span>
    </th>
  );

  return (
    <section className="card">
      <h2>All songs</h2>
      <p className="subtitle">
        Search before adding a track on Spotify — repeats and near-repeats are flagged
      </p>

      <div className="toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Search song, artist, album or genre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="select" value={week} onChange={(e) => setWeek(e.target.value)}>
          <option value="all">All weeks</option>
          {playlists.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <label className="toggle">
          <input
            type="checkbox"
            checked={dupesOnly}
            onChange={(e) => setDupesOnly(e.target.checked)}
          />
          Duplicates only
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="index">#</th>
              <SortableTh label="Title" sortKey="title" />
              <SortableTh label="Album" sortKey="album" />
              <SortableTh label="Genre" sortKey="genre" />
              <SortableTh label="Added by" sortKey="addedBy" />
              <SortableTh label="Week" sortKey="week" />
              <SortableTh label="🕒" sortKey="length" className="num-head" title="Duration" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((song, i) => {
              const isRepeat = song.appearances.length > 1;
              return (
                <tr key={song.track.id}>
                  <td className="index">{i + 1}</td>
                  <td>
                    <div className="title-cell">
                      {song.track.album_art ? (
                        <img
                          className="album-thumb"
                          src={song.track.album_art}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span className="album-thumb placeholder">♪</span>
                      )}
                      <div>
                        <div className="song-name">
                          {song.track.spotify_url ? (
                            <a href={song.track.spotify_url} target="_blank" rel="noreferrer">
                              {song.track.name}
                            </a>
                          ) : (
                            song.track.name
                          )}
                          {isRepeat && (
                            <span className="dupe-badge">played {song.appearances.length}×</span>
                          )}
                          {!isRepeat && song.crossVersionDupe && (
                            <span className="dupe-badge">other version played</span>
                          )}
                        </div>
                        <div className="song-artist">{song.track.artists}</div>
                      </div>
                    </div>
                  </td>
                  <td className="album-cell">{song.track.album ?? "—"}</td>
                  <td>
                    {song.track.genre ? (
                      <span className="genre-chip">{song.track.genre}</span>
                    ) : (
                      <span className="muted-dash">—</span>
                    )}
                  </td>
                  <td>
                    {song.appearances.map((a, i) => (
                      <span className="who" key={i}>
                        <span
                          className="member-dot"
                          style={{
                            background: a.addedBy ? colorFor.get(a.addedBy.id) : "var(--baseline)",
                          }}
                        />
                        {a.addedBy?.display_name ?? "Unknown"}
                      </span>
                    ))}
                  </td>
                  <td>
                    {song.appearances.map((a, i) => (
                      <span className="week-chip" key={i}>
                        {a.playlist.week_label}
                      </span>
                    ))}
                  </td>
                  <td className="num">{formatTrackTime(song.track.duration_ms)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="empty">
            {songs.length === 0
              ? "No songs yet — run a sync."
              : "No matches — safe to add it! 🎉"}
          </p>
        )}
      </div>
    </section>
  );
}
