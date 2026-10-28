import { Bitmap, hash2, mix, outline, type Color } from './pixelkit';
import { GD, GW, OX, OY, SH, SW, WH, bay, floorAt, proj, type Obj } from './iso-kit';
import {
  WINDOW_A,
  buildProps,
  catBitmap,
  paintWallDecor,
  wallStyleOf,
  type Light,
  type PropSet,
  type Slot,
} from './iso-props';
import { chibiBitmap, type ChibiSpec } from './chibi';
import { heroOutfit, heroToSpec, type HeroAppearance } from '../data/player';
import type { RoomDef } from '../data/rooms';
import type { Waifu } from '../data/types';

/**
 * The home screen's isometric pixel-art diorama.
 *
 * A room is composed from a static background bitmap (floor, stone or panelled
 * walls, arched night window, frames), depth-sorted furniture sprites, chibi
 * residents with idle animation, and a lighting pass of dithered lamp glows and
 * a moonbeam. Everything is drawn at 1 logical pixel per art pixel into a
 * small canvas that CSS scales up with nearest-neighbour filtering.
 */

interface Actor {
  id: string;
  name: string;
  spec: ChibiSpec;
  slot: Slot;
  phase: number;
  weapon: boolean;
  hero: boolean;
  outfitId: string | null;
  outfit: ReturnType<typeof heroOutfit> | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ph: number;
}

type Drawable = { depth: number; draw: (ctx: CanvasRenderingContext2D, t: number) => void };

// ── static shell ────────────────────────────────────────────────────────────

function darken(c: Color, k: number): Color {
  return mix(c, 0x0a0820, k);
}

