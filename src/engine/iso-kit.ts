import { Bitmap, TAG, mix, outline, ramp, type Color, type Ramp } from './pixelkit';

/**
 * Pixel-exact isometric drawing.
 *
 * Boxes and wall decals are rasterised by inverting the projection for every
 * screen pixel, so faces land on the pixel grid with no anti-aliasing and
 * textures can be written as plain functions of face coordinates.
 *
 * Grid axes: gx runs down-right, gy runs down-left, gz is up in screen pixels.
 * The back-left wall lies in the plane gx = 0, the back-right wall in gy = 0.
 */

export const TW = 40;
export const TH = 20;
export const GW = 7;
export const GD = 6;
export const WH = 86;
export const SW = 296;
export const SH = 244;
export const OX = 150;
export const OY = 94;

export function proj(gx: number, gy: number, gz = 0): [number, number] {
  return [OX + ((gx - gy) * TW) / 2, OY + ((gx + gy) * TH) / 2 - gz];
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bay(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

const rcache = new Map<number, Ramp>();
export function rp(c: Color): Ramp {
  let r = rcache.get(c);
  if (!r) {
    r = ramp(c);
    rcache.set(c, r);
  }
  return r;
}

export const FACE = { top: 11, left: 12, right: 13 } as const;

export type Tex = (face: 't' | 'l' | 'r', x: number, y: number, u: number, v: number) => Color | null;

export interface BoxSpec {
  gx: number;
  gy: number;
  gz: number;
  sx: number;
  sy: number;
  sz: number;
  mat: Ramp;
  tex?: Tex;
  /** Remove the vertical corner pixels for a soft cushion look. */
  round?: boolean;
}

/** Screen-space bounds of a box, padded by a pixel. */
export function boxBounds(s: Pick<BoxSpec, 'gx' | 'gy' | 'gz' | 'sx' | 'sy' | 'sz'>) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const dx of [0, s.sx]) {
    for (const dy of [0, s.sy]) {
      for (const dz of [0, s.sz]) {
        const [x, y] = proj(s.gx + dx, s.gy + dy, s.gz + dz);
        xs.push(x);
        ys.push(y);
      }
    }
  }
  return { x0: Math.floor(Math.min(...xs)) - 2, y0: Math.floor(Math.min(...ys)) - 2, x1: Math.ceil(Math.max(...xs)) + 2, y1: Math.ceil(Math.max(...ys)) + 2 };
}

/** Paint one box into a bitmap whose origin is the scene point (dx, dy). */
export function paintBox(b: Bitmap, dx: number, dy: number, s: BoxSpec) {
  const { gx: gx0, gy: gy0, gz, sx, sy, sz, mat } = s;
  const gx1 = gx0 + sx;
  const gy1 = gy0 + sy;
  const zt = gz + sz;
  const bb = boxBounds(s);
  for (let py = bb.y0; py <= bb.y1; py++) {
    for (let px = bb.x0; px <= bb.x1; px++) {
      const cx = px + 0.5 - OX;
      const cy = py + 0.5 - OY;
      const lx = px - dx;
      const ly = py - dy;
      if (lx < 0 || ly < 0 || lx >= b.w || ly >= b.h) continue;

      // Top face: invert the projection at z = zt.
      const a = cx / (TW / 2);
      const c = (cy + zt) / (TH / 2);
      const tx = (a + c) / 2;
      const ty = (c - a) / 2;
      if (tx >= gx0 && tx < gx1 && ty >= gy0 && ty < gy1) {
        const rim = Math.min(gx1 - tx, gy1 - ty) < 0.075;
        let col = rim ? mat.hi : (px + py) & 1 && Math.min(tx - gx0, ty - gy0) < 0.05 ? mat.hi : mat.base;
        const t = s.tex?.('t', px, py, tx - gx0, ty - gy0);
        if (t != null) col = t;
        b.set(lx, ly, col, FACE.top);
        continue;
      }
      // Left face: the plane gy = gy1, facing the camera's lower-left.
      {
        const gx = cx / (TW / 2) + gy1;
        const z = OY + ((gx + gy1) * TH) / 2 - (py + 0.5);
        if (gx >= gx0 && gx < gx1 && z >= gz && z < zt) {
          if (s.round && (gx - gx0 < 0.05 || gx1 - gx < 0.05) && (z - gz < 1 || zt - z < 1)) continue;
          let col = gx1 - gx < 0.06 ? mix(mat.base, mat.hi, 0.6) : z - gz < 1.2 ? mat.sh : mat.base;
          const t = s.tex?.('l', px, py, gx - gx0, z - gz);
          if (t != null) col = t;
          b.set(lx, ly, col, FACE.left);
          continue;
        }
      }
      // Right face: the plane gx = gx1, facing the camera's lower-right.
      {
        const gyy = gx1 - cx / (TW / 2);
        const z = OY + ((gx1 + gyy) * TH) / 2 - (py + 0.5);
        if (gyy >= gy0 && gyy < gy1 && z >= gz && z < zt) {
          let col = z - gz < 1.2 ? mat.deep : mat.sh;
          const t = s.tex?.('r', px, py, gyy - gy0, z - gz);
          if (t != null) col = t;
          b.set(lx, ly, col, FACE.right);
        }
      }
    }
  }
}

