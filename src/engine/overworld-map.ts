import type { ThemeId } from '../data/types';
import {
  TILE,
  TILE_SETS,
  drawDecor,
  drawGround,
  isSolidDecor,
  type DecorKind,
  type GroundKind,
} from './tiles';

/**
 * Builds a GBA-style overworld zone: a town plaza in the south, a winding
 * route north, a forested pocket and water. The layout is generated from a
 * per-world seed so each waifu's world is stable and distinct, but the shape is
 * authored rather than noise-driven — a route, a clearing and a treeline read
 * like a real handheld map.
 */

export const MAP_W = 60;
export const MAP_H = 52;

/** Tile size in world units used for collision math. */
export const MAP_TILE = TILE;

export interface PlacedDecor {
  kind: DecorKind;
  tx: number;
  ty: number;
}

export interface OverworldMap {
  w: number;
  h: number;
  ground: GroundKind[];
  solid: Uint8Array;
  decor: PlacedDecor[];
  /** Tile coordinates of the spawn point. */
  spawn: { x: number; y: number };
  /** Where the prime location building stands. */
  prime: { x: number; y: number };
  /** Relic pedestal positions. */
  relics: { x: number; y: number }[];
  /** Solid decor, indexed by tile for quick lookup during the draw pass. */
  decorAt: Map<number, DecorKind>;
  /** Whether a tile has solid decor on it. */
  blocked: Uint8Array;
}

function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const idx = (x: number, y: number) => y * MAP_W + x;

/**
 * Carve a road between two tile coordinates. The path is one tile wide with a
 * small random jitter, which produces the stepped, hand-drawn look of a
 * handheld route instead of a straight line.
 */
function carvePath(
  ground: GroundKind[],
  rng: () => number,
  from: { x: number; y: number },
  to: { x: number; y: number },
  kind: GroundKind,
) {
  let x = from.x;
  let y = from.y;
  let guard = 0;
  while ((x !== to.x || y !== to.y) && guard++ < 400) {
    for (const [ox, oy] of [
      [0, 0],
      [1, 0],
      [0, 1],
    ] as const) {
      const px = x + ox;
      const py = y + oy;
      if (px >= 0 && px < MAP_W && py >= 0 && py < MAP_H) ground[idx(px, py)] = kind;
    }
    // Step the longer axis first, with occasional jitter on the other.
    const dx = to.x - x;
    const dy = to.y - y;
    if (Math.abs(dx) > Math.abs(dy)) {
      x += Math.sign(dx);
      if (rng() < 0.3) y += Math.sign(dy || (rng() < 0.5 ? 1 : -1));
    } else {
      y += Math.sign(dy);
      if (rng() < 0.3) x += Math.sign(dx || (rng() < 0.5 ? 1 : -1));
    }
    x = Math.max(1, Math.min(MAP_W - 2, x));
    y = Math.max(1, Math.min(MAP_H - 2, y));
  }
}

/** Blob of a ground kind, used for ponds, lava and forest floors. */
function blob(
  ground: GroundKind[],
  cx: number,
  cy: number,
  r: number,
  kind: GroundKind,
  rng: () => number,
) {
  for (let y = cy - r - 1; y <= cy + r + 1; y++) {
    for (let x = cx - r - 1; x <= cx + r + 1; x++) {
      if (x < 1 || x >= MAP_W - 1 || y < 1 || y >= MAP_H - 1) continue;
      const d = Math.hypot(x - cx, y - cy) / r;
      if (d > 1 + (rng() - 0.5) * 0.3) continue;
      ground[idx(x, y)] = kind;
    }
  }
}

