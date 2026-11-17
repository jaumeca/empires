import type { Appearance } from '../sim/model/state';

/**
 * How many options each appearance slot has (ART_DIRECTION §3). Shared by the
 * simulation (validation) and checked against the render catalogs in tests.
 */
export const APPEARANCE_LIMITS: Record<keyof Appearance, number> = {
  skin: 8,
  hairStyle: 8,
  hairColor: 12,
  top: 5,
  topColor: 10,
  pantsColor: 6,
  accessory: 6,
};

/** A valid copy of `a` (unknown or out-of-range values become 0). */
export function sanitizeAppearance(a: Partial<Appearance>): Appearance {
  const out = {} as Appearance;
  for (const k of Object.keys(APPEARANCE_LIMITS) as (keyof Appearance)[]) {
    const v = Number(a[k]);
    out[k] = Number.isInteger(v) && v >= 0 && v < APPEARANCE_LIMITS[k] ? v : 0;
  }
  return out;
}

/** Trim, drop control characters and limit length (names and nicknames). */
export function cleanName(s: string, max: number): string {
  return Array.from(s.replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()).slice(0, max).join('');
}