/** A depth-sorted piece of furniture rendered once into its own bitmap. */
export class Obj {
  readonly boxes: BoxSpec[] = [];
  readonly extras: ((b: Bitmap, dx: number, dy: number) => void)[] = [];
  private pads = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
  bmp: Bitmap | null = null;
  dx = 0;
  dy = 0;

  constructor(
    public depth: number,
    public name = '',
  ) {}

  private grow(x0: number, y0: number, x1: number, y1: number) {
    const p = this.pads;
    p.x0 = Math.min(p.x0, x0);
    p.y0 = Math.min(p.y0, y0);
    p.x1 = Math.max(p.x1, x1);
    p.y1 = Math.max(p.y1, y1);
  }

  box(gx: number, gy: number, gz: number, sx: number, sy: number, sz: number, mat: Ramp | Color, tex?: Tex, round = false): this {
    const m = typeof mat === 'number' ? rp(mat) : mat;
    const s: BoxSpec = { gx, gy, gz, sx, sy, sz, mat: m, tex, round };
    const bb = boxBounds(s);
    this.grow(bb.x0, bb.y0, bb.x1, bb.y1);
    this.boxes.push(s);
    return this;
  }

  /** Free-form pixel work in scene coordinates; `x0..` reserve space. */
  paint(x0: number, y0: number, x1: number, y1: number, fn: (b: Bitmap, dx: number, dy: number) => void): this {
    this.grow(x0, y0, x1, y1);
    this.extras.push(fn);
    return this;
  }

  /** Rasterise, then add the selective outline. */
  finish(): this {
    const p = this.pads;
    const pad = 2;
    this.dx = p.x0 - pad;
    this.dy = p.y0 - pad;
    const b = new Bitmap(p.x1 - p.x0 + pad * 2 + 1, p.y1 - p.y0 + pad * 2 + 1);
    for (const s of this.boxes) paintBox(b, this.dx, this.dy, s);
    for (const f of this.extras) f(b, this.dx, this.dy);
    this.bmp = outline(b, 0.4);
    return this;
  }
}

export type Plane = 'L' | 'R';

/**
 * Paint a rectangle on a wall. `a` runs along the wall (gy on the left wall,
 * gx on the right), `z` is height in pixels. The painter receives wall
 * coordinates plus the offset from the rectangle's corner.
 */
export function wallRect(
  bg: Bitmap,
  plane: Plane,
  a0: number,
  a1: number,
  z0: number,
  z1: number,
  fn: (a: number, z: number, u: number, v: number, x: number, y: number) => Color | null,
) {
  for (let py = 0; py < bg.h; py++) {
    for (let px = 0; px < bg.w; px++) {
      let a: number;
      if (plane === 'R') a = (px + 0.5 - OX) / (TW / 2);
      else a = (OX - (px + 0.5)) / (TW / 2);
      if (a < a0 || a >= a1) continue;
      const z = OY + (a * TH) / 2 - (py + 0.5);
      if (z < z0 || z >= z1) continue;
      const c = fn(a, z, a - a0, z - z0, px, py);
      if (c != null) bg.set(px, py, c, TAG.none);
    }
  }
}

/** Convert a wall point (along-wall `a`, height `z`) to scene pixels. */
export function wallPoint(plane: Plane, a: number, z: number): [number, number] {
  return plane === 'R' ? proj(a, 0, z) : proj(0, a, z);
}

export function floorAt(px: number, py: number): [number, number] {
  const a = (px + 0.5 - OX) / (TW / 2);
  const c = (py + 0.5 - OY) / (TH / 2);
  return [(a + c) / 2, (c - a) / 2];
}
