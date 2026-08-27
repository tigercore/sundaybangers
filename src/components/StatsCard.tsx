import { useMemo, useState } from "react";
import type { Member, MemberTotal, SongRow } from "../lib/types.ts";
import { formatTotalTime } from "../lib/format.ts";

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

type Tab = "time" | "genres" | "artists";

interface Props {
  totals: MemberTotal[];
  colorFor: Map<string, string>;
  songs: SongRow[];
}

const TABS: { id: Tab; label: string }[] = [
  { id: "time", label: "Song time" },
  { id: "genres", label: "Top genres" },
  { id: "artists", label: "Top artists" },
];

const SUBTITLES: Record<Tab, string> = {
  time: "Across every week, based on who added each track",
  genres: "Unique songs per genre, across every week",
  artists: "Unique songs per artist (primary artist credit)",
};

/** Count unique songs by a key, descending, top n. */
function rank(songs: SongRow[], keyOf: (s: SongRow) => string | null, n: number) {
  const counts = new Map<string, number>();
  for (const song of songs) {
    const key = keyOf(song);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}

function BarList({ rows, unit }: { rows: [string, number][]; unit: string }) {
  const max = Math.max(1, ...rows.map(([, count]) => count));
  return (
    <div className="leaderboard ranked">
      {rows.map(([label, count], i) => (
        <div style={{ display: "contents" }} key={label}>
          <span className="name">
            <span className="rank">{i + 1}</span>
            {label}
          </span>
          <span className="bar-track">
            <span
              className="bar"
              style={{ width: `${(count / max) * 100}%` }}
              title={`${label}: ${count} ${unit}`}
            />
          </span>
          <span className="value">
            <strong>{count}</strong> {unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function StatsCard({ totals, colorFor, songs }: Props) {
  const [tab, setTab] = useState<Tab>("time");

  const topGenres = useMemo(() => rank(songs, (s) => s.track.genre || null, 10), [songs]);
  const topArtists = useMemo(
    () => rank(songs, (s) => s.track.artists.split(",")[0]?.trim() || null, 10),
    [songs],
  );
  const maxMs = Math.max(1, ...totals.map((t) => t.totalMs));

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
        <div className="leaderboard">
          {totals.map(({ member, totalMs, songCount }) => (
            <div style={{ display: "contents" }} key={member.id}>
              <span className="name">
                <Avatar member={member} color={colorFor.get(member.id)} />
                {member.display_name}
              </span>
              <span className="bar-track">
                <span
                  className="bar"
                  style={{ width: `${(totalMs / maxMs) * 100}%` }}
                  title={`${member.display_name}: ${formatTotalTime(totalMs)} across ${songCount} song${songCount === 1 ? "" : "s"}`}
                />
              </span>
              <span className="value">
                <strong>{formatTotalTime(totalMs)}</strong> · {songCount} song
                {songCount === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      ) : tab === "genres" ? (
        <BarList rows={topGenres} unit="songs" />
      ) : (
        <BarList rows={topArtists} unit="songs" />
      )}
    </section>
  );
}