function paintShell(def: RoomDef): Bitmap {
  const pal = def.palette;
  const bg = new Bitmap(SW, SH);
  const style = wallStyleOf(def);
  const wallBase = mix(pal.wall, 0x4a5a9a, 0.22);

  const wallPix = (u: number, z: number, side: 'L' | 'R', x: number, y: number): Color => {
    let col: Color;
    const lit = side === 'R' ? 1 : 0.8;
    if (z >= WH - 4) {
      col = z >= WH - 1.5 ? mix(pal.beam, 0xc8a070, 0.4) : pal.beam;
    } else if (z < 4) {
      col = z < 1.2 ? darken(pal.beam, 0.35) : mix(pal.beam, 0xc8a070, 0.2);
    } else if (style === 'brick') {
      const row = Math.floor(z / 6);
      const off = (row & 1) * 6;
      const k = Math.floor((u + off) / 12);
      const mortar = z % 6 < 1 || (u + off) % 12 < 1;
      col = mortar ? darken(wallBase, 0.4) : mix(wallBase, hash2(row, k, 1) > 0.5 ? 0xffffff : 0x000000, 0.04 + hash2(k, row, 2) * 0.12);
      if (!mortar && z % 6 >= 5) col = mix(col, 0xffffff, 0.08);
    } else {
      const board = Math.floor(u / 11);
      const seam = u % 11 < 1;
      if (z < 28) {
        col = mix(wallBase, pal.beam, 0.55);
        if (z >= 25.5) col = mix(pal.beam, 0xc8a070, 0.35);
        else if (seam) col = darken(col, 0.3);
      } else {
        col = mix(wallBase, 0xffffff, board & 1 ? 0.05 : 0);
        if (seam) col = darken(col, 0.18);
        if (z < 30) col = mix(col, 0x000000, 0.25);
      }
    }
    // ceiling falloff and corner shadow, dithered
    const t = z / WH;
    const ao = Math.max(0, (t - 0.55) * 0.9) + Math.max(0, 0.55 - Math.abs(u) / 40) * 0.0;
    if (bay(x, y) < ao) col = darken(col, 0.35);
    return darken(col, (1 - lit) * 0.9);
  };

  for (let py = 0; py < SH; py++) {
    for (let px = 0; px < SW; px++) {
      const cx = px + 0.5 - OX;
      const cy = py + 0.5 - OY;
      const a = cx / 20;
      const c = cy / 10;
      const gx = (a + c) / 2;
      const gy = (c - a) / 2;
      if (gx >= 0 && gx < GW && gy >= 0 && gy < GD) {
        const pi = Math.floor(gy * 2.2);
        let col = pal.floor[(pi * 3 + Math.floor(hash2(pi, 7, 1) * 4)) % pal.floor.length];
        col = mix(col, 0x3a4a8a, 0.12);
        const fy = gy * 2.2 - pi;
        const endSeg = (gx + pi * 0.93) / 3.1;
        if (fy < 0.09 || endSeg - Math.floor(endSeg) < 0.03) col = darken(col, 0.4);
        else if (hash2(px, py, 5) < 0.05) col = mix(col, 0xffffff, 0.12);
        else if (fy > 0.5 && fy < 0.58 && hash2(Math.floor(gx * 3), pi, 8) < 0.35) col = mix(col, 0x000000, 0.12);
        // woven rug under the table, banded like the reference interiors
        const rd = Math.min(gx - 1.4, 5.95 - gx, gy - 1.9, 5.15 - gy);
        if (rd >= 0) {
          const [r0, r1, r2] = [pal.rug[0], pal.rug[1], pal.rug[2] ?? 0xd8b06a];
          let rc = rd < 0.1 ? r0 : rd < 0.2 ? r2 : rd < 0.32 ? r0 : r1;
          if (rd >= 0.32 && (Math.floor(gx * 2.4) + Math.floor(gy * 2.4)) % 2 === 0) rc = mix(rc, r2, 0.18);
          if (rd >= 0.5 && hash2(px, py, 14) < 0.05) rc = mix(rc, 0xffffff, 0.15);
          col = mix(rc, 0x3a4a8a, 0.18);
        }
        const edge = Math.min(gx, gy);
        if (edge < 0.6 && bay(px, py) < (0.6 - edge) * 0.9) col = darken(col, 0.3);
        bg.set(px, py, col);
        continue;
      }
      // left wall (plane gx = 0)
      const gyL = -cx / 20;
      const zL = gyL * 10 - cy;
      if (gyL >= 0 && gyL < GD && zL >= 0 && zL < WH) {
        bg.set(px, py, wallPix(gyL * 20, zL, 'L', px, py));
        continue;
      }
      // right wall (plane gy = 0)
      const gxR = cx / 20;
      const zR = gxR * 10 - cy;
      if (gxR >= 0 && gxR < GW && zR >= 0 && zR < WH) {
        bg.set(px, py, wallPix(gxR * 20, zR, 'R', px, py));
        continue;
      }
      // floor slab thickness
      for (let k = 1; k <= 6; k++) {
        const [fx, fy] = floorAt(px, py - k);
        if (fx >= 0 && fx < GW && fy >= 0 && fy < GD) {
          bg.set(px, py, mix(pal.beam, 0x000000, cx < 0 ? 0.25 : 0.5) | 0);
          break;
        }
      }
    }
  }
  return bg;
}

// ── lighting ────────────────────────────────────────────────────────────────

