import type { ThemeId } from '../data/types';

/**
 * 16x16 tile art and overworld map generation.
 *
 * Tiles are drawn procedurally from a base colour plus deterministic detail
 * clusters. Every tile keys its speckle pattern off its own map coordinates, so
 * a tile always looks identical across frames — random per-frame noise is the
 * fastest way to make pixel art look wrong.
 */

export const TILE = 16;

export type GroundKind =
  | 'grass'
  | 'grassDark'
  | 'grassLight'
  | 'path'
  | 'sand'
  | 'snow'
  | 'stone'
  | 'dirt'
  | 'plaza'
  | 'water'
  | 'lava';

export type DecorKind =
  | 'tree'
  | 'pine'
  | 'bush'
  | 'rock'
  | 'flower'
  | 'crystal'
  | 'bamboo'
  | 'wisteria'
  | 'pillar'
  | 'ruin'
  | 'lamp'
  | 'fence'
  | 'house'
  | 'tower'
  | 'gate'
  | 'tent'
  | 'snowman'
  | 'cactus'
  | 'fountain'
  | 'signpost';

interface GroundDef {
  base: number;
  /** Darker speckle colour, or null for a flat tile. */
  dark: number | null;
  /** Lighter speckle colour. */
  light: number | null;
  /** Wave rows, for water and lava. */
  waves?: boolean;
  /** Mortar grid, for paved tiles. */
  paved?: boolean;
  solid?: boolean;
}

const GROUNDS: Record<GroundKind, GroundDef> = {
  grass: { base: 0x6aa844, dark: 0x53903a, light: 0x86c25a },
  grassDark: { base: 0x53903a, dark: 0x407a2e, light: 0x6aa844 },
  grassLight: { base: 0x86c25a, dark: 0x6aa844, light: 0x9ed46f },
  path: { base: 0xc9a878, dark: 0xb08e60, light: 0xdcbe92 },
  sand: { base: 0xe0cf94, dark: 0xc8b478, light: 0xf0e2b0 },
  snow: { base: 0xeef4fb, dark: 0xd2e0f0, light: 0xffffff },
  stone: { base: 0xa8a8b0, dark: 0x8c8c98, light: 0xc0c0c8 },
  dirt: { base: 0x9a7a52, dark: 0x82653f, light: 0xb08e64 },
  plaza: { base: 0xc4b8a4, dark: 0xa89c88, light: 0xd8cdb8, paved: true },
  water: { base: 0x3a72c0, dark: 0x2a5aa0, light: 0x6aa0e0, waves: true, solid: true },
  lava: { base: 0xd8502a, dark: 0xb03a1a, light: 0xf08850, waves: true, solid: true },
};

/** Deterministic 0..1 hash from two integers. */
function h2(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) | 0;
  n = Math.imul(n, 1274126177) | 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function hex(n: number): string {
  return `#${(n & 0xffffff).toString(16).padStart(6, '0')}`;
}

function fill(ctx: CanvasRenderingContext2D, color: number, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = hex(color);
  ctx.fillRect(x, y, w, h);
}

