/**
 * Wall and floor finishes (AW.C.3). Purely aesthetic: a small price, no effect
 * on the simulation. Colors live in the render palette; ids are stable save data.
 */
export const WALL_STYLES = ['cream', 'mint', 'sky', 'lavender', 'sand', 'brick', 'concrete', 'white', 'forest', 'coral'] as const;
export const FLOOR_STYLES = ['oak', 'walnut', 'tiles', 'carpet', 'concrete', 'parquet', 'whitetile', 'dark', 'checker'] as const;
export type WallStyle = (typeof WALL_STYLES)[number];
export type FloorStyle = (typeof FLOOR_STYLES)[number];

export const STYLE_PRICE = { wall: 150, floor: 300 } as const;

export interface OfficeStyle {
  wall: WallStyle;
  floor: FloorStyle;
}

export const DEFAULT_STYLE: OfficeStyle = { wall: 'cream', floor: 'oak' };
