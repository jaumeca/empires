/**
 * Master palette (ART_DIRECTION §4.3). Voxel grids store indices into this list.
 * Index 0 is reserved for "empty". Colors are sRGB hex.
 */
export const PALETTE_HEX: number[] = [0x000000];
const byName = new Map<string, number>();

function add(name: string, hex: number): number {
  const i = PALETTE_HEX.length;
  PALETTE_HEX.push(hex);
  byName.set(name, i);
  return i;
}

export const P = {
  // Wood & room
  woodLight: add('woodLight', 0xd9a86c),
  woodMid: add('woodMid', 0xc8935a),
  woodPale: add('woodPale', 0xe4b980),
  woodDark: add('woodDark', 0x8c5a3c),
  woodDeep: add('woodDeep', 0x6e4530),
  wall: add('wall', 0xf3e6d3),
  wallShade: add('wallShade', 0xe9d6bd),
  wallPeach: add('wallPeach', 0xf6c9a8),
  skirting: add('skirting', 0xfaf3ea),
  baseSide: add('baseSide', 0x7a5440),
  // Accents
  mint: add('mint', 0x7fd1b9),
  mintDark: add('mintDark', 0x4fae95),
  sky: add('sky', 0x8ec5ff),
  skyLight: add('skyLight', 0xc9e4ff),
  lavender: add('lavender', 0xb9a6e8),
  coral: add('coral', 0xff8a7a),
  coralDark: add('coralDark', 0xe2675a),
  mustard: add('mustard', 0xf2c14e),
  cream: add('cream', 0xfff7e8),
  // Plants
  leaf: add('leaf', 0x6dbe6a),
  leafDark: add('leafDark', 0x3e8e4e),
  leafLight: add('leafLight', 0x9ad97a),
  terracotta: add('terracotta', 0xd2754f),
  terracottaDark: add('terracottaDark', 0xa95a3c),
  // Tech
  metal: add('metal', 0x9a9590),
  metalDark: add('metalDark', 0x5f5a57),
  plastic: add('plastic', 0x3b3a40),
  plasticLight: add('plasticLight', 0xd9d4ce),
  screenGlow: add('screenGlow', 0xb8ffe6),
  amberGlow: add('amberGlow', 0xffd27a),
  ink: add('ink', 0x2e2420),
  white: add('white', 0xfffdf8),
  // Fabrics
  rugA: add('rugA', 0xe9a6a0),
  rugB: add('rugB', 0xf8e2c8),
  rugC: add('rugC', 0x9fb8e0),
  fabricBlue: add('fabricBlue', 0x6f8fcf),
  fabricBlueDark: add('fabricBlueDark', 0x55729f),
};

/** Empirian customization catalogs (indices into PALETTE_HEX). */
export const SKIN_TONES = [0xffe0c7, 0xf6cfa9, 0xe8b48a, 0xd59a6e, 0xb97c52, 0x9a6040, 0x7a4a31, 0x5a3524].map((h, i) => add(`skin${i}`, h));
export const SKIN_SHADES = [0xf2c9ad, 0xe6b791, 0xd69d74, 0xc1845a, 0xa46a44, 0x845036, 0x663d28, 0x4a2b1d].map((h, i) => add(`skinShade${i}`, h));
export const HAIR_COLORS = [
  0x2b211d, 0x5a3a26, 0x8a5a36, 0xc58b4e, 0xe8c27a, 0xb9472f, 0xd8d3cc, 0x6b6b6b,
  0xff8fb4, 0x6fa8ff, 0x6fdcb0, 0xa98bff,
].map((h, i) => add(`hair${i}`, h));
export const HAIR_SHADES = [
  0x1c1512, 0x45291a, 0x6d4428, 0xa5703a, 0xcfa65e, 0x963624, 0xb9b3ab, 0x525252,
  0xe8709a, 0x4e86e0, 0x4fbf93, 0x8a6ae6,
].map((h, i) => add(`hairShade${i}`, h));
export const CLOTH_COLORS = [
  0x7fd1b9, 0x8ec5ff, 0xff8a7a, 0xf2c14e, 0xb9a6e8, 0x6dbe6a, 0x3f4a6b, 0xf3efe6, 0xe86f9a, 0x8c5a3c,
].map((h, i) => add(`cloth${i}`, h));
export const CLOTH_SHADES = [
  0x5fb39b, 0x6ea5df, 0xe26b5c, 0xd4a33a, 0x9a87cc, 0x52a04f, 0x2d3650, 0xd6d0c4, 0xc9547d, 0x6e4530,
].map((h, i) => add(`clothShade${i}`, h));
export const PANTS_COLORS = [0x3f4a6b, 0x5b5f66, 0x8c5a3c, 0x2e2e33, 0x6a87b8, 0xc9b28f].map((h, i) => add(`pants${i}`, h));

export const HAIR_STYLE_NAMES = ['Corto', 'Flequillo', 'Pinchos', 'Melena', 'Moño', 'Afro', 'Rapado', 'Coleta'];
export const TOP_NAMES = ['Camiseta', 'Sudadera', 'Camisa', 'Jersey a rayas', 'Chaqueta'];
export const ACCESSORY_NAMES = ['Nada', 'Gafas', 'Auriculares', 'Gorra', 'Barba', 'Gafas y barba'];

export function paletteIndex(name: string): number {
  const i = byName.get(name);
  if (i === undefined) throw new Error(`Unknown palette color ${name}`);
  return i;
}

export function hexToCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}
