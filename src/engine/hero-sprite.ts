import { Bitmap, TAG, castShadow, mix, outline, ramp, type Color, type Ramp } from './pixelkit';
import type { HeroAppearance } from '../data/player';
import { heroOutfit } from '../data/player';

/**
 * Overworld walking sprite for the MC: the same chibi look as the home room
 * (big head, glossy eyes, tiny body) on a 24x28 cell, in four directions with
 * a four-frame walk. It dresses from the equipped wardrobe outfit, so the
 * costume you pick shows up on the quest map too.
 */

export const SPRITE_W = 24;
export const SPRITE_H = 28;

export type Dir = 'down' | 'up' | 'left' | 'right';

const rcache = new Map<number, Ramp>();
function rp(c: Color): Ramp {
  let r = rcache.get(c);
  if (!r) {
    r = ramp(c);
    rcache.set(c, r);
  }
  return r;
}

const HAIR_TAIL: Record<string, number> = { long: 23, hime: 23, bob: 17, twin: 21, braid: 21, ponytail: 20 };
const SPIKY = new Set(['spiky', 'messy', 'mohawk']);

function hairRampOf(c: Color): Ramp {
  const l = 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
  const r = ramp(c);
  return l < 70 ? { hi: mix(c, 0x8a98d8, 0.5), base: c, sh: mix(c, 0x0a0a18, 0.35), deep: mix(c, 0x05050e, 0.55) } : r;
}

const cache = new Map<string, Bitmap>();