/** Draw one ground tile. `tx`/`ty` are map coordinates, used for the speckle seed. */
export function drawGround(
  ctx: CanvasRenderingContext2D,
  kind: GroundKind,
  px: number,
  py: number,
  tx: number,
  ty: number,
) {
  const def = GROUNDS[kind];
  fill(ctx, def.base, px, py, TILE, TILE);

  if (def.waves) {
    // Two stepped wave rows, offset per tile so the water does not grid up.
    const off = Math.floor(h2(tx, ty) * 8);
    for (let row = 0; row < 2; row++) {
      const wy = py + 4 + row * 6;
      for (let i = 0; i < 3; i++) {
        const wx = px + ((off + i * 5 + row * 3) % 14);
        fill(ctx, def.light!, wx, wy, 3, 1);
      }
    }
    if (def.dark) {
      for (let i = 0; i < 2; i++) {
        const wx = px + ((off + i * 7 + 2) % 14);
        fill(ctx, def.dark, wx, py + 10 + i * 3, 4, 1);
      }
    }
    return;
  }

  if (def.paved) {
    // Stone slabs with a mortar grid and a lighter top-left bevel.
    fill(ctx, def.base, px, py, TILE, TILE);
    fill(ctx, def.light!, px + 1, py + 1, TILE - 2, 1);
    fill(ctx, def.light!, px + 1, py + 1, 1, TILE - 2);
    fill(ctx, def.dark!, px, py + TILE - 1, TILE, 1);
    fill(ctx, def.dark!, px + TILE - 1, py, 1, TILE);
    // Break each tile into four slabs with a cross of mortar.
    fill(ctx, def.dark!, px + 7, py + 1, 1, TILE - 2);
    fill(ctx, def.dark!, px + 1, py + 7, TILE - 2, 1);
    // A deterministic chip or two keeps it from looking printed.
    if (h2(tx, ty) > 0.7) fill(ctx, def.dark!, px + 3 + Math.floor(h2(ty, tx) * 8), py + 4, 2, 1);
    return;
  }

  // Speckle: a handful of 1-2px clusters, deterministically placed.
  const count = 5;
  for (let i = 0; i < count; i++) {
    const r = h2(tx * 31 + i, ty * 17 - i);
    const r2 = h2(tx - i * 7, ty * 13 + i * 3);
    const sx = px + Math.floor(r * (TILE - 2));
    const sy = py + Math.floor(r2 * (TILE - 1));
    const useDark = r2 > 0.42;
    const color = useDark ? def.dark : def.light;
    if (color === null) continue;
    fill(ctx, color, sx, sy, r > 0.7 ? 2 : 1, 1);
  }
}

/** Solid decor: the hero cannot walk onto these tiles. */
const SOLID_DECOR = new Set<DecorKind>([
  'tree',
  'pine',
  'bush',
  'rock',
  'crystal',
  'bamboo',
  'pillar',
  'ruin',
  'lamp',
  'fence',
  'house',
  'tower',
  'gate',
  'tent',
  'snowman',
  'cactus',
  'fountain',
  'signpost',
]);

export function isSolidDecor(kind: DecorKind): boolean {
  return SOLID_DECOR.has(kind);
}

