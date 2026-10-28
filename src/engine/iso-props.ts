import { Bitmap, TAG, hash2, mix, outline, ramp, type Color } from './pixelkit';
import { GD, GW, Obj, SH, SW, WH, proj, rp, wallRect, wallPoint, type Tex } from './iso-kit';
import type { RoomDef } from '../data/rooms';

/**
 * What lives in a room. Everything here is data-driven from the `RoomDef`:
 * decor flags choose which furniture exists, the signature picks the themed
 * centrepiece, and the palette tints it all so each series reads as its own
 * place while sharing one cohesive moonlit look.
 */

export interface Light {
  x: number;
  y: number;
  r: number;
  color: Color;
  /** Flicker amplitude 0..1 */
  flicker: number;
}

export interface Slot {
  gx: number;
  gy: number;
  gz: number;
  depth: number;
  pose: 'stand' | 'sit';
  prop: 'none' | 'mug' | 'book' | 'handheld';
}

export interface CatSpot {
  gx: number;
  gy: number;
  gz: number;
  depth: number;
  fur: number;
  seed: number;
}

export interface PropSet {
  objs: Obj[];
  lights: Light[];
  slots: Slot[];
  /** Guest slot order for waifus; the MC always takes `hero`. */
  hero: Slot;
  cats: CatSpot[];
  particles: 'petals' | 'fireflies' | 'dust';
  /** Window position in scene pixels, for stars and moonlight. */
  window: { x0: number; y0: number; x1: number; y1: number };
}

const BOOK_COLORS = [0xb8444a, 0x3a6ab0, 0xd8a840, 0x4a9a6a, 0x8a5ab0, 0xe0e0d0, 0xc8683a];

type Ctx = { def: RoomDef; wood: Color; fabric: Color; accent: Color };

function mat(c: Color) {
  return rp(c);
}

// ── furniture builders ──────────────────────────────────────────────────────

function bed(c: Ctx): Obj[] {
  const frame = mat(c.wood);
  const sheet = mat(0xdfe4f4);
  const quilt: Tex = (f, x, y, u, v) => {
    if (f !== 't') return null;
    const a = (Math.floor(u * 5) + Math.floor(v * 5)) & 1;
    return a ? c.def.palette.rug[1] : mix(c.fabric, 0x5a7ad0, 0.5);
  };
  const back = new Obj(2.2, 'bed-back')
    .box(0.15, 0.8, 0, 2.1, 0.22, 20, frame, grain(frame.base))
    .finish();
  const main = new Obj(3.0, 'bed')
    .box(0.15, 0.8, 0, 2.1, 2.9, 6, frame, grain(frame.base))
    .box(0.22, 1.0, 6, 1.96, 2.55, 3.5, sheet)
    .box(0.22, 1.95, 6, 1.96, 1.6, 4.2, mat(mix(c.fabric, 0x4a64c0, 0.4)), quilt)
    .box(0.4, 1.05, 9.5, 1.5, 0.75, 2.6, mat(0xf4f6ff), undefined, true)
    .box(0.15, 3.48, 0, 2.1, 0.22, 11, frame, grain(frame.base))
    .finish();
  return [back, main];
}

function grain(base: Color): Tex {
  const g = mix(base, 0x000000, 0.22);
  return (f, x, y) => (f !== 't' && (y * 7 + x * 3) % 11 === 0 ? g : null);
}

function sofa(c: Ctx): Obj[] {
  const f = mat(c.fabric);
  const light = mat(mix(c.fabric, 0x7a8ee0, 0.25));
  const stitch: Tex = (fc, x, y) => (fc === 'l' && x % 8 === 0 && y % 2 === 0 ? mix(c.fabric, 0x000000, 0.3) : null);
  const back = new Obj(4.6, 'sofa-back').box(3.1, 0.3, 0, 2.7, 0.5, 17, f, stitch, true).box(3.1, 0.3, 0, 0.42, 1.3, 11, f, undefined, true).box(5.38, 0.3, 0, 0.42, 1.3, 11, f, undefined, true).finish();
  const seat = new Obj(5.0, 'sofa-seat').box(3.52, 0.8, 0, 1.86, 0.8, 7, light, stitch, true).finish();
  return [back, seat];
}