function build(hero: HeroAppearance, dir: Dir, frame: number): Bitmap {
  const b = new Bitmap(SPRITE_W, SPRITE_H);
  const out = heroOutfit(hero);
  const f = ((frame % 4) + 4) % 4;
  const side = dir === 'left' || dir === 'right';
  const skin = rp(hero.skin);
  const hair = hairRampOf(hero.hair);
  const eye = rp(hero.eye);
  const base = rp(out.garment.base);
  const trim = rp(out.garment.trim);
  const pants = rp(out.legs.color);
  const boots = rp(out.legs.boots);
  const bob = f === 1 || f === 3 ? 1 : 0;
  const step = f === 1 ? -1 : f === 3 ? 1 : 0;
  // facing: -1 left, +1 right, 0 front/back. Drawn facing left then mirrored.
  const style = hero.hairStyle;

  // ── back items ──
  const back = out.back;
  if (back && back.piece !== 'none') {
    const m = rp(back.color);
    if (back.piece === 'cape' || back.piece === 'cloak') {
      b.shape(4, 17 - bob, 19, 27, (x, y) => y >= 17 - bob && y <= 26 && x >= 7 - Math.floor((y - 17) / 3) && x <= 16 + Math.floor((y - 17) / 3), m, { tag: TAG.cloth });
    } else if (back.piece === 'pack') {
      b.rrect(6, 18 - bob, 12, 7, m, { tag: TAG.cloth });
    } else if (back.piece === 'haoriTails') {
      b.rect(6, 22, 3, 5, m, { tag: TAG.cloth });
      b.rect(15, 22, 3, 5, m, { tag: TAG.cloth });
    } else if (dir === 'up' && (back.piece === 'swords' || back.piece === 'greatsword')) {
      b.line(7, 22, 16, 14, m.base, 2, TAG.prop);
      if (back.piece === 'swords') b.line(16, 22, 7, 14, m.base, 2, TAG.prop);
    } else if (back.piece === 'swords' || back.piece === 'greatsword') {
      b.line(15, 22, 19, 12, m.base, 2, TAG.prop);
    }
  }

  // ── legs ──
  const ly = 23;
  const legL = ly + (step < 0 ? -1 : 0);
  const legR = ly + (step > 0 ? -1 : 0);
  if (side) {
    const shift = step * 2;
    b.rect(9 + shift, 23, 3, 4, pants, { tag: TAG.cloth });
    b.rect(12 - shift, 23, 3, 4, pants, { tag: TAG.cloth });
    b.rrect(8 + shift, 26, 4, 2, boots, { tag: TAG.cloth });
    b.rrect(12 - shift, 26, 4, 2, boots, { tag: TAG.cloth });
  } else {
    b.rect(9, legL, 3, 4 - (legL < ly ? 0 : 0), pants, { tag: TAG.cloth });
    b.rect(12, legR, 3, 4, pants, { tag: TAG.cloth });
    b.rrect(8, legL + 3, 4, 2, boots, { tag: TAG.cloth });
    b.rrect(12, legR + 3, 4, 2, boots, { tag: TAG.cloth });
  }
  if (out.legs.shape === 'hakama') b.rect(8, 22, 8, 4, pants, { tag: TAG.cloth });
  if (out.legs.shape === 'shorts' && !side) {
    b.rect(9, 26 - 1, 3, 2, skin, { tag: TAG.skin });
    b.rect(12, 26 - 1, 3, 2, skin, { tag: TAG.skin });
  }

  // ── torso + arms ──
  const ty = 17 - bob;
  const longCoat = out.garment.shape === 'coat' || out.garment.shape === 'robe';
  b.rrect(8, ty + 1, 8, 6 + bob, base, { tag: TAG.cloth });
  if (longCoat) b.shape(7, ty + 6, 17, ty + 10, (x, y) => y <= ty + 9 && x >= 8 - (y - ty - 6) * 0.3 && x <= 15 + (y - ty - 6) * 0.3, base, { tag: TAG.cloth });
  const g = out.garment;
  if (g.pattern === 'checker') {
    for (let y = ty; y < ty + 10; y++) for (let x = 6; x < 18; x++) if (b.tagAt(x, y) === TAG.cloth && ((x >> 1) + (y >> 1)) % 2) b.set(x, y, rp(g.patternColor ?? g.trim).base, TAG.cloth);
  }
  if (!side && dir === 'down') {
    // front: collar/under strip + belt
    if (g.under && g.shape !== 'tee') b.fill(11, ty + 1, 2, 5, rp(g.under).base, TAG.cloth);
    if (out.neck?.kind === 'tie') b.fill(11, ty + 1, 2, 4, rp(out.neck.color).base, TAG.accessory);
    if (g.shape === 'vest') b.fill(10, ty + 1, 4, 5, skin.base, TAG.skin);
  }
  if (out.belt) b.fill(8, ty + 5, 8, 1, rp(out.belt.color).base, TAG.accessory);
  const arm = rp(g.shape === 'vest' ? hero.skin : g.base);
  const hand = out.gloves ? rp(out.gloves) : skin;
  const swing = step;
  if (side) {
    b.rrect(10, ty + 1 + (swing ? 0 : 0), 3, 6, arm, { tag: TAG.cloth });
    b.rect(10 + swing, ty + 6, 3, 2, hand, { tag: TAG.skin });
  } else {
    b.rrect(5, ty + 1, 3, 6, arm, { tag: TAG.cloth });
    b.rrect(16, ty + 1, 3, 6, arm, { tag: TAG.cloth });
    b.rect(5, ty + 6, 3, 2, hand, { tag: TAG.skin });
    b.rect(16, ty + 6, 3, 2, hand, { tag: TAG.skin });
  }
  if (dir === 'up' && out.emblem?.where === 'back') {
    const em = rp(out.emblem.color).base;
    b.fill(11, ty + 2, 2, 3, em, TAG.accessory);
    b.fill(10, ty + 3, 4, 1, em, TAG.accessory);
  }

  // ── head ──
  const hy = 2 - bob;
  const cx = side ? 12 : 12;
  const tail = HAIR_TAIL[style];
  if (tail) {
    const tx = side ? 15 : 12;
    b.shape(2, hy + 6, 22, tail - bob, (x, y) => y <= tail - bob && Math.abs(x + 0.5 - tx) <= (side ? 4.5 : 10.5) - (y > tail - bob - 2 ? 1 : 0), { ...hair, base: hair.sh, hi: hair.base }, { tag: TAG.hair, shading: 0.4, light: [-0.2, -1] });
  }
  b.ellipse(cx, hy + 8, 9.5, 8.5, { ...skin, deep: skin.sh }, { p: 2.5, tag: TAG.skin, shading: 0.8 });

  // hair cap
  const spiky = SPIKY.has(style);
  const fringe = (x: number) => {
    const d = Math.abs(x + 0.5 - cx);
    return hy + (dir === 'up' ? 15 : spiky ? 5 + ((x * 5) % 3) : 5 + (d < 1.5 ? 0 : 1) + ((x * 3) % 7 < 2 ? 1 : 0));
  };
  b.shape(0, hy - 2, 24, hy + 18, (x, y) => {
    const dx = (x + 0.5 - cx) / 10.7;
    const dy = (y + 0.5 - (hy + 8)) / 9.7;
    if (Math.pow(Math.abs(dx), 2.5) + Math.pow(Math.abs(dy), 2.5) > 1) return false;
    if (side) {
      // hair covers the back half of the head and the top
      const back = dir === 'left' ? x >= cx + 1 : x <= cx - 1;
      return back ? y <= hy + 14 : y <= fringe(x);
    }
    return y <= fringe(x) || (dir === 'up' && y <= hy + 15);
  }, hair, { tag: TAG.hair, shading: 0.7, light: [-0.25, -1] });
  if (spiky) {
    for (const [sx, h] of [[6, 3], [10, 5], [14, 5], [18, 3]] as [number, number][]) {
      b.shape(sx - 2, hy - h, sx + 2, hy + 1, (x, y) => Math.abs(x + 0.5 - sx) <= ((y - (hy - h)) / (h + 1)) * 2.2, hair, { tag: TAG.hair, shading: 0.6 });
    }
  }
  if (style === 'ponytail' && dir !== 'down') b.shape(16, hy + 4, 23, hy + 16, (x, y) => ((x + 0.5 - 19.5) / 3) ** 2 + ((y + 0.5 - (hy + 11)) / 6) ** 2 <= 1, hair, { tag: TAG.hair });
  for (let x = 0; x < 24; x++) for (let y = hy; y < hy + 18; y++) if (b.tagAt(x, y) === TAG.hair && b.tagAt(x, y + 1) === TAG.skin) b.set(x, y, hair.deep, TAG.hair);
  castShadow(b, TAG.skin, TAG.hair, mix(skin.sh, 0x8a4a6a, 0.2));

  // face
  if (dir !== 'up') {
    const lash = mix(hair.deep, 0x1a0f24, 0.55);
    const ey = hy + 9;
    const drawEye = (x: number) => {
      b.fill(x, ey, 3, 3, eye.base, TAG.eye);
      b.fill(x, ey, 3, 1, eye.deep, TAG.eye);
      b.set(x, ey - 1, lash, TAG.eye);
      b.set(x + 1, ey - 1, lash, TAG.eye);
      b.set(x + 2, ey - 1, lash, TAG.eye);
      b.set(x, ey + 1, 0xffffff, TAG.eye);
      b.set(x + 2, ey + 2, mix(eye.hi, 0xffffff, 0.6), TAG.eye);
    };
    const blush = mix(hero.skin, 0xff7a96, 0.5);
    if (!side) {
      drawEye(6);
      drawEye(15);
      b.set(5, ey + 3, blush, TAG.skin);
      b.set(6, ey + 3, blush, TAG.skin);
      b.set(17, ey + 3, blush, TAG.skin);
      b.set(18, ey + 3, blush, TAG.skin);
      b.set(11, ey + 4, mix(0x8a2a3a, skin.sh, 0.2), TAG.eye);
      b.set(12, ey + 4, mix(0x8a2a3a, skin.sh, 0.2), TAG.eye);
    } else {
      const ex = dir === 'left' ? 5 : 16;
      drawEye(ex);
      b.set(dir === 'left' ? 4 : 19, ey + 3, blush, TAG.skin);
      b.set(dir === 'left' ? 4 : 19, ey + 4, mix(0x8a2a3a, skin.sh, 0.2), TAG.eye);
    }
  }

  // head gear
  const h = out.head;
  if (h && h.piece !== 'none') {
    const m = rp(h.color);
    const t = rp(h.trim ?? h.color);
    switch (h.piece) {
      case 'headband':
      case 'bandana':
        b.fill(3, hy + 5, 18, 2, m.base, TAG.accessory);
        if (h.piece === 'headband' && dir === 'down') b.fill(9, hy + 4, 6, 4, rp(h.plate ?? 0xc8d0e0).base, TAG.accessory);
        break;
      case 'strawhat':
        b.ellipse(12, hy + 4.5, 12, 2.6, m, { tag: TAG.accessory });
        b.shape(6, hy - 4, 18, hy + 4, (x, y) => y <= hy + 4 && ((x + 0.5 - 12) / 6.5) ** 2 + ((y + 0.5 - (hy + 3)) / 7) ** 2 <= 1, m, { tag: TAG.accessory });
        b.fill(6, hy + 2, 12, 1, t.base, TAG.accessory);
        break;
      case 'cap':
        b.shape(2, hy - 2, 22, hy + 7, (x, y) => y <= hy + 5 && ((x + 0.5 - 12) / 10.5) ** 2 + ((y + 0.5 - (hy + 6)) / 8) ** 2 <= 1, m, { tag: TAG.accessory });
        if (dir === 'down') b.fill(5, hy + 5, 14, 2, m.sh, TAG.accessory);
        break;
      case 'hood':
        b.shape(0, hy - 2, 24, hy + 18, (x, y) => {
          const d = ((x + 0.5 - 12) / 11.8) ** 2.5 + ((y + 0.5 - (hy + 8)) / 10.5) ** 2.5;
          return d <= 1 && (y <= hy + 3 || Math.abs(x + 0.5 - 12) >= 9.2);
        }, m, { tag: TAG.accessory });
        break;
      case 'goggles':
        b.fill(3, hy + 4, 18, 1, m.base, TAG.accessory);
        b.fill(5, hy + 1, 4, 3, t.base, TAG.accessory);
        b.fill(15, hy + 1, 4, 3, t.base, TAG.accessory);
        break;
      case 'tophat':
        b.rect(7, hy - 5, 10, 7, m, { tag: TAG.accessory });
        b.fill(7, hy, 10, 1, t.base, TAG.accessory);
        b.fill(4, hy + 2, 16, 1, m.sh, TAG.accessory);
        break;
      case 'mask':
        if (dir === 'down') b.rrect(8, hy + 12, 8, 3, m, { tag: TAG.accessory });
        break;
      case 'crown':
        b.fill(7, hy + 1, 10, 2, rp(0xe8c040).base, TAG.accessory);
        for (const x of [7, 10, 13, 16]) b.set(x, hy, rp(0xf0d070).base, TAG.accessory);
        break;
      case 'headset':
        b.fill(1, hy + 8, 2, 4, m.base, TAG.accessory);
        b.fill(21, hy + 8, 2, 4, m.base, TAG.accessory);
        break;
      default:
        break;
    }
  }

  const sprite = outline(b, 0.36);
  if (dir !== 'right') return sprite;
  const flipped = new Bitmap(sprite.w, sprite.h);
  flipped.blit(sprite, 0, 0, true);
  return flipped;
}

