import type { Rarity } from '../data/types';
import { chibiBitmap, type ChibiSpec, type Expression } from '../engine/chibi';

/**
 * Draws a 32x32 pixel-art bust for a character onto a canvas. Used for roster
 * cards, gacha reveals and dialogue portraits so the 2D UI matches the 3D art.
 */

const GRID = 48;

function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

function shade(n: number, amt: number): string {
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Render a chibi bust onto a canvas element sized `size` x `size` CSS pixels.
 * Used by roster cards, the gacha reveal and dialogue, so the 2D UI shows the
 * same sprite as the home room.
 */
export function drawPortrait(
  canvas: HTMLCanvasElement,
  spec: ChibiSpec,
  opts: { size?: number; background?: number | null; rarity?: Rarity; expression?: Expression } = {},
): void {
  const size = opts.size ?? 128;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.max(1, Math.floor((size * dpr) / GRID));
  const px0 = scale * GRID;
  canvas.width = px0;
  canvas.height = px0;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  if (opts.background !== null) {
    const bg = opts.background ?? 0x2a2233;
    const g = ctx.createLinearGradient(0, 0, 0, px0);
    g.addColorStop(0, shade(bg, 26));
    g.addColorStop(1, shade(bg, -18));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, px0, px0);
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#ffffff' : shade(bg, 50);
      ctx.fillRect(((i * 37) % GRID) * scale, ((i * 53) % GRID) * scale, scale, scale);
    }
    ctx.globalAlpha = 1;
  }

  const sprite = chibiBitmap({ spec, expression: opts.expression ?? 'neutral' });
  // Crop to head and shoulders; keeps the big eyes readable at card size.
  ctx.drawImage(sprite.canvas(), 0, 4, GRID, GRID, 0, 0, px0, px0);
}

/**
 * Small square icon canvas for an item, drawn from its icon shape + colour.
 *
 * Rendered on a 24x24 grid (up from 16x16) with a highlight, a core tone and a
 * shadow tone per shape, plus a soft background glow, so items read as objects
 * rather than flat silhouettes.
 */