function pouf(gx: number, gy: number, color: Color, depth: number): Obj {
  const m = mat(color);
  const top: Tex = (f, x, y, u, v) => (f === 't' && Math.abs(u - 0.4) + Math.abs(v - 0.4) < 0.05 ? m.deep : null);
  return new Obj(depth, 'pouf').box(gx, gy, 0, 0.8, 0.8, 5.5, m, top, true).finish();
}

function table(c: Ctx): Obj {
  const w = mat(mix(c.wood, 0xc8905a, 0.35));
  const o = new Obj(7.2, 'table');
  for (const [dx, dy] of [[0.08, 0.08], [1.4, 0.08], [0.08, 1.0], [1.4, 1.0]]) o.box(3.2 + dx, 2.6 + dy, 0, 0.14, 0.14, 7, w);
  o.box(3.2, 2.6, 7, 1.62, 1.22, 2.5, w, grain(w.base));
  // cups, plate and a book on the top
  const cup = mat(0xf2f0f8);
  o.box(3.45, 2.8, 9.5, 0.2, 0.2, 3.2, cup).box(4.35, 3.25, 9.5, 0.2, 0.2, 3.2, cup);
  o.box(3.5, 2.9, 12.6, 0.1, 0.1, 0.3, mat(c.accent));
  o.box(3.9, 3.0, 9.5, 0.6, 0.5, 0.8, mat(0xf2e6d0));
  o.paint(0, 0, SW, SH, (b, dx, dy) => {
    const [px, py] = proj(4.2, 3.2, 10.7);
    for (const [ox, oy, col] of [[-3, 0, 0xd8964a], [0, 1, 0xe8a85a], [3, 0, 0xc8843a]] as [number, number, Color][]) {
      b.fill(px + ox - dx - 1, py + oy - dy - 1, 3, 2, col, TAG.prop);
    }
  });
  o.box(4.35, 2.7, 9.5, 0.55, 0.38, 1.5, mat(0x2a3560));
  return o.finish();
}

function plant(gx: number, gy: number, depth: number, hue = 0x3a8a4a): Obj {
  const o = new Obj(depth, 'plant').box(gx, gy, 0, 0.5, 0.5, 8, mat(0xb2603c), (f, x, y) => (f === 't' && false ? null : f !== 't' && y % 6 === 0 ? 0x8a4a2c : null), true);
  const [cx, cy] = proj(gx + 0.25, gy + 0.25, 8);
  o.paint(cx - 16, cy - 28, cx + 16, cy + 2, (b, dx, dy) => {
    const leaf = ramp(hue);
    for (const [ox, oy, rx, ry] of [[0, -9, 8, 8], [-8, -5, 6, 5], [8, -5, 6, 5], [-3, -16, 6, 5], [5, -15, 6, 5], [-12, 0, 4, 3], [12, 0, 4, 3]] as number[][]) {
      b.ellipse(cx + ox - dx, cy + oy - dy, rx, ry, leaf, { tag: TAG.prop });
    }
  });
  return o.finish();
}

function floorLamp(gx: number, gy: number, depth: number, color: Color): { obj: Obj; light: Light } {
  const pole = mat(0x2a2230);
  const shadeM = mat(mix(color, 0xffffff, 0.35));
  const o = new Obj(depth, 'lamp').box(gx, gy, 0, 0.5, 0.5, 2, pole).box(gx + 0.19, gy + 0.19, 2, 0.12, 0.12, 30, pole).box(gx + 0.05, gy + 0.05, 32, 0.4, 0.4, 9, shadeM, (f) => (f === 't' ? 0xfff3c8 : null)).finish();
  const [x, y] = proj(gx + 0.25, gy + 0.25, 36);
  return { obj: o, light: { x, y, r: 46, color, flicker: 0.06 } };
}

function bookshelf(c: Ctx): Obj {
  const w = mat(c.wood);
  const books: Tex = (f, x, y, u, v) => {
    if (f === 'r') return grain(w.base)(f, x, y, u, v);
    if (f !== 'l') return null;
    const shelfH = 15;
    const row = Math.floor(v / shelfH);
    const vv = v - row * shelfH;
    if (v > 41 || vv < 2) return c.wood;
    const i = Math.floor(u * 9);
    const h = 8 + Math.floor(hash2(i, row, 3) * 4);
    if (hash2(i, row, 9) < 0.14) return w.deep;
    if (vv - 2 > h) return w.deep;
    return BOOK_COLORS[Math.floor(hash2(i, row, 1) * BOOK_COLORS.length)];
  };
  return new Obj(1.0, 'shelf').box(0.4, 0.02, 0, 1.7, 0.6, 46, w, books).finish();
}