function frameBitmap(hero: HeroAppearance, dir: Dir, frame: number): Bitmap {
  const key = [
    hero.skin, hero.hair, hero.hairStyle, hero.eye, hero.top, hero.bottom, hero.accent, hero.headgear, hero.back, hero.outfit ?? '',
    dir === 'right' ? 'left' : dir, frame & 3,
  ].join('|');
  let hit = cache.get(key + (dir === 'right' ? 'R' : ''));
  if (!hit) {
    hit = build(hero, dir === 'right' ? 'left' : dir, frame);
    if (dir === 'right') {
      const f = new Bitmap(hit.w, hit.h);
      f.blit(hit, 0, 0, true);
      hit = f;
    }
    cache.set(key + (dir === 'right' ? 'R' : ''), hit);
    if (cache.size > 800) cache.delete(cache.keys().next().value as string);
  }
  return hit;
}

/**
 * Draw one hero frame into a 2D context, aligned to the top-left of the
 * sprite cell. The context must already be scaled so 1 unit = 1 pixel.
 */
export function drawHeroSprite(
  ctx: CanvasRenderingContext2D,
  hero: HeroAppearance,
  dir: Dir,
  frame: number,
  x = 0,
  y = 0,
) {
  ctx.drawImage(frameBitmap(hero, dir, frame).canvas(), x, y);
}

/** Render a hero frame to a standalone canvas at `scale` device pixels per sprite pixel. */
export function heroSpriteCanvas(hero: HeroAppearance, dir: Dir, frame: number, scale = 4): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SPRITE_W * scale;
  c.height = SPRITE_H * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(scale, scale);
  drawHeroSprite(ctx, hero, dir, frame);
  return c;
}

/** Sprite sheet layout used by the overworld: 4 directions x 4 walk frames. */
export const SHEET_DIRS: Dir[] = ['down', 'left', 'right', 'up'];
export const SHEET_FRAMES = 4;

export function drawHeroSheet(ctx: CanvasRenderingContext2D, hero: HeroAppearance) {
  for (let d = 0; d < SHEET_DIRS.length; d++) {
    for (let f = 0; f < SHEET_FRAMES; f++) drawHeroSprite(ctx, hero, SHEET_DIRS[d], f, d * SPRITE_W, f * SPRITE_H);
  }
}

export function heroSheetCanvas(hero: HeroAppearance, scale = 1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SPRITE_W * SHEET_DIRS.length * scale;
  c.height = SPRITE_H * SHEET_FRAMES * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(scale, scale);
  drawHeroSheet(ctx, hero);
  return c;
}