/** Draw one decor object. Tall objects overhang upward into the tile above. */
export function drawDecor(
  ctx: CanvasRenderingContext2D,
  kind: DecorKind,
  px: number,
  py: number,
  tx: number,
  ty: number,
) {
  const v = h2(tx * 53, ty * 97);
  switch (kind) {
    case 'tree': {
      const trunk = 0x6b4a2a;
      fill(ctx, 0x2a3a20, px + 3, py + 14, 10, 2); // shadow
      fill(ctx, trunk, px + 6, py + 6, 4, 10);
      fill(ctx, 0x4a3a20, px + 6, py + 6, 1, 10);
      const leaf = 0x3f8a3a;
      fill(ctx, 0x2a6a2a, px + 1, py - 6, 14, 12);
      fill(ctx, 0x2a6a2a, px + 3, py - 9, 10, 3);
      fill(ctx, leaf, px + 2, py - 5, 12, 8);
      fill(ctx, 0x58a84a, px + 3, py - 4, 5, 3);
      fill(ctx, 0x58a84a, px + 8, py - 2, 4, 2);
      break;
    }
    case 'pine': {
      fill(ctx, 0x2a3a20, px + 4, py + 14, 8, 2);
      fill(ctx, 0x5a3a22, px + 7, py + 8, 2, 8);
      const dark = 0x1f5a34;
      const lit = 0x2f7a44;
      for (let i = 0; i < 4; i++) {
        const w = 13 - i * 3;
        const y = py - 8 + i * 5;
        fill(ctx, dark, px + (16 - w) / 2, y, w, 5);
        fill(ctx, lit, px + (16 - w) / 2 + 1, y + 1, w - 4, 2);
      }
      fill(ctx, 0xffffff, px + 4, py - 6, 3, 1);
      break;
    }
    case 'bush': {
      fill(ctx, 0x2a6a2a, px + 1, py + 8, 14, 6);
      fill(ctx, 0x3f8a3a, px + 2, py + 7, 12, 6);
      fill(ctx, 0x58a84a, px + 3, py + 8, 5, 2);
      if (v > 0.6) {
        fill(ctx, 0xe86a8a, px + 5, py + 9, 2, 2);
        fill(ctx, 0xf0a02c, px + 9, py + 11, 2, 2);
      }
      break;
    }
    case 'rock': {
      fill(ctx, 0x4a4a52, px + 2, py + 12, 12, 3);
      fill(ctx, 0x6a6a74, px + 2, py + 6, 12, 8);
      fill(ctx, 0x6a6a74, px + 4, py + 3, 8, 4);
      fill(ctx, 0x8a8a96, px + 4, py + 5, 5, 3);
      fill(ctx, 0x50505a, px + 9, py + 9, 4, 4);
      break;
    }
    case 'flower': {
      const c = v > 0.5 ? 0xf0d878 : v > 0.25 ? 0xf07aa8 : 0xa8c8f0;
      fill(ctx, 0x3f8a3a, px + 7, py + 8, 1, 5);
      fill(ctx, 0x3f8a3a, px + 5, py + 11, 5, 1);
      fill(ctx, c, px + 6, py + 6, 3, 3);
      fill(ctx, 0xffffff, px + 7, py + 7, 1, 1);
      break;
    }
    case 'crystal': {
      fill(ctx, 0x2a4a6a, px + 4, py + 13, 8, 2);
      fill(ctx, 0x3fc4d8, px + 5, py + 3, 6, 11);
      fill(ctx, 0x7fe4f0, px + 6, py + 4, 2, 8);
      fill(ctx, 0x3fc4d8, px + 3, py + 8, 3, 5);
      fill(ctx, 0x7fe4f0, px + 4, py + 9, 1, 3);
      break;
    }
    case 'bamboo': {
      fill(ctx, 0x2a3a20, px + 3, py + 14, 10, 2);
      const c = 0x5aa848;
      for (const bx of [3, 7, 11]) {
        fill(ctx, c, px + bx, py - 8, 2, 22);
        fill(ctx, 0x3f8a3a, px + bx, py - 2, 2, 1);
        fill(ctx, 0x3f8a3a, px + bx, py + 5, 2, 1);
        fill(ctx, 0x86c25a, px + bx, py - 7, 1, 6);
      }
      break;
    }
    case 'wisteria': {
      fill(ctx, 0x5a3a22, px + 7, py - 4, 2, 20);
      fill(ctx, 0x4a3a5a, px + 3, py - 8, 10, 5);
      fill(ctx, 0x8a6ac0, px + 4, py - 7, 8, 3);
      fill(ctx, 0xb98fe8, px + 5, py - 3, 2, 6);
      fill(ctx, 0xb98fe8, px + 9, py - 2, 2, 8);
      fill(ctx, 0xd8b8f8, px + 5, py - 2, 1, 4);
      break;
    }
    case 'pillar': {
      fill(ctx, 0x4a4a52, px + 2, py + 14, 12, 2);
      fill(ctx, 0xd8d4c8, px + 4, py - 8, 8, 22);
      fill(ctx, 0xf0ece0, px + 5, py - 8, 3, 22);
      fill(ctx, 0xa8a498, px + 10, py - 8, 2, 22);
      fill(ctx, 0xf0ece0, px + 3, py - 10, 10, 3);
      fill(ctx, 0xa8a498, px + 3, py + 11, 10, 3);
      break;
    }
    case 'ruin': {
      fill(ctx, 0x5a5248, px + 1, py + 8, 14, 7);
      fill(ctx, 0x7a7268, px + 2, py + 4, 12, 6);
      fill(ctx, 0x968e82, px + 3, py + 5, 6, 3);
      fill(ctx, 0x4a443c, px + 8, py + 9, 5, 5);
      fill(ctx, 0x3a8a3a, px + 2, py + 14, 3, 1);
      break;
    }
    case 'lamp': {
      fill(ctx, 0x3a3a44, px + 6, py + 4, 4, 12);
      fill(ctx, 0x2a2a34, px + 4, py + 15, 8, 1);
      fill(ctx, 0x2a2a34, px + 4, py + 3, 8, 2);
      fill(ctx, 0xffd75e, px + 5, py - 1, 6, 5);
      fill(ctx, 0xfff0b0, px + 6, py, 3, 3);
      break;
    }
    case 'fence': {
      fill(ctx, 0x6b4a2a, px, py + 6, 16, 2);
      fill(ctx, 0x6b4a2a, px, py + 11, 16, 2);
      fill(ctx, 0x8a6a44, px + 2, py + 2, 2, 13);
      fill(ctx, 0x8a6a44, px + 12, py + 2, 2, 13);
      break;
    }
    case 'house': {
      fill(ctx, 0x3a2a1a, px - 1, py + 14, 18, 3);
      fill(ctx, 0xd8c8a8, px + 1, py + 2, 14, 14);
      fill(ctx, 0xb8a488, px + 1, py + 2, 14, 2);
      fill(ctx, 0xa83a3a, px - 1, py - 6, 18, 9);
      fill(ctx, 0xc04a4a, px, py - 6, 16, 4);
      fill(ctx, 0x6b4a2a, px + 6, py + 8, 4, 8);
      fill(ctx, 0x9fd8f0, px + 2, py + 6, 3, 4);
      fill(ctx, 0x9fd8f0, px + 11, py + 6, 3, 4);
      break;
    }
    case 'tower': {
      fill(ctx, 0x3a2a1a, px, py + 15, 16, 2);
      fill(ctx, 0x9a8f7a, px + 2, py - 14, 12, 30);
      fill(ctx, 0xb0a48c, px + 3, py - 14, 4, 30);
      fill(ctx, 0x7a6f5a, px + 10, py - 14, 3, 30);
      fill(ctx, 0xa83a3a, px + 1, py - 18, 14, 5);
      fill(ctx, 0xc04a4a, px + 2, py - 18, 12, 2);
      fill(ctx, 0x3a4a6a, px + 5, py + 2, 6, 5);
      fill(ctx, 0xffd75e, px + 6, py + 3, 4, 3);
      break;
    }
    case 'gate': {
      fill(ctx, 0x5a2a2a, px - 1, py - 8, 4, 25);
      fill(ctx, 0x5a2a2a, px + 13, py - 8, 4, 25);
      fill(ctx, 0xa83a3a, px - 2, py - 12, 20, 5);
      fill(ctx, 0xc04a4a, px - 1, py - 12, 18, 2);
      fill(ctx, 0x8a2a2a, px - 1, py - 6, 18, 2);
      break;
    }
    case 'tent': {
      fill(ctx, 0x2a3a20, px, py + 14, 16, 3);
      fill(ctx, 0x8a6a44, px + 1, py + 2, 14, 13);
      fill(ctx, 0xa8845a, px + 2, py + 2, 5, 13);
      fill(ctx, 0x5a4430, px + 6, py + 7, 4, 8);
      fill(ctx, 0x6b4a2a, px, py + 1, 16, 2);
      break;
    }
    case 'snowman': {
      fill(ctx, 0xd2e0f0, px + 4, py + 14, 8, 2);
      fill(ctx, 0xf4f8ff, px + 3, py + 9, 10, 6);
      fill(ctx, 0xf4f8ff, px + 5, py + 4, 6, 6);
      fill(ctx, 0xd2e0f0, px + 3, py + 14, 10, 1);
      fill(ctx, 0x2a2a3a, px + 6, py + 6, 1, 1);
      fill(ctx, 0x2a2a3a, px + 9, py + 6, 1, 1);
      fill(ctx, 0xe86a2c, px + 7, py + 7, 2, 1);
      fill(ctx, 0x3a3a4a, px + 3, py + 1, 10, 3);
      break;
    }
    case 'cactus': {
      fill(ctx, 0x4a7a3a, px + 6, py - 2, 4, 18);
      fill(ctx, 0x5a9a48, px + 6, py - 2, 2, 18);
      fill(ctx, 0x4a7a3a, px + 2, py + 4, 4, 3);
      fill(ctx, 0x4a7a3a, px + 2, py + 1, 3, 4);
      fill(ctx, 0x4a7a3a, px + 10, py + 7, 4, 3);
      fill(ctx, 0x4a7a3a, px + 11, py + 3, 3, 5);
      fill(ctx, 0xf0d878, px + 7, py - 4, 2, 2);
      break;
    }
    case 'fountain': {
      // A low stone basin with a spout and a water sheet.
      fill(ctx, 0x3a3a44, px - 3, py + 13, 22, 3);
      fill(ctx, 0xa8a8b0, px - 4, py + 2, 24, 12);
      fill(ctx, 0xc4c4cc, px - 4, py + 2, 24, 2);
      fill(ctx, 0x8c8c98, px - 4, py + 12, 24, 2);
      fill(ctx, 0x2a5aa0, px - 2, py + 5, 20, 7);
      fill(ctx, 0x3a72c0, px - 2, py + 5, 20, 4);
      fill(ctx, 0x6aa0e0, px + 1, py + 6, 6, 1);
      fill(ctx, 0x6aa0e0, px + 11, py + 7, 5, 1);
      // Spout.
      fill(ctx, 0xb8b8c0, px + 6, py - 4, 4, 7);
      fill(ctx, 0xd4d4dc, px + 6, py - 4, 2, 7);
      fill(ctx, 0x8c8c98, px + 5, py - 5, 6, 2);
      fill(ctx, 0x9fd8f0, px + 7, py - 2, 2, 5);
      break;
    }
    case 'signpost': {
      fill(ctx, 0x6b4a2a, px + 7, py + 6, 2, 10);
      fill(ctx, 0x4a3320, px + 5, py + 15, 6, 1);
      fill(ctx, 0xa8845a, px + 2, py - 1, 12, 8);
      fill(ctx, 0xc4a074, px + 2, py - 1, 12, 2);
      fill(ctx, 0x6b4a2a, px + 4, py + 2, 8, 1);
      fill(ctx, 0x6b4a2a, px + 4, py + 4, 5, 1);
      break;
    }
    default:
      break;
  }
}

