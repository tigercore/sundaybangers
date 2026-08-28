// Value-mapped green intensity: brightest Spotify green for the biggest
// value, darkest for the smallest, linearly interpolated in between.
const HEAT_DARK = [10, 56, 30];
const HEAT_BRIGHT = [30, 215, 96];

export function heat(t: number): string {
  const ch = HEAT_DARK.map((d, i) => Math.round(d + (HEAT_BRIGHT[i] - d) * t));
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
}

/** Scale over [min, max] -> css colour; a degenerate range maps to brightest. */
export function heatScale(min: number, max: number): (value: number) => string {
  return (value) => heat(max === min ? 1 : (value - min) / (max - min));
}