export function buildOverworldMap(theme: ThemeId, seedKey: string, relicCount: number): OverworldMap {
  const set = TILE_SETS[theme];
  const rng = makeRng(hashStr(seedKey));

  const ground = new Array<GroundKind>(MAP_W * MAP_H);
  const solid = new Uint8Array(MAP_W * MAP_H);

  // ── base terrain with soft variation bands ──
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      // Low-frequency variation so large patches share a shade.
      const band = Math.sin(x * 0.21 + rng() * 0.2) + Math.cos(y * 0.17);
      const pick = band > 0.7 ? 3 : band < -0.9 ? 1 : 0;
      const v = set.variants[Math.min(pick, set.variants.length - 1)];
      ground[idx(x, y)] = v;
    }
  }

  // ── water / lava pools ──
  const pools: { x: number; y: number; r: number }[] = [];
  if (set.pool) {
    for (let i = 0; i < set.poolCount; i++) {
      const px = 8 + Math.floor(rng() * (MAP_W - 16));
      const py = 6 + Math.floor(rng() * (MAP_H - 20));
      const r = 3 + Math.floor(rng() * 3);
      blob(ground, px, py, r, set.pool, rng);
      pools.push({ x: px, y: py, r: r + 1 });
    }
  }

  // ── town plaza in the south, paved and compact ──
  const plazaX = Math.floor(MAP_W / 2);
  const plazaY = MAP_H - 9;
  const plazaHalfW = 7;
  const plazaHalfH = 4;
  for (let y = plazaY - plazaHalfH; y <= plazaY + plazaHalfH; y++) {
    for (let x = plazaX - plazaHalfW; x <= plazaX + plazaHalfW; x++) {
      if (x < 2 || x >= MAP_W - 2 || y < 2 || y >= MAP_H - 2) continue;
      // Rounded corners so the square does not read as a plain rectangle.
      const cx = Math.abs(x - plazaX) / plazaHalfW;
      const cy = Math.abs(y - plazaY) / plazaHalfH;
      if (cx > 0.85 && cy > 0.8) continue;
      ground[idx(x, y)] = 'plaza';
    }
  }

  // ── a route north to the prime location ──
  const primeX = plazaX + (rng() < 0.5 ? -6 : 6);
  const primeY = 8;
  carvePath(ground, rng, { x: plazaX, y: plazaY - plazaHalfH }, { x: primeX, y: primeY + 4 }, 'path');

  // ── a clearing off the route, holding the relics ──
  const clearX = plazaX + (primeX < plazaX ? 11 : -11);
  const clearY = Math.floor((plazaY + primeY) / 2);
  blob(ground, clearX, clearY, 5, set.variants[0], rng);
  carvePath(ground, rng, { x: plazaX, y: clearY }, { x: clearX, y: clearY }, 'path');

  // ── solid tiles from water ──
  for (let i = 0; i < ground.length; i++) {
    if (ground[i] === 'water' || ground[i] === 'lava') solid[i] = 1;
  }

  // ── decor ──
  const decor: PlacedDecor[] = [];
  const decorAt = new Map<number, DecorKind>();
  const blocked = new Uint8Array(MAP_W * MAP_H);

  const reserved = new Set<number>();
  const reserve = (x: number, y: number, r: number) => {
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
        reserved.add(idx(nx, ny));
      }
  };

  const spawn = { x: plazaX, y: plazaY };
  const prime = { x: primeX, y: primeY };
  reserve(spawn.x, spawn.y, 2);
  reserve(prime.x, prime.y, 3);

  // Relics spread through the clearing and along the route.
  const relics: { x: number; y: number }[] = [];
  for (let i = 0; i < relicCount; i++) {
    const a = (i / Math.max(1, relicCount)) * Math.PI * 2 + rng();
    const rx = Math.round(clearX + Math.cos(a) * (2 + rng() * 3));
    const ry = Math.round(clearY + Math.sin(a) * (2 + rng() * 3));
    const cx = Math.max(3, Math.min(MAP_W - 4, rx));
    const cy = Math.max(3, Math.min(MAP_H - 4, ry));
    relics.push({ x: cx, y: cy });
    reserve(cx, cy, 1);
  }

  const place = (x: number, y: number, kind: DecorKind) => {
    const i = idx(x, y);
    if (blocked[i] || ground[i] === 'water' || ground[i] === 'lava') return false;
    decor.push({ kind, tx: x, ty: y });
    decorAt.set(i, kind);
    if (isSolidDecor(kind)) blocked[i] = 1;
    return true;
  };

  // The town fountain, offset so it never lands on the spawn tile.
  const fountainX = plazaX + 3;
  const fountainY = plazaY - 2;
  if (ground[idx(fountainX, fountainY)] === 'plaza') {
    place(fountainX, fountainY, 'fountain');
    reserve(fountainX, fountainY, 2);
  }

  // Signposts where the route leaves the square, as a landmark.
  const signSpots: [number, number][] = [
    [plazaX - 1, plazaY - plazaHalfH - 1],
    [plazaX + 1, plazaY - plazaHalfH - 1],
  ];
  for (const [sx, sy] of signSpots) {
    if (sx < 2 || sy < 2 || sx >= MAP_W - 2 || sy >= MAP_H - 2) continue;
    if (ground[idx(sx, sy)] === 'plaza' || ground[idx(sx, sy)] === 'path') {
      place(sx, sy, 'signpost');
      reserve(sx, sy, 1);
    }
  }

  // Border treeline, two tiles deep, with an irregular inner edge.
  for (let x = 0; x < MAP_W; x++) {
    for (const depth of [0, 1]) {
      const jitter = rng() < 0.25 ? 1 : 0;
      if (depth === 1 && rng() < 0.35) continue;
      place(x, depth + jitter, set.border);
      place(x, MAP_H - 1 - depth - jitter, set.border);
    }
  }
  for (let y = 0; y < MAP_H; y++) {
    for (const depth of [0, 1]) {
      const jitter = rng() < 0.25 ? 1 : 0;
      if (depth === 1 && rng() < 0.35) continue;
      place(depth + jitter, y, set.border);
      place(MAP_W - 1 - depth - jitter, y, set.border);
    }
  }

  // Scattered decor, avoiding the plaza, the path and reserved tiles.
  const scatterKinds = set.decor.filter((d) => d !== 'house' && d !== 'tower' && d !== 'gate');
  const attempts = MAP_W * MAP_H * 0.9;
  for (let i = 0; i < attempts; i++) {
    const x = 2 + Math.floor(rng() * (MAP_W - 4));
    const y = 2 + Math.floor(rng() * (MAP_H - 4));
    const k = idx(x, y);
    if (reserved.has(k) || blocked[k]) continue;
    const g = ground[k];
    if (g === 'path' || g === 'plaza' || g === 'water' || g === 'lava') continue;
    // Density falls off near the plaza so the town stays walkable.
    const nearPlaza = Math.hypot(x - plazaX, y - plazaY) < 12;
    if (nearPlaza && rng() < 0.85) continue;
    if (rng() < 0.55) continue;
    const kind = scatterKinds[Math.floor(rng() * scatterKinds.length)];
    place(x, y, kind);
  }

  // Buildings line the plaza, drawn from the theme's structure palette.
  const buildings: DecorKind[] = set.decor.filter((d) =>
    ['house', 'tower', 'gate', 'tent'].includes(d),
  );
  if (buildings.length) {
    for (let i = 0; i < 6; i++) {
      const bx = plazaX - 8 + i * 3 + Math.floor(rng() * 2);
      const by = plazaY + plazaHalfH + 1 + (rng() < 0.4 ? 1 : 0);
      if (bx < 3 || bx >= MAP_W - 3 || by >= MAP_H - 3) continue;
      if (reserved.has(idx(bx, by))) continue;
      place(bx, by, buildings[Math.floor(rng() * buildings.length)]);
    }
  }

  // The prime location: a distinct structure with a clear apron in front.
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = prime.x + dx;
      const y = prime.y + dy;
      if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) continue;
      const k = idx(x, y);
      blocked[k] = 0;
      decorAt.delete(k);
    }
  }
  const primeKind: DecorKind = set.decor.includes('tower')
    ? 'tower'
    : set.decor.includes('gate')
      ? 'gate'
      : 'house';
  place(prime.x, prime.y, primeKind);
  // Keep the tiles around the prime walkable.
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = 1; dy <= 2; dy++) {
      const x = prime.x + dx;
      const y = prime.y + dy;
      if (x < 1 || x >= MAP_W - 1 || y < 1 || y >= MAP_H - 1) continue;
      blocked[idx(x, y)] = 0;
    }
  }

  // Remove decor that would seal the plaza or the relic clearing.
  const carveOut = (cx: number, cy: number, r: number) => {
    for (const d of decor) {
      if (Math.abs(d.tx - cx) <= r && Math.abs(d.ty - cy) <= r) {
        const k = idx(d.tx, d.ty);
        if (d.tx === prime.x && d.ty === prime.y) continue;
        blocked[k] = 0;
        decorAt.delete(k);
      }
    }
  };
  carveOut(spawn.x, spawn.y, plazaHalfH + 1);
  carveOut(clearX, clearY, 2);

  return {
    w: MAP_W,
    h: MAP_H,
    ground,
    solid,
    decor: decor.filter((d) => decorAt.get(idx(d.tx, d.ty)) === d.kind),
    spawn,
    prime,
    relics,
    decorAt,
    blocked,
  };
}