function fireplace(c: Ctx): { obj: Obj; light: Light } {
  const stone = mat(mix(c.def.palette.wall, 0x9a8a8a, 0.45));
  const fire = c.def.palette.fire;
  const tex: Tex = (f, x, y, u, v) => {
    if (f === 'r') {
      if (u > 0.4 && u < 1.4 && v > 2 && v < 21) {
        return v < 9 ? mix(0x1a0c0c, fire, 0.45 + (9 - v) * 0.03) : 0x1c0e10;
      }
      const row = Math.floor(v / 5);
      const col = Math.floor((u * 20 + (row & 1) * 5) / 10);
      return (v % 5 === 0 || Math.floor((u * 20 + (row & 1) * 5) % 10) === 0) ? stone.deep : mix(stone.base, 0x000000, hash2(row, col, 4) * 0.2);
    }
    return null;
  };
  const o = new Obj(8.6, 'fireplace').box(0.02, 3.95, 0, 0.75, 1.8, 30, stone, tex).box(0.0, 3.85, 30, 0.9, 2.0, 3, mat(c.wood)).finish();
  const [x, y] = proj(0.8, 4.85, 8);
  return { obj: o, light: { x, y, r: 62, color: fire, flicker: 0.22 } };
}

function cat(gx: number, gy: number, gz: number, depth: number, fur: number, seed: number): CatSpot {
  return { gx, gy, gz, depth, fur, seed };
}

// ── signature pieces ────────────────────────────────────────────────────────

