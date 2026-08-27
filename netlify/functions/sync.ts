import type { Config } from "@netlify/functions";
import { runSync } from "./_shared/sync.ts";

// Manual "Sync now" endpoint, called from the dashboard.
export default async () => {
  try {
    const result = await runSync();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("Sync failed:", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: "/api/sync",
  method: "POST",
};