/** Ground pass: every terrain tile in view. Cheap and always fully covered. */
export function drawGroundRegion(
  ctx: CanvasRenderingContext2D,
  map: OverworldMap,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
) {
  const tx0 = Math.floor(camX / TILE) - 1;
  const ty0 = Math.floor(camY / TILE) - 1;
  const tx1 = Math.ceil((camX + viewW) / TILE) + 1;
  const ty1 = Math.ceil((camY + viewH) / TILE) + 1;

  for (let ty = ty0; ty <= ty1; ty++) {
    if (ty < 0 || ty >= map.h) continue;
    for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || tx >= map.w) continue;
      drawGround(ctx, map.ground[idx(tx, ty)], tx * TILE, ty * TILE, tx, ty);
    }
  }
}

/**
 * Decor pass over a row band. Splitting the band lets the caller draw the hero
 * between the objects behind them and the objects in front, which is what makes
 * a top-down map read with depth.
 */
export function drawDecorRegion(
  ctx: CanvasRenderingContext2D,
  map: OverworldMap,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
  fromRow: number,
  toRow: number,
) {
  const tx0 = Math.floor(camX / TILE) - 1;
  const ty0 = Math.max(fromRow, Math.floor(camY / TILE) - 1);
  const tx1 = Math.ceil((camX + viewW) / TILE) + 1;
  const ty1 = Math.min(toRow, Math.ceil((camY + viewH) / TILE) + 1);

  for (let ty = ty0; ty <= ty1; ty++) {
    if (ty < 0 || ty >= map.h) continue;
    for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || tx >= map.w) continue;
      const kind = map.decorAt.get(idx(tx, ty));
      if (!kind) continue;
      drawDecor(ctx, kind, tx * TILE, ty * TILE, tx, ty);
    }
  }
}
