import { useMemo, useState } from "react";
import type { SongRow } from "../lib/types.ts";

import { heatScale } from "../lib/heat.ts";

// Pie slices reuse the member categorical palette (--series-1..8), cycling
// if there are ever more decades than slots.
const UNKNOWN_COLOR = "#4a4a47";

interface DecadeStat {
  decade: number; // 1990 for the 1990s
  count: number;
  topYear: number; // most common year within the decade
  topYearCount: number;
  color: string;
}

function yearOf(song: SongRow): number | null {
  const year = Number(song.track.release_date?.slice(0, 4));
  return Number.isFinite(year) && year > 1900 ? year : null;
}

function useDecades(songs: SongRow[]) {
  return useMemo(() => {
    const byYear = new Map<number, number>();
    let unknown = 0;
    for (const song of songs) {
      const year = yearOf(song);
      if (year === null) unknown++;
      else byYear.set(year, (byYear.get(year) ?? 0) + 1);
    }
    const byDecade = new Map<number, { count: number; years: Map<number, number> }>();
    for (const [year, count] of byYear) {
      const decade = Math.floor(year / 10) * 10;
      const d = byDecade.get(decade) ?? { count: 0, years: new Map() };
      d.count += count;
      d.years.set(year, count);
      byDecade.set(decade, d);
    }
    const decades: DecadeStat[] = [...byDecade.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([decade, { count, years }], i) => {
        const [topYear, topYearCount] = [...years.entries()].sort(
          (a, b) => b[1] - a[1] || a[0] - b[0],
        )[0];
        // fixed categorical assignment, same scheme as member colours
        const color = `var(--series-${(i % 8) + 1})`;
        return { decade, count, topYear, topYearCount, color };
      });
    return { decades, unknown };
  }, [songs]);
}

/** SVG donut slice path from startAngle to endAngle (radians, 12 o'clock = 0). */
function slicePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const sx = cx + r * Math.sin(start);
  const sy = cy - r * Math.cos(start);
  const ex = cx + r * Math.sin(end);
  const ey = cy - r * Math.cos(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} Z`;
}

export default function DecadeCards({ songs }: { songs: SongRow[] }) {
  const { decades, unknown } = useDecades(songs);
  const [hovered, setHovered] = useState<string | null>(null);
  if (decades.length === 0) return null;

  const total = decades.reduce((sum, d) => sum + d.count, 0) + unknown;
  const slices = [
    ...decades.map((d) => ({ label: `${d.decade}s`, count: d.count, color: d.color })),
    ...(unknown > 0 ? [{ label: "Unknown", count: unknown, color: UNKNOWN_COLOR }] : []),
  ];
  let angle = 0;
  const maxTopYear = Math.max(...decades.map((d) => d.topYearCount));
  const minTopYear = Math.min(...decades.map((d) => d.topYearCount));
  const heatFor = heatScale(minTopYear, maxTopYear);

  return (
    <div className="duo-grid">
      <section className="card">
        <h2>Songs by decade</h2>
        <p className="subtitle">Album release date — remasters count as their reissue year</p>
        <div className="pie-wrap">
          <svg viewBox="0 0 200 200" className="pie" role="img" aria-label="Songs per decade">
            {slices.map((slice) => {
              const start = angle;
              angle += (slice.count / total) * Math.PI * 2;
              return (
                <path
                  key={slice.label}
                  className={
                    hovered === null ? "" : hovered === slice.label ? "hovered" : "dimmed"
                  }
                  d={slicePath(100, 100, 92, start, angle)}
                  fill={slice.color}
                  stroke="var(--surface)"
                  strokeWidth="2"
                  onMouseEnter={() => setHovered(slice.label)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <title>{`${slice.label}: ${slice.count} songs (${Math.round((slice.count / total) * 100)}%)`}</title>
                </path>
              );
            })}
          </svg>
          <ul className="pie-legend">
            {slices.map((slice) => (
              <li
                key={slice.label}
                className={hovered === slice.label ? "hovered" : ""}
                onMouseEnter={() => setHovered(slice.label)}
                onMouseLeave={() => setHovered(null)}
              >
                <span className="member-dot" style={{ background: slice.color }} />
                <span className="pie-label">{slice.label}</span>
                <span className="pie-count">
                  <strong>{slice.count}</strong> · {Math.round((slice.count / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card">
        <h2>Peak year per decade</h2>
        <p className="subtitle">The single most-picked release year within each decade</p>
        <div className="col-chart">
          {decades.map((d) => (
            <div className="col" key={d.decade} title={`${d.topYear}: ${d.topYearCount} songs`}>
              <span className="col-count">{d.topYearCount}</span>
              <div
                className="col-bar"
                style={{
                  height: `${Math.max(6, (d.topYearCount / maxTopYear) * 130)}px`,
                  background: heatFor(d.topYearCount),
                }}
              />
              <span className="col-year">{d.topYear}</span>
              <span className="col-decade">{d.decade}s</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