function signature(c: Ctx, objs: Obj[], lights: Light[]): void {
  const pal = c.def.palette;
  const w = mat(c.wood);
  switch (c.def.signature) {
    case 'clock': {
      const o = new Obj(1.2, 'clock').box(6.15, 0.08, 0, 0.7, 0.55, 66, w, (f, x, y, u, v) => {
        if (f === 'l' && u > 0.12 && u < 0.58 && v > 44 && v < 60) return Math.hypot(u - 0.35, (v - 52) / 20 * 1.0) < 0.2 ? 0xf6efd8 : 0x2a1e18;
        if (f === 'l' && u > 0.2 && u < 0.5 && v > 6 && v < 38) return 0x2a1e18;
        return f !== 't' && (x + y) % 9 === 0 ? mix(c.wood, 0x000000, 0.25) : null;
      }).finish();
      objs.push(o);
      break;
    }
    case 'trainingDummy': {
      const o = new Obj(8.8, 'dummy').box(5.9, 4.3, 0, 0.5, 0.5, 4, w).box(6.08, 4.48, 4, 0.14, 0.14, 36, w).box(5.8, 4.43, 26, 0.7, 0.24, 4, w);
      o.paint(0, 0, SW, SH, (b, dx, dy) => {
        const [x, y] = proj(6.15, 4.55, 24);
        b.ellipse(x - dx, y - dy - 6, 6, 7, ramp(0xc8a860), { tag: TAG.prop });
        b.ellipse(x - dx, y - dy - 20, 4.5, 4.5, ramp(0xc8a860), { tag: TAG.prop });
        for (let i = -4; i <= 4; i += 2) b.set(x - dx + i, y - dy - 12, 0x8a6a30, TAG.prop);
      });
      objs.push(o.finish());
      break;
    }
    case 'cockpit': {
      const m = mat(0x2a3050);
      const glow = 0x58e0f0;
      const o = new Obj(8.9, 'console').box(5.0, 4.6, 0, 1.7, 0.9, 14, m, (f, x, y, u, v) => (f === 'l' && v > 4 && v < 12 && u > 0.1 && u < 1.6 ? ((x >> 1) + (y >> 1)) % 3 ? glow : 0x2a8aa8 : null)).box(5.0, 4.6, 14, 1.7, 0.5, 14, m, (f, x, y, u, v) => (f === 'l' && u > 0.1 && u < 1.6 && v > 2 && v < 12 ? mix(0x1a4a6a, glow, hash2(x >> 1, y >> 1, 2)) : null)).finish();
      objs.push(o);
      const [lx, ly] = proj(5.9, 5.2, 12);
      lights.push({ x: lx, y: ly, r: 40, color: glow, flicker: 0.1 });
      break;
    }
    case 'arcade': {
      const m = mat(0x2a2050);
      const o = new Obj(8.9, 'arcade').box(5.85, 4.5, 0, 0.9, 0.85, 56, m, (f, x, y, u, v) => {
        if (f === 'l' && u > 0.12 && u < 0.78 && v > 30 && v < 46) return mix(0xff4aa8, 0x4ae0ff, ((x >> 2) + (y >> 2)) % 2);
        if (f === 'l' && v > 50) return 0xff4aa8;
        if (f === 'l' && v > 12 && v < 24 && u > 0.2 && u < 0.7) return (x + y) % 4 ? m.base : 0xffd84a;
        return null;
      }).finish();
      objs.push(o);
      const [lx, ly] = proj(6.2, 5.35, 36);
      lights.push({ x: lx, y: ly, r: 44, color: 0xff5ab8, flicker: 0.12 });
      break;
    }
    case 'blossoms': {
      const o = new Obj(8.9, 'tree').box(6.0, 4.7, 0, 0.5, 0.5, 6, mat(0xb2603c), undefined, true).box(6.17, 4.87, 6, 0.16, 0.16, 28, mat(0x6a4a3a));
      const [cx, cy] = proj(6.25, 4.95, 34);
      o.paint(cx - 26, cy - 24, cx + 26, cy + 14, (b, dx, dy) => {
        const pet = ramp(pal.lamp === 0 ? 0xf8a8c8 : 0xf6a8c8);
        for (const [ox, oy, rx, ry] of [[0, -6, 12, 9], [-11, 2, 9, 7], [11, 2, 9, 7], [-4, -14, 8, 6], [6, -13, 8, 6]] as number[][]) b.ellipse(cx + ox - dx, cy + oy - dy, rx, ry, pet, { tag: TAG.prop });
      });
      objs.push(o.finish());
      break;
    }
    case 'herbStall': {
      const o = new Obj(8.7, 'herbs').box(5.5, 4.6, 0, 1.4, 0.7, 16, w, grain(w.base)).box(5.5, 4.6, 16, 1.4, 0.7, 2, mat(mix(c.wood, 0xc8a060, 0.4)));
      o.paint(0, 0, SW, SH, (b, dx, dy) => {
        const [x, y] = proj(5.6, 4.7, 18);
        for (let i = 0; i < 4; i++) {
          const col = [0x6ac07a, 0xe8d070, 0xb86ad0, 0xe86a6a][i];
          b.rrect(x + i * 7 - dx, y - 8 - dy, 5, 7, ramp(col), { tag: TAG.prop });
          b.fill(x + i * 7 + 1 - dx, y - 10 - dy, 3, 2, 0x7a5a3a, TAG.prop);
        }
      });
      objs.push(o.finish());
      break;
    }
    case 'shrine': {
      const red = mat(0xc0392b);
      const o = new Obj(8.8, 'shrine').box(5.7, 4.5, 0, 1.0, 0.9, 8, w).box(5.8, 4.6, 8, 0.1, 0.1, 22, red).box(6.6, 4.6, 8, 0.1, 0.1, 22, red).box(5.65, 4.55, 28, 1.15, 0.28, 4, red).box(5.75, 4.55, 24, 0.95, 0.2, 2, red).finish();
      objs.push(o);
      break;
    }
    case 'lanterns': {
      for (const [gx, gy, z] of [[2.2, 1.8, 66], [4.4, 2.2, 72], [5.6, 4.0, 62]] as number[][]) {
        const o = new Obj(40, 'lantern');
        const [x, y] = proj(gx, gy, z);
        o.paint(x - 8, y - 22, x + 8, y + 12, (b, dx, dy) => {
          b.line(x - dx, y - 20 - dy, x - dx, y - 6 - dy, 0x2a1e18, 1, TAG.prop);
          b.rrect(x - 4 - dx, y - 6 - dy, 8, 11, ramp(0xff9a3a), { tag: TAG.prop, shading: 0.4 });
          b.fill(x - 5 - dx, y - 7 - dy, 10, 2, 0x4a2a1a, TAG.prop);
          b.fill(x - 5 - dx, y + 4 - dy, 10, 2, 0x4a2a1a, TAG.prop);
          b.fill(x - 1 - dx, y - 3 - dy, 2, 5, 0xfff0b0, TAG.prop);
        });
        objs.push(o.finish());
        lights.push({ x, y, r: 34, color: 0xffa040, flicker: 0.12 });
      }
      break;
    }
    default:
      break;
  }
}