function glowCanvas(lights: Light[], flick: number, moon: boolean): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = SW;
  cv.height = SH;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(SW, SH);
  const data = img.data;
  const put = (x: number, y: number, col: Color, alpha: number) => {
    if (x < 0 || y < 0 || x >= SW || y >= SH) return;
    const i = (y * SW + x) * 4;
    if (data[i + 3] >= alpha) return;
    data[i] = (col >> 16) & 255;
    data[i + 1] = (col >> 8) & 255;
    data[i + 2] = col & 255;
    data[i + 3] = alpha;
  };
  for (const l of lights) {
    const r = l.r * (1 + flick * l.flicker * 0.5);
    for (let y = Math.floor(l.y - r); y <= Math.ceil(l.y + r); y++) {
      for (let x = Math.floor(l.x - r); x <= Math.ceil(l.x + r); x++) {
        const d = Math.hypot(x - l.x, (y - l.y) * 1.25) / r;
        if (d >= 1) continue;
        const v = Math.pow(1 - d, 1.6);
        const level = Math.min(3, Math.floor(v * 3.6 + bay(x, y) * 0.95));
        if (level > 0) put(x, y, l.color, level * 17);
      }
    }
  }
  if (moon) {
    const [a0, a1] = WINDOW_A;
    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const [gx, gy] = floorAt(x, y);
        if (gx < 0 || gx >= GW || gy < 0 || gy >= GD) continue;
        const s = gy / 3.9;
        if (s < 0 || s > 1) continue;
        const lo = a0 - 1.15 * s;
        const hi = a1 - 1.15 * s;
        if (gx < lo || gx > hi) continue;
        const mid = (lo + hi) / 2;
        if (Math.abs(gx - mid) < 0.07 || Math.abs(s - 0.0) < 0.001) continue;
        const v = Math.pow(1 - s, 0.9) * (1 - Math.abs(gx - mid) / (hi - lo) * 0.5);
        const level = Math.min(3, Math.floor(v * 3.4 + bay(x, y) * 0.9));
        if (level > 0) put(x, y, 0x86a4ff, level * 15);
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// ── scene ───────────────────────────────────────────────────────────────────

export class IsoRoom {
  private ctx: CanvasRenderingContext2D;
  private scene: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  private backdrop: HTMLCanvasElement | null = null;
  private bg: Bitmap | null = null;
  private props: PropSet | null = null;
  private actors: Actor[] = [];
  private drawables: Drawable[] = [];
  private glow: HTMLCanvasElement[] = [];
  private particles: Particle[] = [];
  private def: RoomDef | null = null;
  private raf = 0;
  private last = 0;
  private t = 0;
  private scale = 3;
  private offX = 0;
  private offY = 0;
  private hover: string | null = null;
  private hits: { id: string; x: number; y: number; w: number; h: number; depth: number }[] = [];
  private running = false;
  /** Called with a waifu id when a resident is clicked, or 'hero' for the MC. */
  onPick: ((id: string) => void) | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.scene = document.createElement('canvas');
    this.scene.width = SW;
    this.scene.height = SH;
    this.sctx = this.scene.getContext('2d')!;
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerleave', () => {
      this.hover = null;
      canvas.style.cursor = 'default';
    });
    canvas.addEventListener('click', this.onClick);
  }

  /** Build (or rebuild) the room with its residents. */
  setRoom(def: RoomDef, guests: Waifu[], hero: HeroAppearance | null) {
    this.def = def;
    const props = buildProps(def);
    this.props = props;

    const actors: Actor[] = guests.slice(0, props.slots.length).map((w, i) => ({
      id: w.id,
      name: w.name,
      spec: w.spec as ChibiSpec,
      slot: props.slots[i],
      phase: hash2(i, 3, 11) * 6,
      weapon: props.slots[i].pose === 'stand',
      hero: false,
      outfitId: null,
      outfit: null,
    }));
    if (hero) {
      actors.push({
        id: 'hero',
        name: 'You',
        spec: heroToSpec(hero) as ChibiSpec,
        slot: props.hero,
        phase: 1.7,
        weapon: false,
        hero: true,
        outfitId: hero.outfit ?? 'custom',
        outfit: heroOutfit(hero),
      });
    }
    this.actors = actors;

    // static layers
    const bg = paintShell(def);
    const portraits = actors.filter((a) => !a.hero).map((a) => chibiBitmap({ spec: a.spec }));
    paintWallDecor(bg, def, portraits);
    this.bg = bg;

    // lighting variants for flicker
    const moon = true;
    this.glow = [glowCanvas(props.lights, -1, moon), glowCanvas(props.lights, 0, moon), glowCanvas(props.lights, 1, moon)];

    this.buildDrawables();
    this.seedParticles();
    this.backdrop = null;
    this.layout();
    this.renderFrame();
  }

  private buildDrawables() {
    const props = this.props!;
    const list: Drawable[] = [];
    this.hits = [];
    for (const o of props.objs as Obj[]) {
      if (!o.bmp) continue;
      const cv = o.bmp.canvas();
      list.push({ depth: o.depth, draw: (ctx) => ctx.drawImage(cv, o.dx, o.dy) });
    }
    for (const c of props.cats) {
      const [x, y] = proj(c.gx, c.gy, c.gz);
      list.push({
        depth: c.depth,
        draw: (ctx, t) => {
          const frame = Math.floor(t * 1.2 + c.seed) & 1;
          const blink = (t + c.seed) % 5 < 0.14;
          ctx.drawImage(catBitmap(c.fur, frame, blink).canvas(), Math.round(x - 9), Math.round(y - 15));
        },
      });
    }
    for (const a of this.actors) {
      const s = a.slot;
      const [x, y] = proj(s.gx, s.gy, s.gz);
      list.push({
        depth: s.depth + 0.05,
        draw: (ctx, t) => {
          const blink = (t + a.phase * 3.7) % 4.6 < 0.14;
          const talk = this.hover === a.id || (t * 0.3 + a.phase) % 7 < 0.9;
          const expression = blink ? 'blink' : talk ? 'smile' : 'neutral';
          const sprite = chibiBitmap({
            spec: a.spec,
            expression,
            pose: s.pose,
            prop: s.prop,
            weapon: a.weapon,
            outfit: a.outfit,
          });
          const bob = Math.floor(t * 1.5 + a.phase) & 1 ? 1 : 0;
          const top = Math.round(y - 54) - bob;
          // contact shadow
          ctx.fillStyle = 'rgba(8,6,24,0.32)';
          ctx.fillRect(Math.round(x - 11), Math.round(y - 1), 22, 3);
          ctx.fillRect(Math.round(x - 8), Math.round(y + 2), 16, 1);
          if (s.pose === 'sit') {
            // hips sink into the seat: show the sprite down to the hem only
            const cut = 47;
            ctx.drawImage(sprite.canvas(), 0, 0, sprite.w, cut, Math.round(x - 24), Math.round(y - cut) - bob, sprite.w, cut);
          } else {
            ctx.drawImage(sprite.canvas(), Math.round(x - 24), top);
          }
        },
      });
      this.hits.push({ id: a.id, x: x - 17, y: y - 56, w: 34, h: 58, depth: s.depth });
    }
    list.sort((p, q) => p.depth - q.depth);
    this.drawables = list;
  }

  private seedParticles() {
    const kind = this.props?.particles ?? 'dust';
    const n = kind === 'petals' ? 22 : kind === 'fireflies' ? 12 : 16;
    this.particles = Array.from({ length: n }, (_, i) => ({
      x: hash2(i, 1, 21) * SW,
      y: hash2(i, 2, 21) * SH,
      vx: kind === 'petals' ? -6 - hash2(i, 3, 21) * 6 : (hash2(i, 3, 21) - 0.5) * 4,
      vy: kind === 'petals' ? 8 + hash2(i, 4, 21) * 8 : (hash2(i, 4, 21) - 0.5) * 3,
      ph: hash2(i, 5, 21) * 6.28,
    }));
  }

  // ── layout & input ──

  /** Fit the scene to the viewport at the largest integer scale (fractional on small screens). */
  layout() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const fit = Math.min(vw / SW, vh / (SH * 0.9));
    this.scale = fit >= 2 ? Math.floor(fit) : Math.max(1, Math.round(fit * 4) / 4);
    const lw = Math.ceil(vw / this.scale);
    const lh = Math.ceil(vh / this.scale);
    if (this.canvas.width !== lw || this.canvas.height !== lh) {
      this.canvas.width = lw;
      this.canvas.height = lh;
      this.backdrop = null;
    }
    this.canvas.style.width = `${lw * this.scale}px`;
    this.canvas.style.height = `${lh * this.scale}px`;
    // On the home screen the welcome note occupies a left column; centre the room in the rest.
    const inset = document.body.dataset.screen === 'home' ? Math.min(340, vw * 0.28) : 0;
    this.offX = Math.floor((lw - SW) / 2 + inset / this.scale / 2);
    // sit a touch low so the wall top tucks under the HUD
    this.offY = Math.floor((lh - SH) / 2) + Math.round(8 / this.scale);
    this.ctx.imageSmoothingEnabled = false;
  }

  private toScene(e: PointerEvent | MouseEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    const lx = ((e.clientX - r.left) / r.width) * this.canvas.width;
    const ly = ((e.clientY - r.top) / r.height) * this.canvas.height;
    return [lx - this.offX, ly - this.offY];
  }

  private pick(x: number, y: number): string | null {
    const hits = [...this.hits].sort((a, b) => b.depth - a.depth);
    for (const h of hits) if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h.id;
    return null;
  }

  private onMove = (e: PointerEvent) => {
    const [x, y] = this.toScene(e);
    const id = this.pick(x, y);
    this.hover = id;
    this.canvas.style.cursor = id && id !== 'hero' ? 'pointer' : 'default';
  };

  private onClick = (e: MouseEvent) => {
    const [x, y] = this.toScene(e);
    const id = this.pick(x, y);
    if (id) this.onPick?.(id);
  };

  // ── drawing ──

  private drawBackdrop() {
    const def = this.def;
    const lw = this.canvas.width;
    const lh = this.canvas.height;
    const cv = document.createElement('canvas');
    cv.width = lw;
    cv.height = lh;
    const c = cv.getContext('2d')!;
    const base = def ? mix(def.palette.background, 0x0a0f2c, 0.7) : 0x0a0f2c;
    const top = mix(base, 0x141e52, 0.5);
    const img = c.createImageData(lw, lh);
    for (let y = 0; y < lh; y++) {
      const t = y / lh;
      for (let x = 0; x < lw; x++) {
        const v = t * 0.9 + (bay(x, y) - 0.5) * 0.16;
        let col = mix(top, base, Math.max(0, Math.min(1, v)));
        // vignette
        const dx = (x / lw - 0.5) * 2;
        const dy = (y / lh - 0.5) * 2;
        const vig = Math.max(0, Math.hypot(dx * 0.9, dy) - 0.55);
        if (bay(x, y) < vig * 0.9) col = mix(col, 0x000000, 0.35);
        if (hash2(x, y, 33) > 0.9965) col = mix(col, 0xdfe8ff, 0.7);
        const i = (y * lw + x) * 4;
        img.data[i] = (col >> 16) & 255;
        img.data[i + 1] = (col >> 8) & 255;
        img.data[i + 2] = col & 255;
        img.data[i + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
    this.backdrop = cv;
  }

  /** Draw one frame at time `t` (seconds). Exposed so tests can render deterministically. */
  renderFrame(t = this.t) {
    if (!this.bg || !this.props) return;
    const s = this.sctx;
    const bgCanvas = this.bg.canvas();
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, SW, SH);
    s.imageSmoothingEnabled = false;
    s.drawImage(bgCanvas, 0, 0);

    // twinkling stars in the window
    const w = this.props.window;
    for (let i = 0; i < 7; i++) {
      const x = Math.round(w.x0 + 6 + hash2(i, 1, 41) * (w.x1 - w.x0 - 12));
      const y = Math.round(w.y0 + 9 + hash2(i, 2, 41) * Math.max(4, (w.y1 - w.y0) * 0.35));
      if (Math.sin(t * 2 + i * 1.7) > 0.2) {
        s.fillStyle = '#ffffff';
        s.fillRect(x, y, 1, 1);
      }
    }

    for (const d of this.drawables) d.draw(s, t);

    // flames in the hearth
    if (this.def?.decor.fireplace) this.drawFlames(s, t);

    // night wash, then additive light
    s.globalCompositeOperation = 'source-atop';
    s.fillStyle = 'rgba(22,30,96,0.2)';
    s.fillRect(0, 0, SW, SH);
    s.globalCompositeOperation = 'lighter';
    const gi = Math.floor(t * 6) % 4;
    s.drawImage(this.glow[gi === 1 ? 0 : gi === 3 ? 2 : 1], 0, 0);
    s.globalCompositeOperation = 'source-over';
    this.drawParticles(s, t);
    // clip to the room silhouette
    s.globalCompositeOperation = 'destination-in';
    s.drawImage(bgCanvas, 0, 0);
    s.globalCompositeOperation = 'source-over';

    if (!this.backdrop) this.drawBackdrop();
    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.backdrop!, 0, 0);
    c.drawImage(this.scene, this.offX, this.offY);
    // hover name tag
    if (this.hover && this.hover !== 'hero') {
      const h = this.hits.find((q) => q.id === this.hover);
      const a = this.actors.find((q) => q.id === this.hover);
      if (h && a) this.nameTag(c, a.name, this.offX + h.x + h.w / 2, this.offY + h.y - 3);
    }
  }

  private nameTag(c: CanvasRenderingContext2D, text: string, x: number, y: number) {
    c.font = '8px monospace';
    c.textBaseline = 'middle';
    const w = Math.ceil(c.measureText(text).width) + 6;
    c.fillStyle = 'rgba(16,12,40,0.88)';
    c.fillRect(Math.round(x - w / 2), Math.round(y - 10), w, 10);
    c.fillStyle = '#ffe9a8';
    c.fillText(text, Math.round(x - w / 2) + 3, Math.round(y - 5));
  }

  private drawFlames(s: CanvasRenderingContext2D, t: number) {
    const [x, y] = proj(0.8, 4.85, 4);
    const cols = ['#ff5a2a', '#ff9a3a', '#ffd86a', '#fff3b8'];
    for (let i = 0; i < 4; i++) {
      const h = 5 + Math.floor((Math.sin(t * 9 + i * 2.1) + 1) * 2.2) + (i === 1 || i === 2 ? 3 : 0);
      for (let k = 0; k < h; k++) {
        s.fillStyle = cols[Math.min(3, Math.floor((k / h) * 3 + (k < 2 ? 0 : 0.4)))];
        const w = k < h - 2 ? 2 : 1;
        s.fillRect(Math.round(x - 9 + i * 6 + (w === 1 ? 1 : 0)), Math.round(y - k), w, 1);
      }
    }
  }

  private drawParticles(s: CanvasRenderingContext2D, t: number) {
    const kind = this.props?.particles ?? 'dust';
    for (const p of this.particles) {
      let x = p.x + p.vx * t + Math.sin(t * 0.8 + p.ph) * 4;
      let y = p.y + p.vy * t;
      x = ((x % SW) + SW) % SW;
      y = ((y % SH) + SH) % SH;
      if (kind === 'petals') {
        s.fillStyle = '#ffc2dc';
        s.fillRect(Math.round(x), Math.round(y), 2, 1);
      } else if (kind === 'fireflies') {
        if (Math.sin(t * 1.6 + p.ph) > 0) {
          s.fillStyle = '#e8ff8a';
          s.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
      } else {
        // dust motes catch the moonbeam
        const [gx, gy] = floorAt(x, y);
        const inside = gx > -1 && gx < GW && gy > -1 && gy < GD;
        if (inside && Math.sin(t + p.ph) > -0.2) {
          s.fillStyle = 'rgba(200,214,255,0.7)';
          s.fillRect(Math.round(x), Math.round(y), 1, 1);
        }
      }
    }
  }

  // ── lifecycle ──

  start() {
    if (this.running) return;
    this.running = true;
    const step = (ts: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(step);
      if (document.hidden) return;
      if (ts - this.last < 41) return;
      this.last = ts;
      this.t = ts / 1000;
      this.renderFrame(this.t);
    };
    this.raf = requestAnimationFrame(step);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('click', this.onClick);
  }

  get roomId(): string {
    return this.def?.id ?? '';
  }
}

void outline;
