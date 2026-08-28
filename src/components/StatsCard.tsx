import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { Member, MemberTotal, SongRow } from "../lib/types.ts";
import { formatTotalTime, formatTrackTime } from "../lib/format.ts";

type Tab = "time" | "count" | "topgenre" | "genres" | "artists" | "songs";

interface Props {
  totals: MemberTotal[];
  colorFor: Map<string, string>;
  songs: SongRow[];
}

const TABS: { id: Tab; label: string }[] = [
  { id: "time", label: "Song time" },
  { id: "count", label: "Song count" },
  { id: "topgenre", label: "Top genre" },
  { id: "genres", label: "Top genres" },
  { id: "artists", label: "Top artists" },
  { id: "songs", label: "Longest songs" },
];

const SUBTITLES: Record<Tab, string> = {
  time: "Across every week, based on who added each track",
  count: "Songs added per member, across every week",
  topgenre: "Each member's most-added genre",
  genres: "Unique songs per genre, across every week",
  artists: "Unique songs per artist (primary artist credit)",
  songs: "The longest bangers ever submitted",
};

const PAGE_SIZE = 10;

interface RankedRow {
  key: string;
  label: string;
  value: number;
  display: string;
  avg?: string; // average song duration for this group
}

/** Self-hosted Spotify avatar, falling back to a coloured initial. */
function Avatar({ member, color }: { member: Member; color?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="avatar avatar-fallback" style={{ background: color }}>
        {member.display_name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      className="avatar"
      src={`/avatars/${member.id}.jpg`}
      alt=""
      onError={() => setFailed(true)}
    />
  );
}

/** Count unique songs by a key (with average duration), sorted descending. */
function rank(songs: SongRow[], keyOf: (s: SongRow) => string | null): RankedRow[] {
  const groups = new Map<string, { count: number; totalMs: number }>();
  for (const song of songs) {
    const key = keyOf(song);
    if (!key) continue;
    const group = groups.get(key) ?? { count: 0, totalMs: 0 };
    group.count += 1;
    group.totalMs += song.track.duration_ms;
    groups.set(key, group);
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .map(([label, { count, totalMs }]) => ({
      key: label,
      label,
      value: count,
      display: `${count} songs`,
      avg: formatTrackTime(totalMs / count),
    }));
}

/** Per-bar phase offsets so the equaliser intro looks organic. */
function eqStyle(i: number): CSSProperties {
  return {
    "--eq-dur": `${2.6 + ((i * 7) % 5) * 0.18}s`,
    "--eq-delay": `${-((i * 11) % 7) * 0.12}s`,
  } as CSSProperties;
}

function BarList({
  rows,
  visible,
  onMore,
  eq,
}: {
  rows: RankedRow[];
  visible: number;
  onMore: () => void;
  eq: boolean;
}) {
  const max = Math.max(1, ...rows.slice(0, 1).map((r) => r.value));
  return (
    <>
      <div className={`leaderboard ranked${eq ? " eq" : ""}`}>
        {rows.slice(0, visible).map((row, i) => (
          <div style={{ display: "contents" }} key={row.key}>
            <span className="name">
              <span className="rank">{i + 1}</span>
              <span className="label" title={row.label}>
                {row.label}
              </span>
            </span>
            <span className="bar-track">
              <span
                className="bar"
                style={{ width: `${(row.value / max) * 100}%`, ...eqStyle(i) }}
                title={`${row.label}: ${row.display}`}
              />
            </span>
            <span className="value">
              <strong>{row.display.split(" ")[0]}</strong>
              {row.display.includes(" ") && (
                <span className="unit"> {row.display.split(" ").slice(1).join(" ")}</span>
              )}
              {row.avg && (
                <>
                  {" · "}
                  {row.avg}
                  <span className="unit"> avg</span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
      {visible < rows.length && (
        <button className="load-more" onClick={onMore}>
          Load more
        </button>
      )}
    </>
  );
}

export default function StatsCard({ totals, colorFor, songs }: Props) {
  const [tab, setTab] = useState<Tab>("time");
  // Equaliser intro: one-shot ~3s wobble+settle; class removed after it finishes
  const [eq, setEq] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setEq(false), 4000);
    return () => clearTimeout(timer);
  }, []);
  const [visible, setVisible] = useState<Record<Tab, number>>({
    time: PAGE_SIZE,
    count: PAGE_SIZE,
    topgenre: PAGE_SIZE,
    genres: PAGE_SIZE,
    artists: PAGE_SIZE,
    songs: PAGE_SIZE,
  });
  const more = (id: Tab) => () =>
    setVisible((v) => ({ ...v, [id]: v[id] + PAGE_SIZE }));

  const topGenres = useMemo(() => rank(songs, (s) => s.track.genre || null), [songs]);
  const topArtists = useMemo(
    () => rank(songs, (s) => s.track.artists.split(",")[0]?.trim() || null),
    [songs],
  );
  const longestSongs = useMemo(
    () =>
      [...songs]
        .sort((a, b) => b.track.duration_ms - a.track.duration_ms)
        .map((s) => ({
          key: s.track.id,
          label: `${s.track.name} — ${s.track.artists}`,
          value: s.track.duration_ms,
          display: formatTrackTime(s.track.duration_ms),
        })),
    [songs],
  );
  const maxMs = Math.max(1, ...totals.map((t) => t.totalMs));
  const topGenreByMember = useMemo(() => {
    const perMember = new Map<string, Map<string, number>>();
    for (const song of songs) {
      const genre = song.track.genre;
      if (!genre) continue;
      const credited = new Set(
        song.appearances.map((a) => a.addedBy?.id).filter((id): id is string => !!id),
      );
      for (const id of credited) {
        const counts = perMember.get(id) ?? new Map<string, number>();
        counts.set(genre, (counts.get(genre) ?? 0) + 1);
        perMember.set(id, counts);
      }
    }
    return totals
      .map(({ member }) => {
        const counts = perMember.get(member.id);
        if (!counts) return { member, genre: "—", count: 0 };
        const [genre, count] = [...counts.entries()].sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
        )[0];
        return { member, genre, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [songs, totals]);
  const maxTopGenre = Math.max(1, ...topGenreByMember.map((t) => t.count));

  const byCount = useMemo(
    () => [...totals].sort((a, b) => b.songCount - a.songCount || b.totalMs - a.totalMs),
    [totals],
  );
  const maxCount = Math.max(1, ...totals.map((t) => t.songCount));

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Club stats</h2>
          <p className="subtitle">{SUBTITLES[tab]}</p>
        </div>
        <div className="tab-row">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              className={`tab${tab === id ? " active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {songs.length === 0 ? (
        <p className="empty">No data yet — run a sync.</p>
      ) : tab === "time" ? (
        <div className={`leaderboard${eq ? " eq" : ""}`}>
          {totals.map(({ member, totalMs, songCount }, i) => (
            <div style={{ display: "contents" }} key={member.id}>
              <span className="name">
                <Avatar member={member} color={colorFor.get(member.id)} />
                {member.display_name}
              </span>
              <span className="bar-track">
                <span
                  className="bar"
                  style={{
                    width: `${(totalMs / maxMs) * 100}%`,
                    background: colorFor.get(member.id),
                    ...eqStyle(i),
                  }}
                  title={`${member.display_name}: ${formatTotalTime(totalMs)} across ${songCount} song${songCount === 1 ? "" : "s"}`}
                />
              </span>
              <span className="value">
                <strong>{formatTotalTime(totalMs)}</strong> · {songCount}
                <span className="unit"> song{songCount === 1 ? "" : "s"}</span>
              </span>
            </div>
          ))}
        </div>
      ) : tab === "count" ? (
        <div className={`leaderboard${eq ? " eq" : ""}`}>
          {byCount.map(({ member, totalMs, songCount }, i) => (
            <div style={{ display: "contents" }} key={member.id}>
              <span className="name">
                <Avatar member={member} color={colorFor.get(member.id)} />
                {member.display_name}
              </span>
              <span className="bar-track">
                <span
                  className="bar"
                  style={{
                    width: `${(songCount / maxCount) * 100}%`,
                    background: colorFor.get(member.id),
                    ...eqStyle(i),
                  }}
                  title={`${member.display_name}: ${songCount} songs (${formatTotalTime(totalMs)})`}
                />
              </span>
              <span className="value">
                <strong>{songCount}</strong>
                <span className="unit"> songs</span> · {formatTotalTime(totalMs)}
              </span>
            </div>
          ))}
        </div>
      ) : tab === "topgenre" ? (
        <div className={`leaderboard${eq ? " eq" : ""}`}>
          {topGenreByMember.map(({ member, genre, count }, i) => (
            <div style={{ display: "contents" }} key={member.id}>
              <span className="name">
                <Avatar member={member} color={colorFor.get(member.id)} />
                {member.display_name}
              </span>
              <span className="bar-track">
                <span
                  className="bar"
                  style={{
                    width: `${(count / maxTopGenre) * 100}%`,
                    background: colorFor.get(member.id),
                    ...eqStyle(i),
                  }}
                  title={`${member.display_name}: ${genre} × ${count}`}
                />
              </span>
              <span className="value">
                <strong>{genre}</strong> · {count}
                <span className="unit"> songs</span>
              </span>
            </div>
          ))}
        </div>
      ) : tab === "genres" ? (
        <BarList rows={topGenres} visible={visible.genres} onMore={more("genres")} eq={eq} />
      ) : tab === "artists" ? (
        <BarList rows={topArtists} visible={visible.artists} onMore={more("artists")} eq={eq} />
      ) : (
        <BarList rows={longestSongs} visible={visible.songs} onMore={more("songs")} eq={eq} />
      )}
    </section>
  );
}
