import type { Member } from "./types.ts";

// Fixed categorical assignment: slot order follows member id sort so a
// member keeps the same colour regardless of filters or data order.
export function memberColorMap(members: Member[]): Map<string, string> {
  const sorted = [...members].sort((a, b) => a.id.localeCompare(b.id));
  return new Map(sorted.map((m, i) => [m.id, `var(--series-${(i % 8) + 1})`]));
}