/** How far a decor object overhangs above its own tile, for draw ordering. */
export function decorTop(kind: DecorKind): number {
  switch (kind) {
    case 'tree':
      return 9;
    case 'pine':
      return 8;
    case 'tower':
      return 18;
    case 'gate':
      return 12;
    case 'house':
      return 6;
    case 'pillar':
      return 10;
    case 'cactus':
      return 4;
    case 'wisteria':
      return 8;
    case 'bamboo':
      return 8;
    case 'lamp':
      return 2;
    case 'fountain':
      return 5;
    case 'signpost':
      return 1;
    default:
      return 0;
  }
}

/** A theme's tile set: which grounds and decor it uses, and its water colour. */
export interface TileSet {
  ground: GroundKind;
  /** Ground variants scattered for texture. */
  variants: GroundKind[];
  decor: DecorKind[];
  /** Dense decor forming the map border. */
  border: DecorKind;
  /** Optional hazard/water pool scattered in clearings. */
  pool?: GroundKind;
  poolCount: number;
}

export const TILE_SETS: Record<ThemeId, TileSet> = {
  walls: {
    ground: 'grass',
    variants: ['grass', 'grass', 'grassDark', 'grassLight'],
    decor: ['tree', 'bush', 'rock', 'flower', 'house', 'fence', 'lamp'],
    border: 'tree',
    poolCount: 0,
  },
  manor: {
    ground: 'snow',
    variants: ['snow', 'snow', 'snow', 'stone'],
    decor: ['pine', 'rock', 'snowman', 'lamp', 'house', 'crystal'],
    border: 'pine',
    poolCount: 0,
  },
  wasteland: {
    ground: 'dirt',
    variants: ['dirt', 'dirt', 'stone', 'sand'],
    decor: ['ruin', 'rock', 'crystal', 'pillar', 'tent', 'cactus'],
    border: 'pillar',
    pool: 'lava',
    poolCount: 3,
  },
  leaf: {
    ground: 'grass',
    variants: ['grass', 'grassDark', 'grassLight', 'path'],
    decor: ['tree', 'bush', 'bamboo', 'lamp', 'house', 'gate', 'flower'],
    border: 'tree',
    pool: 'water',
    poolCount: 2,
  },
  bamboo: {
    ground: 'grassDark',
    variants: ['grassDark', 'grassDark', 'grass', 'path'],
    decor: ['bamboo', 'wisteria', 'bush', 'rock', 'lamp'],
    border: 'bamboo',
    pool: 'water',
    poolCount: 1,
  },
  camelot: {
    ground: 'grass',
    variants: ['grass', 'grassDark', 'stone', 'path'],
    decor: ['pillar', 'ruin', 'tree', 'rock', 'tower', 'flower'],
    border: 'pillar',
    poolCount: 0,
  },
};
