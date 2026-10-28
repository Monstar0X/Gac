import * as THREE from 'three';
import type { ThemeId } from '../data/types';
import type { HeroAppearance } from '../data/player';
import type { StageContent } from './stage';
import { TILE, TILE_SETS } from './tiles';
import {
  buildOverworldMap,
  drawDecorRegion,
  drawGroundRegion,
  type OverworldMap,
} from './overworld-map';
import {
  SHEET_DIRS,
  SPRITE_H,
  SPRITE_W,
  drawHeroSprite,
  type Dir,
} from './hero-sprite';

/**
 * The GBA-style quest overworld.
 *
 * The whole zone is composed on a 2D canvas at the renderer's native low
 * resolution, then handed to the stage as a texture. Because the 2D canvas is
 * already at 1x pixel scale, the shared pixel pipeline upscales it with the
 * same crisp nearest-neighbour look as the rest of the game.
 */

export interface OverworldEvents {
  onRelicPickup: (relicId: string) => void;
  onPrimeNear: (near: boolean) => void;
  onPrimeInteract: () => void;
  onCompass: (bearing: number | null, label: string) => void;
}

export interface OverworldOptions {
  theme: ThemeId;
  seedKey: string;
  relicIds: string[];
  collectedRelicIds: string[];
  hero: HeroAppearance;
  events: OverworldEvents;
}

/** Pixels per second at walking and running speed. */
const WALK_SPEED = 62;
const RUN_SPEED = 104;
/** Tiles the player can be from the prime location before the prompt shows. */
const PRIME_RANGE = 3;

export class OverworldScene implements StageContent {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private quad: THREE.Mesh;

  private map: OverworldMap;
  private hero: HeroAppearance;

  /** Player position in pixels, top-left of the sprite cell. */
  private px: number;
  private py: number;
  private dir: Dir = 'down';
  private frame = 0;
  private animT = 0;
  private running = false;
  private interactRequested = false;

  private viewW = 320;
  private viewH = 180;
  private camX = 0;
  private camY = 0;

  private input = { x: 0, y: 0 };
  private keys = new Set<string>();
  private elapsed = 0;
  private nearPrime = false;
  private disposed = false;

  private relics: { id: string; tx: number; ty: number; collected: boolean }[];
  private glowT = 0;

  constructor(private opts: OverworldOptions) {
    this.map = buildOverworldMap(opts.theme, opts.seedKey, opts.relicIds.length);
    this.hero = opts.hero;

    this.px = this.map.spawn.x * TILE;
    this.py = this.map.spawn.y * TILE;

    this.relics = this.map.relics.map((p, i) => ({
      id: opts.relicIds[i] ?? `relic_${i}`,
      tx: p.x,
      ty: p.y,
      collected: opts.collectedRelicIds.includes(opts.relicIds[i] ?? `relic_${i}`),
    }));

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.colorSpace = THREE.NoColorSpace;

    // A single full-view quad, drawn in clip space. The scene is pure 2D, so
    // the camera only exists to satisfy the stage's render call.
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new THREE.MeshBasicMaterial({ map: this.texture, depthTest: false });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.attachKeys();
    this.resizeView(this.viewW, this.viewH);
  }

  /**
   * The overworld renders at its own fixed handheld resolution rather than the
   * renderer's native buffer. A 180px-tall 16:9 view shows about 20 tiles
   * across, which is the framing a GBA-era overworld uses; the texture is then
   * stretched to fill the screen, so the upscale stays an exact integer at the
   * common aspect ratios.
   */
  private static readonly VIRTUAL_H = 180;

  /** The pixel dimensions the renderer is currently targeting. */
  setViewSize(w: number, h: number) {
    const aspect = w / Math.max(1, h);
    const vh = Math.min(OverworldScene.VIRTUAL_H, Math.round(h));
    const vw = Math.max(160, Math.round(vh * aspect));
    this.resizeView(vw, vh);
  }

  private resizeView(w: number, h: number) {
    this.viewW = Math.max(64, Math.round(w));
    this.viewH = Math.max(64, Math.round(h));
    if (this.canvas.width !== this.viewW || this.canvas.height !== this.viewH) {
      this.canvas.width = this.viewW;
      this.canvas.height = this.viewH;
      this.ctx.imageSmoothingEnabled = false;
    }
    this.texture.needsUpdate = true;
    this.clampCamera();
  }

  onResize(aspect: number) {
    // The stage reports aspect; the pixel renderer owns the exact pixel size.
    void aspect;
  }

