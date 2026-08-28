import type { Config } from "@netlify/functions";
import { runSync } from "./_shared/sync.ts";

// Hourly refresh. Songs are added through the week, and the manual
// "Sync now" button covers anything more urgent.
export default async () => {
  const result = await runSync();
  console.log("Scheduled sync:", JSON.stringify(result));
};

export const config: Config = {
  schedule: "@hourly",
};
