/**
 * Office sizes (GT.4 / AW.E.1). The grid grows towards the front of the
 * diorama, so the back and left walls (and everything placed) stay where they
 * are. Prices and rent are in SIM_CONFIG-like plain data here (save-stable ids).
 */
export const OFFICE_SIZES = {
  room: { w: 10, d: 8, maxEmployees: 3, rent: 0, price: 0 },
  studio: { w: 14, d: 10, maxEmployees: 6, rent: 60, price: 25000 },
} as const;
export type OfficeSize = keyof typeof OFFICE_SIZES;
export const NEXT_SIZE: Partial<Record<OfficeSize, OfficeSize>> = { room: 'studio' };
