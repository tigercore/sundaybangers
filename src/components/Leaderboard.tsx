import type { MemberTotal } from "../lib/types.ts";
import { formatTotalTime } from "../lib/format.ts";

interface Props {
  totals: MemberTotal[];
  colorFor: Map<string, string>;
}

export default function Leaderboard({ totals, colorFor }: Props) {
  const maxMs = Math.max(1, ...totals.map((t) => t.totalMs));

  return (
    <section className="card">
      <h2>Total song time per member</h2>
      <p className="subtitle">Across every week, based on who added each track</p>
      {totals.length === 0 ? (
        <p className="empty">No data yet — run a sync.</p>
      ) : (
        <div className="leaderboard">
          {totals.map(({ member, totalMs, songCount }) => (
            <div style={{ display: "contents" }} key={member.id}>
              <span className="name">
                <span
                  className="member-dot"
                  style={{ background: colorFor.get(member.id) }}
                />
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
                <strong>{formatTotalTime(totalMs)}</strong> · {songCount} song{songCount === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
