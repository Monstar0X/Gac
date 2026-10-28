/**
 * A tiny CPU raster toolkit for hand-feel pixel art.
 *
 * Everything the chibi sprites and the isometric rooms draw goes through a
 * `Bitmap` (one packed ARGB word per pixel) instead of canvas paths. That gives
 * us three things canvas strokes cannot: exact control over every pixel, a
 * shading model with ordered dither, and a selective-outline pass that tints
 * each outline from the colour it surrounds — the look of the reference art.
 */

export type Color = number; // 0xRRGGBB

export function r8(c: Color) {
  return (c >> 16) & 0xff;
}
export function g8(c: Color) {
  return (c >> 8) & 0xff;
}
export function b8(c: Color) {
  return c & 0xff;
}
export function rgb(r: number, g: number, b: number): Color {
  const cl = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (cl(r) << 16) | (cl(g) << 8) | cl(b);
}
export function mix(a: Color, b: Color, t: number): Color {
  return rgb(
    r8(a) + (r8(b) - r8(a)) * t,
    g8(a) + (g8(b) - g8(a)) * t,
    b8(a) + (b8(b) - b8(a)) * t,
  );
}
/** Channel offset, used for quick light/dark nudges. */
export function shade(c: Color, amt: number): Color {
  return rgb(r8(c) + amt, g8(c) + amt, b8(c) + amt);
}
export function lum(c: Color): number {
  return 0.299 * r8(c) + 0.587 * g8(c) + 0.114 * b8(c);
}
export function css(c: Color): string {
  return `#${(c & 0xffffff).toString(16).padStart(6, '0')}`;
}

/** Four-tone ramp, light to dark. */
export interface Ramp {
  hi: Color;
  base: Color;
  sh: Color;
  deep: Color;
}

const WARM = 0xfff0d0;
const COOL = 0x2c1f55;

/**
 * Build a hue-shifted ramp: highlights drift warm, shadows drift toward
 * indigo. Plain brightness ramps look muddy at 4 tones; the hue shift is what
 * keeps small sprites lively.
 */
export function ramp(base: Color): Ramp {
  const l = lum(base);
  // Very dark inputs need a gentler shadow step or they collapse to black.
  const k = l < 60 ? 0.82 : 0.74;
  return {
    hi: mix(rgb(r8(base) * 1.16 + 12, g8(base) * 1.14 + 10, b8(base) * 1.1 + 8), WARM, 0.16),
    base,
    sh: mix(rgb(r8(base) * k, g8(base) * k, b8(base) * (k + 0.04)), COOL, 0.14),
    deep: mix(rgb(r8(base) * k * 0.7, g8(base) * k * 0.68, b8(base) * k * 0.78), COOL, 0.3),
  };
}

const BAYER = [0, 0.5, 0.75, 0.25];

export interface ShapeOpts {
  /** Light direction, defaults to top-left. */
  light?: [number, number];
  /** Tag written to the layer buffer, used for cast shadows. */
  tag?: number;
  /** 0 = flat colour, 1 = normal shading, 2 = strong. */
  shading?: number;
  /** Extra per-pixel gate. */
  clip?: (x: number, y: number) => boolean;
  /** Only paint where the destination is empty. */
  under?: boolean;
}

export const TAG = {
  none: 0,
  skin: 1,
  hair: 2,
  cloth: 3,
  eye: 4,
  accessory: 5,
  prop: 6,
} as const;