// ── wall decor ──────────────────────────────────────────────────────────────

export type WallStyle = 'brick' | 'plank';
const BRICK_ROOMS = new Set(['aot', 'rezero', 'fate', 'camelot']);
export function wallStyleOf(def: RoomDef): WallStyle {
  return BRICK_ROOMS.has(def.id) ? 'brick' : 'plank';
}
type Skyline = 'castle' | 'town' | 'forest';
function skylineOf(def: RoomDef): Skyline {
  if (['aot', 'rezero', 'fate', 'camelot'].includes(def.id)) return 'castle';
  if (['naruto', 'demonslayer', 'meadow', 'wisteria'].includes(def.id)) return 'forest';
  return 'town';
}

export const WINDOW_A = [2.8, 5.4] as const;
export const WINDOW_Z = [30, 76] as const;

/** Paint wall-mounted decor onto the static background. */
export function paintWallDecor(bg: Bitmap, def: RoomDef, portraits: Bitmap[]): { x0: number; y0: number; x1: number; y1: number } {
  const pal = def.palette;
  const frame = pal.beam;
  const [a0, a1] = WINDOW_A;
  const [z0, z1] = WINDOW_Z;
  const sky = skylineOf(def);
  const skyTop = mix(pal.background, 0x0c1448, 0.7);
  const skyLow = mix(pal.background, 0x3a4aa8, 0.55);
  const W = a1 - a0;

  // arched night window with moon, stars, skyline
  wallRect(bg, 'R', a0 - 0.12, a1 + 0.12, z0 - 5, z1 + 6, (a, z, u, v) => {
    const inner = a >= a0 && a < a1 && z >= z0 && z < z1;
    const cx = (a0 + a1) / 2;
    const archR = W / 2;
    const archTop = z1 - archR * 20;
    const inArch = z < archTop || Math.hypot((a - cx) * 20, z - archTop) <= archR * 20;
    if (inner && inArch) {
      const t = (z - z0) / (z1 - z0);
      let col = mix(skyLow, skyTop, Math.min(1, t * 1.15));
      if (hash2(Math.floor(a * 20), Math.floor(z), 7) > 0.985 && t > 0.3) col = 0xdfe8ff;
      // moon
      const mx = a0 + W * 0.74;
      const mz = z0 + (z1 - z0) * 0.7;
      const md = Math.hypot((a - mx) * 20, z - mz);
      if (md < 6) return md < 4.6 ? 0xf4f0d8 : mix(0xf4f0d8, skyTop, 0.5);
      if (md < 9) return mix(col, 0xaab8f0, 0.3);
      // skyline
      const hz = z0 + 10;
      const k = Math.floor((a - a0) * 20);
      if (sky === 'castle') {
        const hh = k % 17 < 3 ? 22 : k % 17 < 10 ? 14 : 8;
        const tower = k > 18 && k < 28 ? 30 : 0;
        if (z < hz + Math.max(hh, tower)) {
          const lit = z > hz + 5 && z < hz + Math.max(hh, tower) - 3 && k % 5 >= 1 && k % 5 <= 2 && Math.floor(z) % 6 < 2 && hash2(Math.floor(k / 5), Math.floor(z / 6), 3) > 0.45;
          return lit ? 0xffd070 : 0x141a3a;
        }
      } else if (sky === 'forest') {
        const th = 14 + hash2(Math.floor(k / 4), 2, 5) * 22;
        const tri = th * (1 - Math.abs(((k % 8) - 4) / 4));
        if (z < hz - 6 + tri) return 0x0e1a2e;
        if (z < hz) return 0x14223a;
      } else {
        const bh = 8 + Math.floor(hash2(Math.floor(k / 6), 1, 9) * 22);
        if (z < hz + bh) return hash2(k >> 1, Math.floor(z / 4), 6) > 0.72 && k % 6 > 0 ? 0xffc860 : 0x141a3a;
      }
      return col;
    }
    // frame, with mullions
    const mull = inner && (Math.abs((a - (a0 + a1) / 2) * 20) < 1.2 || Math.abs(z - (z0 + (z1 - z0) * 0.45)) < 1.1);
    const onFrame = !inner || mull || !inArch;
    if (!inner && Math.hypot((a - (a0 + a1) / 2) * 20, z - archTop) > archR * 20 + 4 && z > archTop) return null;
    if (onFrame) {
      if (z < z0 - 1) return mix(frame, 0xc8a070, 0.35);
      return mix(frame, 0xc8a070, 0.45 + 0.12 * ((u * 20) % 2 < 1 ? 1 : 0));
    }
    return null;
  });
  // sill
  wallRect(bg, 'R', a0 - 0.2, a1 + 0.2, z0 - 8, z0 - 4, (a, z) => (z < z0 - 6 ? mix(frame, 0x000000, 0.3) : mix(frame, 0xc8a070, 0.45)));

  // picture frames on the left wall with resident portraits
  const frames: [number, number, number, number][] = [[0.9, 1.7, 48, 68], [2.35, 3.1, 52, 68]];
  frames.forEach(([ga, gb, fz0, fz1], i) => {
    const art = portraits[i % Math.max(1, portraits.length)];
    wallRect(bg, 'L', ga, gb, fz0, fz1, (a, z, u, v) => {
      const edge = u < 0.05 || gb - ga - u < 0.05 || v < 2 || fz1 - fz0 - v < 2;
      if (edge) return mix(frame, 0xe0b878, 0.4);
      if (art) {
        // the left wall runs screen-leftward as gy grows, so mirror the lookup
        const ax = Math.floor((1 - u / (gb - ga - 0.1)) * art.w * 0.7 + art.w * 0.15);
        const ay = Math.floor((1 - v / (fz1 - fz0)) * 22 + 4);
        const c = art.get(Math.max(0, Math.min(art.w - 1, ax)), Math.max(0, Math.min(art.h - 1, ay)));
        if (c) return c & 0xffffff;
      }
      return mix(pal.wall, 0x7a8ad8, 0.35);
    });
  });

  // series hanging banners flank the window for banner rooms
  if (def.signature === 'banners') {
    for (const [ga, gb] of [[2.2, 2.6], [5.6, 6.0]] as [number, number][]) {
      wallRect(bg, 'R', ga, gb, 22, 78, (a, z, u, v) => {
        if (z < 30 && Math.abs(u - (gb - ga) / 2) < (30 - z) * 0.012 * 1) return null;
        const cx = (gb - ga) / 2;
        const sigil = Math.hypot((u - cx) * 20, z - 56) < 4.5 && Math.hypot((u - cx) * 20, z - 56) > 2.4;
        return sigil ? 0xe8c870 : z > 74 ? 0xe8c870 : pal.rug[1];
      });
    }
  }
  return { x0: 0, y0: 0, x1: SW, y1: SH };
}