export function drawItemIcon(canvas: HTMLCanvasElement, shape: string, color: number, size = 64): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const G = 24;
  const scale = Math.max(1, Math.floor((size * dpr) / G));
  const px0 = scale * G;
  canvas.width = px0;
  canvas.height = px0;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, px0, px0);

  const px = (x: number, y: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(x * scale, y * scale, w * scale, h * scale);
  };

  const c = hex(color);
  const hi = shade(color, 60);
  const hi2 = shade(color, 30);
  const dk = shade(color, -50);
  const dk2 = shade(color, -80);
  const outline = 'rgba(20,14,10,0.55)';

  // Soft radial glow behind the object.
  const g = ctx.createRadialGradient(px0 / 2, px0 * 0.46, 0, px0 / 2, px0 * 0.5, px0 * 0.52);
  g.addColorStop(0, `rgba(${(color >> 16) & 0xff}, ${(color >> 8) & 0xff}, ${color & 0xff}, 0.30)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, px0, px0);

  switch (shape) {
    case 'muffler':
      px(4, 9, 16, 5, c); px(4, 9, 16, 2, hi); px(4, 13, 16, 1, dk);
      px(13, 13, 4, 8, c); px(13, 13, 4, 2, hi2); px(13, 19, 4, 2, dk);
      break;
    case 'poster':
      px(5, 3, 14, 17, c); px(6, 4, 12, 15, hi2); px(6, 4, 12, 2, hi);
      px(6, 17, 12, 2, dk); px(5, 2, 14, 1, dk2); px(5, 20, 14, 1, dk2);
      break;
    case 'gear':
      px(4, 4, 6, 14, c); px(14, 4, 6, 14, c); px(4, 4, 2, 14, hi); px(14, 4, 2, 14, hi);
      px(4, 3, 16, 3, dk2); px(9, 18, 6, 3, hi2); px(10, 21, 4, 2, dk);
      break;
    case 'badge':
      px(6, 6, 12, 12, c); px(6, 6, 12, 2, hi); px(6, 16, 12, 2, dk);
      px(9, 9, 6, 6, hi2); px(10, 10, 4, 4, hi);
      break;
    case 'flail':
      px(11, 2, 3, 11, dk); px(11, 2, 1, 11, hi2);
      px(6, 13, 12, 9, c); px(7, 14, 3, 3, hi); px(6, 20, 12, 2, dk);
      break;
    case 'ribbon':
      px(3, 9, 18, 4, c); px(3, 9, 18, 1, hi);
      px(5, 6, 5, 4, c); px(14, 6, 5, 4, c); px(5, 6, 5, 1, hi2); px(14, 6, 5, 1, hi2);
      px(10, 12, 4, 3, dk);
      break;
    case 'teacup':
      px(4, 9, 12, 9, c); px(4, 9, 12, 2, hi); px(4, 17, 12, 2, dk);
      px(16, 11, 4, 4, c); px(16, 11, 4, 1, hi2); px(3, 18, 14, 2, dk2);
      break;
    case 'horn':
      px(9, 4, 6, 15, c); px(9, 4, 2, 15, hi); px(11, 2, 3, 3, hi2); px(13, 16, 3, 3, dk);
      break;
    case 'headband':
      px(3, 10, 18, 5, c); px(3, 10, 18, 2, hi); px(3, 14, 18, 1, dk);
      break;
    case 'key':
      px(11, 4, 3, 16, c); px(11, 4, 1, 16, hi);
      px(12, 3, 8, 3, c); px(12, 3, 8, 1, hi2); px(12, 7, 5, 3, c); px(18, 11, 3, 3, dk);
      break;
    case 'dogtag':
      px(8, 6, 9, 12, c); px(8, 6, 2, 12, hi); px(8, 16, 9, 2, dk); px(11, 2, 3, 5, dk2);
      break;
    case 'scale':
      px(4, 6, 16, 12, c); px(4, 6, 16, 2, hi); px(4, 16, 16, 2, dk); px(8, 9, 8, 6, hi2);
      break;
    case 'scroll':
      px(3, 7, 18, 9, c); px(3, 7, 18, 2, hi2); px(2, 5, 20, 3, dk2); px(2, 15, 20, 3, dk2);
      break;
    case 'sandals':
      px(3, 7, 7, 10, c); px(14, 7, 7, 10, c); px(3, 7, 7, 2, hi); px(14, 7, 7, 2, hi);
      px(3, 15, 7, 2, dk); px(14, 15, 7, 2, dk);
      break;
    case 'coupon':
      px(3, 7, 18, 9, c); px(4, 8, 16, 7, hi2); px(4, 8, 16, 1, hi); px(9, 10, 1, 4, dk);
      break;
    case 'muzzle':
      px(8, 8, 9, 9, c); px(8, 8, 9, 2, hi); px(8, 11, 9, 2, dk); px(8, 15, 9, 2, dk);
      break;
    case 'haori':
      px(5, 3, 14, 18, c); px(9, 3, 6, 18, hi2); px(11, 3, 2, 18, hi); px(5, 3, 2, 18, dk);
      break;
    case 'blade':
      px(11, 3, 4, 13, c); px(11, 3, 2, 13, hi); px(13, 3, 1, 13, dk);
      px(8, 16, 10, 3, dk2); px(11, 19, 4, 3, dk);
      break;
    case 'sheath':
      px(9, 3, 6, 18, c); px(9, 3, 2, 18, hi); px(13, 3, 2, 18, dk); px(8, 2, 8, 2, hi2);
      break;
    case 'chalice':
      px(6, 6, 12, 7, c); px(6, 6, 12, 2, hi); px(6, 12, 12, 1, dk);
      px(11, 13, 3, 6, c); px(6, 19, 13, 3, c); px(6, 19, 13, 1, hi2);
      break;
    case 'banner':
      px(6, 2, 3, 20, dk2); px(9, 3, 12, 15, c); px(9, 3, 12, 2, hi);
      px(9, 16, 12, 2, dk); px(12, 6, 6, 6, hi2);
      break;
    case 'lamp':
      px(11, 6, 3, 12, dk); px(6, 3, 12, 6, c); px(6, 3, 12, 2, hi);
      px(8, 4, 8, 3, hi2); px(6, 8, 12, 1, dk);
      break;
    case 'crystal':
      px(9, 3, 6, 18, c); px(9, 3, 2, 18, hi); px(13, 3, 2, 18, dk); px(10, 6, 2, 6, hi2);
      break;
    default:
      px(5, 5, 14, 14, c); px(5, 5, 14, 2, hi); px(5, 17, 14, 2, dk); px(8, 8, 8, 8, hi2);
      break;
  }

  // Subtle outline pass so icons stay legible on dark panels.
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1, scale * 0.5);
  ctx.strokeRect(0, 0, px0, px0);
}
