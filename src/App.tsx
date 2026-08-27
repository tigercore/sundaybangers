import { useCallback, useEffect, useMemo, useState } from "react";
import { loadDashboard, type Dashboard } from "./lib/data.ts";
import { memberColorMap } from "./lib/memberColor.ts";
import { formatTotalTime } from "./lib/format.ts";
import StatsCard from "./components/StatsCard.tsx";
import SongTable from "./components/SongTable.tsx";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Dashboard };

export default function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState({ status: "ready", data: await loadDashboard() });
    } catch (err) {
      setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error ?? `Sync failed (${res.status})`);
      setSyncMessage(
        body.playlistsSynced > 0
          ? `Synced ${body.playlistsSynced} playlist${body.playlistsSynced === 1 ? "" : "s"}`
          : "Already up to date",
      );
      await refresh();
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  };

  const colorFor = useMemo(
    () => memberColorMap(state.status === "ready" ? state.data.members : []),
    [state],
  );

  if (state.status === "loading") {
    return (
      <div className="app">
        <p className="notice">Loading…</p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="app">
        <div className="notice error">
          <strong>Couldn't load data.</strong>
          <p>
            <code>{state.message}</code>
          </p>
          <p>Check the Supabase env vars and that the migrations have been applied.</p>
        </div>
      </div>
    );
  }

  const { data } = state;
  const totalMs = data.totals.reduce((sum, t) => sum + t.totalMs, 0);
  const appearanceCount = data.songs.reduce((sum, s) => sum + s.appearances.length, 0);

  return (
    <div className="app">
      <header className="header">
        <h1>🎵 Sunday Bangers</h1>
        <span className="spacer" />
        {data.lastSyncedAt && (
          <span className="synced-at">
            Synced {new Date(data.lastSyncedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        )}
        <button className="sync-button" onClick={handleSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync now"}
        </button>
      </header>
      {syncMessage && <p className="synced-at">{syncMessage}</p>}
      {data.demo && (
        <p className="notice">
          Showing <strong>sample data</strong> — set <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_ANON_KEY</code> to connect the real backend (see README).
        </p>
      )}

      <div className="stat-row">
        <div className="stat-tile">
          <div className="value">{data.playlists.length}</div>
          <div className="label">Weeks</div>
        </div>
        <div className="stat-tile">
          <div className="value">{appearanceCount}</div>
          <div className="label">Songs added</div>
        </div>
        <div className="stat-tile">
          <div className="value">{data.songs.length}</div>
          <div className="label">Unique songs</div>
        </div>
        <div className="stat-tile">
          <div className="value">{formatTotalTime(totalMs)}</div>
          <div className="label">Total listening time</div>
        </div>
      </div>

      <StatsCard totals={data.totals} colorFor={colorFor} songs={data.songs} />
      <SongTable songs={data.songs} playlists={data.playlists} colorFor={colorFor} />
    </div>
  );
}