// ── prop set assembly ───────────────────────────────────────────────────────

export function buildProps(def: RoomDef): PropSet {
  const pal = def.palette;
  const wood = mix(pal.beam, 0x9a6a42, 0.5);
  const fabric = mix(pal.rug[0], 0x34408a, 0.62);
  const c: Ctx = { def, wood, fabric, accent: pal.rug[2] ?? 0xd8b06a };
  const objs: Obj[] = [];
  const lights: Light[] = [];
  const d = def.decor;

  if (d.bed) objs.push(...bed(c));
  objs.push(...sofa(c));
  if (d.bookshelf) objs.push(bookshelf(c));
  if (d.teaTable) objs.push(table(c));
  if (d.fireplace) {
    const f = fireplace(c);
    objs.push(f.obj);
    lights.push(f.light);
  }
  const cushion = mix(pal.rug[1], 0x3a4a9a, 0.4);
  objs.push(pouf(2.55, 3.35, cushion, 6.3), pouf(5.2, 3.0, mix(pal.rug[0], 0x4a3a8a, 0.5), 8.6), pouf(3.6, 4.55, mix(pal.rug[2] ?? 0xd8b06a, 0x5a4a9a, 0.5), 9.0));
  if (d.plants) objs.push(plant(6.35, 0.35, 1.5), plant(0.35, 5.5, 9.9, 0x4a9a5a), plant(6.4, 5.45, 11.8, 0x3a8a4a));
  if (d.lamps) {
    for (const [gx, gy, dep] of [[2.55, 0.35, 3.0], [0.4, 3.75, 4.8]] as number[][]) {
      const l = floorLamp(gx, gy, dep, pal.lamp);
      objs.push(l.obj);
      lights.push(l.light);
    }
  }
  signature(c, objs, lights);

  const seed = [...def.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const cats: CatSpot[] = [cat(2.75, 3.55, 5.5, 6.6, seed % 3, seed)];
  if (seed % 2 === 0) cats.push(cat(1.2, 2.6, 9.5, 3.4, (seed + 1) % 3, seed + 5));

  const slots: Slot[] = [
    { gx: 3.85, gy: 1.2, gz: 7, depth: 5.2, pose: 'sit', prop: 'mug' },
    { gx: 4.85, gy: 1.2, gz: 7, depth: 6.2, pose: 'sit', prop: 'book' },
    { gx: 1.15, gy: 2.4, gz: 9.5, depth: 3.7, pose: 'sit', prop: 'none' },
    { gx: 5.5, gy: 3.35, gz: 5.5, depth: 8.7, pose: 'sit', prop: 'mug' },
    { gx: 6.0, gy: 2.3, gz: 0, depth: 8.4, pose: 'stand', prop: 'none' },
    { gx: 2.1, gy: 4.9, gz: 0, depth: 7.0, pose: 'stand', prop: 'none' },
  ];
  const hero: Slot = { gx: 3.95, gy: 4.95, gz: 5.5, depth: 9.4, pose: 'sit', prop: 'handheld' };

  const [wx0, wy0] = wallPoint('R', WINDOW_A[0], WINDOW_Z[0]);
  const [wx1, wy1] = wallPoint('R', WINDOW_A[1], WINDOW_Z[1]);
  const particles = def.signature === 'blossoms' ? 'petals' : ['naruto', 'demonslayer', 'meadow', 'wisteria'].includes(def.id) ? 'fireflies' : 'dust';

  void GW;
  void GD;
  void WH;
  void outline;
  return { objs, lights, slots, hero, cats, particles, window: { x0: wx0, y0: wy1, x1: wx1, y1: wy0 } };
}

// ── cat sprite ──────────────────────────────────────────────────────────────

const FURS = [
  { base: 0xf0ecf4, patch: 0xb8b4c4 },
  { base: 0xe89a4a, patch: 0xb86a2a },
  { base: 0x6a6a7a, patch: 0x3e3e4c },
];

const catCache = new Map<string, Bitmap>();
export function catBitmap(fur: number, frame: number, blink: boolean): Bitmap {
  const k = `${fur}|${frame}|${blink ? 1 : 0}`;
  const hit = catCache.get(k);
  if (hit) return hit;
  const f = FURS[fur % FURS.length];
  const base = ramp(f.base);
  const patch = ramp(f.patch);
  const b = new Bitmap(20, 18);
  // tail first (behind)
  const tail = frame ? [[13, 11], [14, 10], [15, 9], [15, 8]] : [[13, 12], [14, 12], [15, 11], [16, 10]];
  for (const [x, y] of tail) b.fill(x, y, 2, 2, base.sh, TAG.prop);
  b.ellipse(8, 11.5, 5.2, 4.6, base, { tag: TAG.prop });
  b.ellipse(6.5, 12.5, 2.4, 2, patch, { tag: TAG.prop, shading: 0 });
  b.ellipse(8, 5.5, 4.4, 3.6, base, { tag: TAG.prop });
  for (const sx of [-1, 1]) {
    const x = 8 + sx * 3;
    b.set(x, 1, base.base, TAG.prop);
    b.set(x, 2, base.hi, TAG.prop);
    b.set(x + sx * 0, 3, base.base, TAG.prop);
    b.set(x + sx, 2, base.base, TAG.prop);
  }
  b.fill(7, 1, 1, 0, 0, 0);
  const eye = 0x2a2030;
  if (blink) {
    b.fill(5, 6, 2, 1, eye, TAG.eye);
    b.fill(9, 6, 2, 1, eye, TAG.eye);
  } else {
    b.fill(5, 5, 2, 2, eye, TAG.eye);
    b.fill(9, 5, 2, 2, eye, TAG.eye);
    b.set(5, 5, 0xffffff, TAG.eye);
    b.set(9, 5, 0xffffff, TAG.eye);
  }
  b.set(8, 7, 0xe08aa0, TAG.eye);
  const out = outline(b, 0.38);
  catCache.set(k, out);
  return out;
}