export class Bitmap {
  readonly px: Uint32Array;
  readonly tag: Uint8Array;
  private cv: HTMLCanvasElement | null = null;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.px = new Uint32Array(w * h);
    this.tag = new Uint8Array(w * h);
  }

  inb(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x: number, y: number): number {
    return this.inb(x, y) ? this.px[y * this.w + x] : 0;
  }

  tagAt(x: number, y: number): number {
    return this.inb(x, y) ? this.tag[y * this.w + x] : 0;
  }

  set(x: number, y: number, c: Color, tag = 0) {
    if (!this.inb(x, y)) return;
    const i = y * this.w + x;
    this.px[i] = (0xff000000 | c) >>> 0;
    this.tag[i] = tag;
    this.cv = null;
  }

  /** Alpha-blend a translucent colour over what is already there. */
  blend(x: number, y: number, c: Color, a: number) {
    if (!this.inb(x, y)) return;
    const i = y * this.w + x;
    const dst = this.px[i];
    if (!dst) {
      return;
    }
    const d = dst & 0xffffff;
    this.px[i] = (0xff000000 | mix(d, c, a)) >>> 0;
    this.cv = null;
  }

  clear() {
    this.px.fill(0);
    this.tag.fill(0);
    this.cv = null;
  }

  /** Paint a rectangle in one flat colour. */
  fill(x: number, y: number, w: number, h: number, c: Color, tag = 0) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c, tag);
  }

  /**
   * Fill an arbitrary region with the four-tone shading model. `bbox` sets the
   * normalisation so the light falls across the whole shape, not the canvas.
   */
  shape(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    inside: (x: number, y: number) => boolean,
    rp: Ramp,
    o: ShapeOpts = {},
  ) {
    const lx = o.light?.[0] ?? -0.55;
    const ly = o.light?.[1] ?? -0.85;
    const strength = o.shading ?? 1;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const rx = Math.max(1, (x1 - x0) / 2);
    const ry = Math.max(1, (y1 - y0) / 2);
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
      for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        if (!this.inb(x, y)) continue;
        if (!inside(x, y)) continue;
        if (o.clip && !o.clip(x, y)) continue;
        if (o.under && this.px[y * this.w + x]) continue;
        let c = rp.base;
        if (strength > 0) {
          const nx = (x + 0.5 - cx) / rx;
          const ny = (y + 0.5 - cy) / ry;
          const t = (nx * lx + ny * ly) * strength + (BAYER[(y & 1) * 2 + (x & 1)] - 0.4) * 0.09;
          if (t < -0.52) c = rp.hi;
          else if (t > 0.86) c = rp.deep;
          else if (t > 0.34) c = rp.sh;
        }
        this.set(x, y, c, o.tag ?? 0);
      }
    }
  }

  /** Superellipse: p = 2 is an ellipse, higher is boxier, which suits chibi heads. */
  ellipse(cx: number, cy: number, rx: number, ry: number, rp: Ramp, o: ShapeOpts & { p?: number } = {}) {
    const p = o.p ?? 2;
    this.shape(
      cx - rx,
      cy - ry,
      cx + rx,
      cy + ry,
      (x, y) => Math.pow(Math.abs((x + 0.5 - cx) / rx), p) + Math.pow(Math.abs((y + 0.5 - cy) / ry), p) <= 1,
      rp,
      o,
    );
  }

  rect(x: number, y: number, w: number, h: number, rp: Ramp, o: ShapeOpts = {}) {
    this.shape(x, y, x + w - 1, y + h - 1, (px, py) => px >= x && px < x + w && py >= y && py < y + h, rp, o);
  }

  /** Rectangle with the corner pixels removed, the classic 1px bevel. */
  rrect(x: number, y: number, w: number, h: number, rp: Ramp, o: ShapeOpts = {}) {
    this.shape(
      x,
      y,
      x + w - 1,
      y + h - 1,
      (px, py) => {
        if (px < x || px >= x + w || py < y || py >= y + h) return false;
        const cx = px === x || px === x + w - 1;
        const cy = py === y || py === y + h - 1;
        return !(cx && cy);
      },
      rp,
      o,
    );
  }

  /** Thick line made of square dabs; good for strands, straps and blades. */
  line(x0: number, y0: number, x1: number, y1: number, c: Color, thick = 1, tag = 0) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / steps);
      const y = Math.round(y0 + ((y1 - y0) * i) / steps);
      for (let yy = 0; yy < thick; yy++) for (let xx = 0; xx < thick; xx++) this.set(x + xx, y + yy, c, tag);
    }
  }

  /** Copy another bitmap on top of this one. */
  blit(src: Bitmap, dx: number, dy: number, flip = false) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const v = src.px[y * src.w + x];
        if (!v) continue;
        const tx = dx + (flip ? src.w - 1 - x : x);
        const ty = dy + y;
        if (!this.inb(tx, ty)) continue;
        this.px[ty * this.w + tx] = v;
        this.tag[ty * this.w + tx] = src.tag[y * src.w + x];
      }
    }
    this.cv = null;
  }

  clone(): Bitmap {
    const b = new Bitmap(this.w, this.h);
    b.px.set(this.px);
    b.tag.set(this.tag);
    return b;
  }

  /** The bitmap as an offscreen canvas at 1 canvas pixel per bitmap pixel. */
  canvas(): HTMLCanvasElement {
    if (this.cv) return this.cv;
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    const d = new Uint32Array(img.data.buffer);
    // ImageData is little-endian ABGR, so swap R and B on the way in.
    for (let i = 0; i < this.px.length; i++) {
      const v = this.px[i];
      if (!v) continue;
      d[i] = (0xff000000 | ((v & 0xff) << 16) | (v & 0xff00) | ((v >> 16) & 0xff)) >>> 0;
    }
    ctx.putImageData(img, 0, 0);
    this.cv = c;
    return c;
  }
}

/** Darken-and-cool a colour into an outline tone. */
export function outlineTone(c: Color, strength = 0.38): Color {
  return rgb(r8(c) * strength + 14, g8(c) * (strength - 0.04) + 8, b8(c) * (strength + 0.04) + 24);
}

/**
 * Selective outline. Every empty pixel that touches a painted one becomes an
 * outline tinted from its neighbour, so a red scarf gets a maroon edge and
 * brown hair a cocoa one instead of everything sharing one black rim.
 */
export function outline(bmp: Bitmap, strength = 0.38, tag = 0): Bitmap {
  const out = bmp.clone();
  const { w, h } = bmp;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (bmp.px[y * w + x]) continue;
      // Prefer the neighbour below/left so the rim reads as a soft ground shadow.
      let src = 0;
      const n = [
        bmp.get(x, y + 1),
        bmp.get(x - 1, y),
        bmp.get(x + 1, y),
        bmp.get(x, y - 1),
      ];
      for (const v of n) {
        if (v) {
          src = v;
          break;
        }
      }
      if (!src) continue;
      out.set(x, y, outlineTone(src & 0xffffff, strength), tag);
    }
  }
  return out;
}

/** Darken skin that sits directly beneath hair to fake a cast shadow. */
export function castShadow(bmp: Bitmap, skinTag: number, hairTag: number, shadow: Color) {
  const { w, h } = bmp;
  for (let y = 1; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bmp.tag[i] === skinTag && bmp.px[i] && bmp.tag[(y - 1) * w + x] === hairTag && bmp.px[(y - 1) * w + x]) {
        bmp.set(x, y, shadow, skinTag);
      }
    }
  }
}

/** Deterministic hash noise in [0, 1) for texture dither. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h ^= h >>> 16;
  return ((h >>> 0) % 10000) / 10000;
}