  private attachKeys() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'e' || k === 'enter' || k === ' ') this.interactRequested = true;
    if (k === 'shift') this.running = true;
    this.keys.add(k);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (k === 'shift') this.running = false;
    this.keys.delete(k);
  };

  /** Directional input from the on-screen D-pad, each axis in -1..1. */
  setDirection(x: number, y: number) {
    this.input.x = x;
    this.input.y = y;
  }

  setRun(on: boolean) {
    this.running = on;
  }

  interact() {
    this.interactRequested = true;
  }

  /** True when the player is standing close enough to talk to the prime NPC. */
  get canInteract(): boolean {
    return this.nearPrime;
  }

  get position() {
    return { x: this.px, y: this.py };
  }

  /** Snap the player next to the prime location, for the warp button. */
  warpToPrime() {
    this.px = this.map.prime.x * TILE;
    this.py = (this.map.prime.y + 2) * TILE;
    this.dir = 'up';
    this.clampCamera();
  }

  /** Snap the player next to the nearest uncollected relic. */
  warpToNearestRelic(): boolean {
    const left = this.relics.filter((r) => !r.collected);
    if (!left.length) return false;
    let best = left[0];
    let bestD = Infinity;
    for (const r of left) {
      const d = Math.hypot(r.tx * TILE - this.px, r.ty * TILE - this.py);
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    this.px = best.tx * TILE;
    this.py = (best.ty + 1) * TILE;
    this.clampCamera();
    return true;
  }

  private isBlocked(tileX: number, tileY: number): boolean {
    if (tileX < 0 || tileY < 0 || tileX >= this.map.w || tileY >= this.map.h) return true;
    const i = tileY * this.map.w + tileX;
    return this.map.solid[i] === 1 || this.map.blocked[i] === 1;
  }

  /**
   * Test a sprite footprint at a candidate pixel position. The hero occupies a
   * narrow box at their feet, which is what makes doorways and paths feel right
   * in top-down games — a full-body box would catch on everything.
   */
  private canStand(px: number, py: number): boolean {
    const feetY = py + SPRITE_H - 2;
    const left = px + Math.floor(SPRITE_W / 2) - 4;
    const right = px + Math.floor(SPRITE_W / 2) + 4;
    const samples: [number, number][] = [
      [left, feetY],
      [right, feetY],
      [left, py + SPRITE_H - 6],
      [right, py + SPRITE_H - 6],
    ];
    for (const [sx, sy] of samples) {
      if (this.isBlocked(Math.floor(sx / TILE), Math.floor(sy / TILE))) return true;
    }
    return false;
  }

  private tryMove(dx: number, dy: number) {
    if (dx !== 0) {
      const nx = this.px + dx;
      if (!this.canStand(nx, this.py)) this.px = nx;
    }
    if (dy !== 0) {
      const ny = this.py + dy;
      if (!this.canStand(this.px, ny)) this.py = ny;
    }
  }

  update(t: number, dt: number) {
    if (this.disposed) return;
    this.elapsed += dt;
    this.glowT += dt;

    // Keyboard and D-pad combine, so both control schemes stay live.
    let ix = this.input.x;
    let iy = this.input.y;
    if (this.keys.has('a') || this.keys.has('arrowleft')) ix -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) ix += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) iy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) iy += 1;

    const len = Math.hypot(ix, iy);
    if (len > 0.15) {
      ix /= Math.max(1, len);
      iy /= Math.max(1, len);

      // Face the dominant axis, matching how GBA games pick a walk direction.
      if (Math.abs(ix) > Math.abs(iy)) this.dir = ix > 0 ? 'right' : 'left';
      else this.dir = iy > 0 ? 'down' : 'up';

      const speed = this.running ? RUN_SPEED : WALK_SPEED;
      this.tryMove(ix * speed * dt, iy * speed * dt);

      this.animT += dt * (this.running ? 11 : 7);
      this.frame = Math.floor(this.animT) % 4;
    } else {
      this.animT = 0;
      this.frame = 0;
    }

    this.checkPickups();
    this.updatePrime();
    this.clampCamera();
    this.updateCompass();

    if (this.interactRequested) {
      this.interactRequested = false;
      if (this.nearPrime) this.opts.events.onPrimeInteract();
    }

    this.render2D();
    void t;
  }

  private checkPickups() {
    const cx = this.px + SPRITE_W / 2;
    const cy = this.py + SPRITE_H / 2;
    for (const r of this.relics) {
      if (r.collected) continue;
      const rx = r.tx * TILE + TILE / 2;
      const ry = r.ty * TILE + TILE / 2;
      if (Math.hypot(rx - cx, ry - cy) < TILE * 0.9) {
        r.collected = true;
        this.opts.events.onRelicPickup(r.id);
      }
    }
  }

  private updatePrime() {
    const dx = this.map.prime.x * TILE + TILE / 2 - (this.px + SPRITE_W / 2);
    const dy = this.map.prime.y * TILE + TILE / 2 - (this.py + SPRITE_H / 2);
    const near = Math.hypot(dx / TILE, dy / TILE) <= PRIME_RANGE;
    if (near !== this.nearPrime) {
      this.nearPrime = near;
      this.opts.events.onPrimeNear(near);
    }
  }

  private updateCompass() {
    // Point at the next objective: relics first, then the prime location.
    let target: { x: number; y: number } | null = null;
    let label = '';
    const left = this.relics.filter((r) => !r.collected);
    if (left.length) {
      const cx = this.px + SPRITE_W / 2;
      const cy = this.py + SPRITE_H / 2;
      let best = left[0];
      let bestD = Infinity;
      for (const r of left) {
        const d = Math.hypot(r.tx * TILE - cx, r.ty * TILE - cy);
        if (d < bestD) {
          bestD = d;
          best = r;
        }
      }
      target = { x: best.tx * TILE + TILE / 2, y: best.ty * TILE + TILE / 2 };
      label = `Relic ${this.relics.length - left.length + 1}/${this.relics.length}`;
    } else {
      target = { x: this.map.prime.x * TILE + TILE / 2, y: this.map.prime.y * TILE + TILE / 2 };
      label = 'Prime location';
    }
    const dx = target.x - (this.px + SPRITE_W / 2);
    const dy = target.y - (this.py + SPRITE_H / 2);
    this.opts.events.onCompass(Math.atan2(dx, -dy), label);
  }

  private clampCamera() {
    const maxX = this.map.w * TILE - this.viewW;
    const maxY = this.map.h * TILE - this.viewH;
    this.camX = Math.max(0, Math.min(maxX, this.px + SPRITE_W / 2 - this.viewW / 2));
    this.camY = Math.max(0, Math.min(maxY, this.py + SPRITE_H / 2 - this.viewH / 2));
  }

  private render2D() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.viewW, this.viewH);

    ctx.save();
    ctx.translate(-Math.round(this.camX), -Math.round(this.camY));

    // Ground covers the whole view; decor is split around the hero's row so
    // objects behind them stay behind and objects in front overlap them.
    const heroRow = Math.floor((this.py + SPRITE_H) / TILE);
    drawGroundRegion(ctx, this.map, this.camX, this.camY, this.viewW, this.viewH);
    drawDecorRegion(ctx, this.map, this.camX, this.camY, this.viewW, this.viewH, -99, heroRow);

    this.drawRelics(ctx);
    drawHeroSprite(
      ctx,
      this.hero,
      this.dir,
      this.frame,
      Math.round(this.px),
      Math.round(this.py),
    );

    drawDecorRegion(ctx, this.map, this.camX, this.camY, this.viewW, this.viewH, heroRow + 1, 99);

    ctx.restore();

    this.drawPrimeMarker(ctx);
    this.drawFrameBorder(ctx);
  }

  private drawRelics(ctx: CanvasRenderingContext2D) {
    for (const r of this.relics) {
      if (r.collected) continue;
      const x = r.tx * TILE;
      const y = r.ty * TILE;
      const bob = Math.round(Math.sin(this.glowT * 3 + r.tx) * 1.5);
      // Pedestal.
      ctx.fillStyle = '#6a6258';
      ctx.fillRect(x + 3, y + 11, 10, 4);
      ctx.fillStyle = '#8a8278';
      ctx.fillRect(x + 3, y + 11, 10, 1);
      // Floating gem with a stepped pixel sparkle.
      ctx.fillStyle = '#ffd75e';
      ctx.fillRect(x + 6, y + 3 + bob, 4, 6);
      ctx.fillStyle = '#fff0b0';
      ctx.fillRect(x + 7, y + 4 + bob, 2, 3);
      ctx.fillStyle = 'rgba(255,215,94,0.35)';
      ctx.fillRect(x + 5, y + 2 + bob, 6, 1);
      ctx.fillRect(x + 5, y + 9 + bob, 6, 1);
    }
  }

  private drawPrimeMarker(ctx: CanvasRenderingContext2D) {
    if (!this.nearPrime) return;
    const x = this.map.prime.x * TILE;
    const y = this.map.prime.y * TILE;
    const pulse = 0.5 + 0.5 * Math.sin(this.glowT * 4);
    ctx.strokeStyle = `rgba(255,240,176,${0.4 + pulse * 0.5})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      x - Math.round(this.camX) - 4,
      y - Math.round(this.camY) - 6,
      TILE + 8,
      TILE + 12,
    );
  }

  private drawFrameBorder(ctx: CanvasRenderingContext2D) {
    // A cheap 1px inner border keeps the frame feeling like a handheld screen.
    ctx.fillStyle = 'rgba(20,14,24,0.18)';
    ctx.fillRect(0, 0, this.viewW, 1);
    ctx.fillRect(0, this.viewH - 1, this.viewW, 1);
    ctx.fillRect(0, 0, 1, this.viewH);
    ctx.fillRect(this.viewW - 1, 0, 1, this.viewH);
  }

  /** Redraw the sprite sheet path — kept for the sheet-based renderer. */
  static sheetLayout() {
    return { dirs: SHEET_DIRS, w: SPRITE_W, h: SPRITE_H };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.texture.dispose();
    (this.quad.geometry as THREE.BufferGeometry).dispose();
    (this.quad.material as THREE.Material).dispose();
    void this.elapsed;
  }
}

/** Tile set accessor used by the HUD to show the zone's flavour. */
export function zoneTileset(theme: ThemeId) {
  return TILE_SETS[theme];
}
