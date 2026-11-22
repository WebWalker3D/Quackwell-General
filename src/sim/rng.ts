/** Seeded RNG (mulberry32). State lives in a plain object so it serializes with the world. */
export interface RngState { s: number }

export function rand(r: RngState): number {
  r.s = (r.s + 0x6d2b79f5) | 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const range = (r: RngState, a: number, b: number) => a + (b - a) * rand(r);
export const int = (r: RngState, a: number, b: number) => a + Math.floor(rand(r) * (b - a + 1));
export const pick = <T>(r: RngState, arr: readonly T[]): T => arr[Math.floor(rand(r) * arr.length)];
export const chance = (r: RngState, p: number) => rand(r) < p;
