import { TAG, mix, ramp, type Bitmap, type Color, type Ramp } from './pixelkit';
import { inHead, torsoBox, type Rig } from './chibi-rig';
import type { Glyph, OutfitDef } from '../data/outfits';

/**
 * Draws a hero costume onto the chibi body.
 *
 * The renderer calls four hooks in order: `drawOutfitBack` (capes and packs,
 * behind the body), `drawOutfitBody` (legs, torso, sleeves, gloves, belt,
 * neckwear), `drawOutfitHead` (hats and headbands over the hair) and
 * `drawOutfitFront` (weapons at the hip, harness straps, chest glyphs).
 */

const C = TAG.cloth;
const A = TAG.accessory;
const P = TAG.prop;

const rampCache = new Map<number, Ramp>();
function rp(c: Color): Ramp {
  let r = rampCache.get(c);
  if (!r) {
    r = ramp(c);
    rampCache.set(c, r);
  }
  return r;
}

function o(r: Rig): OutfitDef {
  return r.outfit as OutfitDef;
}

// ── back layer ──────────────────────────────────────────────────────────────

export function drawOutfitBack(r: Rig) {
  const { b } = r;
  const back = o(r).back;
  if (!back || back.piece === 'none') return;
  const main = rp(back.color);
  const trim = rp(back.trim ?? back.color);

  switch (back.piece) {
    case 'cape':
      b.shape(12, 35, 35, 53, (x, y) => {
        const spread = Math.floor((y - 35) * 0.28);
        return y >= 35 && y <= 53 && x >= 16 - spread && x <= 31 + spread;
      }, main, { tag: C });
      for (let x = 12; x <= 35; x++) if (b.tagAt(x, 52) === C || b.tagAt(x, 53) === C) b.set(x, 53, trim.base, C);
      break;
    case 'cloak':
      b.shape(10, 34, 37, 54, (x, y) => {
        const spread = Math.floor((y - 34) * 0.34);
        return y >= 34 && y <= 54 && x >= 16 - spread && x <= 31 + spread;
      }, main, { tag: C });
      for (let x = 10; x <= 37; x++) if (b.tagAt(x, 54) === C) b.set(x, 54, trim.sh, C);
      break;
    case 'haoriTails':
      b.rect(14, 42, 5, 9, main, { tag: C });
      b.rect(29, 42, 5, 9, main, { tag: C });
      break;
    case 'swords': {
      // hilts peek over the shoulders
      for (const side of [-1, 1]) {
        const x = side < 0 ? 9 : 37;
        b.line(x + side * -1, 35, x + side * 2, 27, rp(0x4a3a2a).base, 2, P);
        b.fill(x + (side < 0 ? -1 : 0), 26, 4, 1, 0xd8b84a, P);
        b.line(x + side * -1, 36, x + side * -3, 44, main.base, 2, P);
      }
      break;
    }
    case 'greatsword':
      b.line(10, 52, 36, 24, main.base, 4, P);
      b.line(11, 52, 37, 24, main.hi, 1, P);
      b.line(37, 23, 41, 17, rp(0xf0f0f4).base, 3, P);
      b.fill(34, 24, 6, 2, 0x4a4a58, P);
      break;
    case 'pack':
      b.rrect(13, 35, 22, 12, main, { tag: C });
      b.fill(14, 38, 20, 1, trim.sh, C);
      break;
    default:
      break;
  }
}

// ── body layer ──────────────────────────────────────────────────────────────

function legs(r: Rig) {
  const { b } = r;
  const def = o(r).legs;
  const pants = rp(def.color);
  const boot = rp(def.boots);
  const trim = def.trim ? rp(def.trim) : null;
  const sit = r.pose === 'sit' ? -2 : 0;

  switch (def.shape) {
    case 'shorts': {
      b.rect(19, 44, 5, 4, pants, { tag: C });
      b.rect(24, 44, 5, 4, pants, { tag: C });
      b.rect(20, 48, 3, 4 + sit, r.skin, { tag: TAG.skin });
      b.rect(25, 48, 3, 4 + sit, r.skin, { tag: TAG.skin });
      break;
    }
    case 'hakama': {
      b.shape(15, 43, 33, 52 + sit, (x, y) => {
        const spread = Math.floor((y - 43) * 0.45);
        return y >= 43 && y <= 51 + sit && x >= 18 - spread && x <= 29 + spread;
      }, pants, { tag: C });
      for (const x of [21, 24, 27]) for (let y = 45; y <= 51 + sit; y++) b.set(x, y, pants.sh, C);
      if (def.socks) {
        b.rect(19, 51 + sit, 4, 2, rp(def.socks), { tag: C });
        b.rect(25, 51 + sit, 4, 2, rp(def.socks), { tag: C });
      }
      break;
    }
    default: {
      b.rect(19, 44, 5, 8 + sit, pants, { tag: C });
      b.rect(24, 44, 5, 8 + sit, pants, { tag: C });
      b.set(24, 46, pants.deep, C);
      b.set(24, 47, pants.deep, C);
      if (trim) {
        for (let y = 44; y < 51 + sit; y++) {
          b.set(19, y, trim.base, C);
          b.set(28, y, trim.base, C);
        }
      }
    }
  }
  const bootTop = def.shape === 'hakama' ? 52 : def.shape === 'shorts' ? 51 : 50;
  b.rrect(18, bootTop + sit, 6, 55 - bootTop - 0 + 0 > 3 ? 4 : 3, boot, { tag: C });
  b.rrect(24, bootTop + sit, 6, 55 - bootTop - 0 + 0 > 3 ? 4 : 3, boot, { tag: C });
  b.fill(18, 54 + sit, 12, 1, boot.sh, C);
}

function garmentColors(r: Rig) {
  const g = o(r).garment;
  return { base: rp(g.base), trim: rp(g.trim), under: rp(g.under ?? g.base), pat: rp(g.patternColor ?? g.trim) };
}

/** Recolour cloth pixels in a rectangle with a pattern, preserving the shading tone. */
function pattern(b: Bitmap, x0: number, y0: number, x1: number, y1: number, base: Ramp, f: (x: number, y: number) => Color | null) {
  const tones = new Set([base.hi, base.base, base.sh, base.deep].map((c) => (0xff000000 | c) >>> 0));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (b.tagAt(x, y) !== C) continue;
      if (!tones.has(b.get(x, y))) continue;
      const c = f(x, y);
      if (c !== null) b.set(x, y, c, C);
    }
  }
}

function torso(r: Rig) {
  const { b } = r;
  const g = o(r).garment;
  const col = garmentColors(r);
  const tb = torsoBox(true);
  const sit = r.pose === 'sit';
  void sit;

  // lower body garment flare drawn first so the torso overlaps it
  if (g.shape === 'coat') {
    b.shape(15, 42, 33, 51, (x, y) => {
      const spread = Math.floor((y - 42) * 0.3);
      return y >= 42 && y <= 50 && x >= 18 - spread && x <= 29 + spread;
    }, col.base, { tag: C });
    // open front shows the lining
    for (let y = 44; y <= 50; y++) {
      b.set(23, y, col.under.base, C);
      b.set(24, y, col.under.sh, C);
    }
    for (let x = 14; x <= 34; x++) if (b.tagAt(x, 50) === C) b.set(x, 50, col.trim.base, C);
  } else if (g.shape === 'robe') {
    b.shape(15, 42, 33, 49, (x, y) => {
      const spread = Math.floor((y - 42) * 0.3);
      return y >= 42 && y <= 48 && x >= 18 - spread && x <= 29 + spread;
    }, col.base, { tag: C });
  } else if (g.shape === 'armor') {
    // tabard hanging below the plate
    b.rect(21, 43, 6, 8, col.under, { tag: C });
    b.fill(23, 44, 2, 6, col.under.hi, C);
    b.fill(21, 50, 6, 1, rp(0xe8c040).base, C);
  }

  b.rrect(tb.x, tb.y, tb.w, tb.h, col.base, { tag: C });

  switch (g.shape) {
    case 'hoodie':
      b.fill(19, 33, 10, 2, col.trim.base, C);
      b.fill(18, 34, 1, 2, col.trim.sh, C);
      b.fill(29, 34, 1, 2, col.trim.sh, C);
      b.rect(21, 39, 6, 4, col.trim, { tag: C, shading: 0 });
      b.fill(21, 39, 6, 1, col.trim.sh, C);
      b.set(22, 36, 0xf4f4f8, C);
      b.set(25, 36, 0xf4f4f8, C);
      b.set(22, 37, 0xf4f4f8, C);
      b.set(25, 37, 0xf4f4f8, C);
      break;
    case 'jacket':
      b.fill(23, 35, 2, 8, col.under.base, C);
      b.fill(23, 35, 1, 8, col.under.hi, C);
      b.fill(20, 34, 3, 2, col.trim.base, C);
      b.fill(25, 34, 3, 2, col.trim.base, C);
      b.fill(tb.x, 42, tb.w, 2, col.trim.sh, C);
      break;
    case 'coat':
      b.fill(23, 35, 2, 8, col.under.base, C);
      b.fill(20, 34, 3, 3, col.trim.base, C);
      b.fill(25, 34, 3, 3, col.trim.base, C);
      b.fill(tb.x, 42, tb.w, 1, col.trim.sh, C);
      break;
    case 'gi':
      // crossed collar
      for (let i = 0; i < 5; i++) {
        b.set(22 + (i < 3 ? i : 0), 35 + i, col.under.base, C);
        b.set(26 - (i < 3 ? i : 0), 35 + i, col.under.base, C);
      }
      b.fill(21, 34, 6, 1, col.under.base, C);
      b.fill(23, 36, 2, 2, col.under.sh, C);
      break;
    case 'uniform':
      b.fill(22, 34, 4, 5, col.under.base, C);
      b.fill(22, 34, 4, 1, col.under.hi, C);
      for (let i = 0; i < 4; i++) {
        b.set(22 + (i < 2 ? i : 0), 35 + i, col.base.sh, C);
        b.set(25 - (i < 2 ? i : 0), 35 + i, col.base.sh, C);
      }
      b.set(23, 41, col.trim.base, C);
      b.set(23, 43, col.trim.base, C);
      b.fill(tb.x, 34, 2, 1, col.trim.sh, C);
      b.fill(tb.x + tb.w - 2, 34, 2, 1, col.trim.sh, C);
      break;
    case 'robe':
      for (let i = 0; i < 6; i++) {
        b.set(21 + Math.min(i, 3), 34 + i, col.under.base, C);
        b.set(27 - Math.min(i, 3), 34 + i, col.base.sh, C);
      }
      b.fill(22, 34, 5, 1, col.under.base, C);
      break;
    case 'vest':
      // bare chest between two panels
      b.rect(22, 34, 5, 9, r.skin, { tag: TAG.skin, shading: 0 });
      b.fill(21, 34, 1, 9, col.trim.base, C);
      b.fill(27, 34, 1, 9, col.trim.base, C);
      b.fill(23, 38, 2, 1, r.skin.sh, TAG.skin);
      break;
    case 'suit':
      b.fill(tb.x, 42, tb.w, 1, col.base.sh, C);
      break;
    case 'armor': {
      b.rrect(19, 34, 10, 9, col.base, { tag: C });
      b.fill(23, 35, 2, 7, col.base.hi, C);
      b.fill(19, 40, 10, 1, col.base.sh, C);
      b.fill(19, 42, 10, 1, col.trim.sh, C);
      // pauldrons
      b.rrect(15, 34, 5, 4, col.trim, { tag: C });
      b.rrect(28, 34, 5, 4, col.trim, { tag: C });
      break;
    }
    default:
      break;
  }

  // patterns
  if (g.pattern === 'checker') {
    pattern(b, 14, 33, 34, 51, col.base, (x, y) => (((x >> 1) + (y >> 1)) & 1 ? col.pat.base : null));
  } else if (g.pattern === 'stripes') {
    pattern(b, 14, 34, 34, 50, col.base, (x) => (x === 19 || x === 28 || x === 16 || x === 31 ? col.pat.base : null));
  } else if (g.pattern === 'panels') {
    pattern(b, 14, 33, 34, 51, col.base, (x, y) => {
      if (y <= 36 && (x <= 22 || x >= 26)) return col.pat.base;
      if (x === 18 || x === 29) return col.pat.sh;
      return null;
    });
  }
}

function arms(r: Rig) {
  const { b } = r;
  const g = o(r).garment;
  const col = garmentColors(r);
  const o_ = o(r);
  const hold = r.arms === 'hold';

  const bare = g.shape === 'vest';
  const short = g.shape === 'tee' || g.shape === 'suit' ? false : false;
  void short;
  const sleeve = bare ? r.skin : g.shape === 'armor' ? rp(o_.gloves ?? g.under ?? g.base) : col.base;
  const cuff = g.shape === 'gi' ? col.under : g.shape === 'jacket' || g.shape === 'uniform' || g.shape === 'hoodie' ? col.trim : null;
  const handCol = o_.gloves ? rp(o_.gloves) : r.skin;
  const tag = bare ? TAG.skin : C;

  if (hold) {
    for (const side of [-1, 1]) {
      const ux = side < 0 ? 15 : 30;
      b.rrect(ux, 35, 3, 5, sleeve, { tag });
      const fx = side < 0 ? 18 : 25;
      b.rrect(fx, 38, 5, 3, sleeve, { tag });
      const hx = side < 0 ? 22 : 24;
      b.rect(hx, 38, 2, 3, handCol, { tag: o_.gloves ? C : TAG.skin });
    }
    return;
  }

  for (const ux of [15, 30]) {
    b.rrect(ux, 35, 3, 8, sleeve, { tag });
    if (cuff) b.fill(ux, 41, 3, 2, cuff.base, C);
    if (g.shape === 'gi') b.fill(ux, 41, 3, 2, rp(0x2a4a9a).base, C);
    b.rect(ux, 43, 3, 2, handCol, { tag: o_.gloves ? C : TAG.skin });
  }
  if (g.pattern === 'stripes') {
    for (const x of [16, 31]) for (let y = 36; y <= 42; y++) b.set(x, y, col.pat.base, C);
  }
  if (g.shape === 'robe') {
    // wide hanging sleeves
    for (const ux of [13, 31]) {
      b.rrect(ux, 37, 4, 8, col.base, { tag: C });
      b.fill(ux, 44, 4, 1, col.under.sh, C);
    }
    if (g.pattern === 'checker') pattern(b, 12, 36, 36, 45, col.base, (x, y) => (((x >> 1) + (y >> 1)) & 1 ? col.pat.base : null));
  }
}

function belt(r: Rig) {
  const { b } = r;
  const def = o(r);
  if (!def.belt) return;
  const c = rp(def.belt.color);
  const y = 42;
  const tb = torsoBox(true);
  b.fill(tb.x, y, tb.w, 2, c.base, A);
  b.fill(tb.x, y, tb.w, 1, c.hi, A);
  if (def.belt.buckle) {
    b.fill(23, y, 2, 2, rp(def.belt.buckle).hi, A);
  } else if (def.garment.shape === 'gi' || def.garment.shape === 'robe' || def.id === 'pirate') {
    // sash knot and trailing ends
    b.fill(26, y, 3, 3, c.base, A);
    b.fill(27, y + 3, 1, 4, c.sh, A);
    b.fill(29, y + 3, 1, 3, c.sh, A);
  }
}

function neck(r: Rig) {
  const { b } = r;
  const n = o(r).neck;
  if (!n || n.kind === 'none') return;
  const c = rp(n.color);
  switch (n.kind) {
    case 'tie':
      b.fill(23, 35, 2, 2, c.base, A);
      b.fill(23, 37, 2, 4, c.sh, A);
      b.set(23, 41, c.deep, A);
      b.set(24, 41, c.deep, A);
      break;
    case 'collar':
      b.rect(20, 34, 8, 3, c, { tag: A, shading: 1 });
      b.set(21, 35, 0xc8cce0, A);
      b.set(26, 35, 0xc8cce0, A);
      break;
    case 'scarf':
      b.rrect(17, 35, 14, 3, c, { tag: A });
      b.rrect(27, 37, 3, 8, c, { tag: A });
      break;
  }
}

function glyph(b: Bitmap, g: Glyph, cx: number, cy: number, col: Color, tag: number) {
  const px = (dx: number, dy: number) => b.set(cx + dx, cy + dy, col, tag);
  switch (g) {
    case 'cross':
      px(0, -2); px(0, -1); px(0, 0); px(0, 1); px(-1, -1); px(1, -1);
      break;
    case 'diamond':
      px(0, -2); px(-1, -1); px(1, -1); px(-1, 0); px(1, 0); px(0, 1); px(0, -1);
      break;
    case 'circle':
      px(-1, -1); px(0, -1); px(1, -1); px(-1, 0); px(1, 0); px(-1, 1); px(0, 1); px(1, 1);
      break;
    case 'star':
      px(0, -2); px(0, -1); px(-2, -1); px(-1, -1); px(1, -1); px(2, -1); px(-1, 0); px(0, 0); px(1, 0); px(-1, 1); px(1, 1);
      break;
    case 'flame':
      px(0, -2); px(0, -1); px(-1, 0); px(0, 0); px(1, 0); px(-1, 1); px(0, 1); px(1, 1);
      break;
    case 'wing':
      px(-3, -1); px(-2, -1); px(-1, 0); px(0, 0); px(1, 0); px(2, -1); px(3, -1); px(-2, 0); px(2, 0); px(-3, 0); px(3, 0);
      break;
    case 'swirl':
      px(-1, -1); px(0, -1); px(1, -1); px(1, 0); px(0, 1); px(-1, 1); px(-1, 0); px(0, 0);
      break;
  }
}

export function drawOutfitBody(r: Rig) {
  legs(r);
  torso(r);
  arms(r);
  belt(r);
  neck(r);
  const em = o(r).emblem;
  if (em && em.where === 'chest') glyph(r.b, em.glyph, 24, 38, em.color, A);
}

// ── head layer ──────────────────────────────────────────────────────────────

export function drawOutfitHead(r: Rig) {
  const { b } = r;
  const h = o(r).head;
  if (!h || h.piece === 'none') return;
  const main = rp(h.color);
  const trim = rp(h.trim ?? h.color);
  const plate = rp(h.plate ?? 0xc8d0e0);

  switch (h.piece) {
    case 'headband':
    case 'bandana': {
      for (let x = 7; x <= 40; x++) {
        for (let y = 12; y <= 15; y++) {
          if (inHead(x, y, 1.3)) b.set(x, y, y === 15 ? main.sh : y === 12 ? main.hi : main.base, A);
        }
      }
      if (h.piece === 'headband') {
        b.fill(18, 11, 12, 6, plate.base, A);
        b.fill(18, 11, 12, 1, 0xf0f4ff, A);
        b.fill(18, 16, 12, 1, 0x7a84a0, A);
        b.fill(21, 13, 6, 1, 0x4a5470, A);
        b.set(22, 12, 0x4a5470, A);
        b.set(25, 14, 0x4a5470, A);
      } else {
        // knot at the side
        b.fill(36, 14, 4, 3, main.base, A);
        b.fill(39, 17, 2, 4, main.sh, A);
      }
      break;
    }
    case 'strawhat': {
      b.ellipse(24, 10.5, 21, 3.6, main, { tag: A });
      b.shape(13, 1, 35, 10, (x, y) => ((x + 0.5 - 24) / 11) ** 2 + ((y + 0.5 - 9) / 8.5) ** 2 <= 1 && y <= 9, main, { tag: A });
      b.fill(13, 7, 22, 2, trim.base, A);
      b.fill(13, 8, 22, 1, trim.sh, A);
      for (let x = 5; x < 43; x += 3) b.set(x, 10, main.sh, A);
      break;
    }
    case 'cap': {
      b.shape(8, 3, 40, 16, (x, y) => inHead(x, y, 1.6) && y <= 13, main, { tag: A });
      b.shape(11, 13, 37, 17, (x, y) => y >= 13 && y <= 16 && Math.abs(x + 0.5 - 24) <= 12 - (y - 13) * 1.4, { ...main, base: main.sh, hi: main.base }, { tag: A, shading: 0 });
      b.fill(11, 13, 26, 1, main.deep, A);
      const em = o(r).emblem;
      if (em && em.where === 'hat') glyph(b, em.glyph, 24, 9, em.color, A);
      break;
    }
    case 'goggles': {
      b.fill(8, 13, 32, 2, main.base, A);
      for (const x of [13, 29]) {
        b.rrect(x, 7, 7, 6, trim, { tag: A });
        b.fill(x + 1, 8, 5, 4, 0x8ad8f0, A);
        b.set(x + 1, 8, 0xe8fbff, A);
        b.set(x + 2, 8, 0xe8fbff, A);
      }
      break;
    }
    case 'hood': {
      b.shape(4, 2, 44, 36, (x, y) => {
        if (inHead(x, y, 2.6) && y <= 13) return true;
        const out = inHead(x, y, 2.6) && !inHead(x, y, -0.2);
        return out && y <= 36;
      }, main, { tag: A });
      for (let x = 4; x <= 44; x++) if (b.tagAt(x, 13) === A) b.set(x, 13, trim.hi, A);
      break;
    }
    case 'tophat': {
      b.ellipse(24, 9.5, 14, 2.8, main, { tag: A });
      b.rect(15, 0, 18, 10, main, { tag: A });
      b.fill(15, 6, 18, 2, trim.base, A);
      b.fill(15, 7, 18, 1, trim.sh, A);
      break;
    }
    case 'mask': {
      b.rrect(18, 30, 12, 5, main, { tag: A });
      for (const x of [21, 24, 27]) b.fill(x, 31, 1, 3, trim.base, A);
      b.fill(18, 30, 12, 1, main.hi, A);
      break;
    }
    case 'headset': {
      for (const side of [-1, 1]) {
        const x = side < 0 ? 6 : 40;
        b.rrect(x, 21, 3, 6, main, { tag: A });
        b.set(x + 1, 22, main.hi, A);
      }
      b.line(8, 27, 15, 32, rp(0x2a2a34).base, 1, A);
      b.fill(14, 32, 3, 2, main.base, A);
      break;
    }
    case 'crown': {
      const g = rp(0xe8c040);
      b.fill(16, 8, 17, 3, g.base, A);
      for (const x of [16, 20, 24, 28, 32]) b.fill(x, 5, 2, 3, g.hi, A);
      b.set(24, 6, 0xe84a6a, A);
      b.fill(16, 10, 17, 1, g.sh, A);
      break;
    }
    case 'horns': {
      for (const side of [-1, 1]) {
        const cx = 24 + side * 9;
        for (let i = 0; i < 6; i++) {
          const w = Math.max(1, 3 - Math.floor(i / 2));
          b.fill(Math.round(cx - w / 2), 11 - i, w, 1, i < 2 ? main.deep : main.base, A);
        }
        b.set(cx, 6, main.hi, A);
      }
      break;
    }
    case 'ribbon': {
      b.fill(30, 7, 3, 3, main.base, A);
      b.fill(35, 7, 3, 3, main.base, A);
      b.fill(33, 7, 2, 3, main.sh, A);
      break;
    }
  }
}

// ── front layer ─────────────────────────────────────────────────────────────

export function drawOutfitFront(r: Rig) {
  const { b } = r;
  const def = o(r);

  if (def.back?.piece === 'harness' || def.id === 'scout') {
    // leather straps crossing the chest and waist
    const strap = rp(0xd8c8a0);
    for (let i = 0; i < 8; i++) {
      b.set(19 + i, 35 + i, strap.base, A);
      b.set(28 - i, 35 + i, strap.base, A);
    }
    b.fill(18, 42, 12, 1, strap.sh, A);
  }

  if (def.back?.piece === 'pack') {
    const s = rp(def.back.trim ?? def.back.color);
    b.fill(19, 35, 1, 7, s.base, A);
    b.fill(28, 35, 1, 7, s.base, A);
  }

  if (def.hip && def.hip.piece !== 'none') {
    const sheath = rp(def.id === 'knight' || def.id === 'scout' ? 0x5a4a3a : def.hip.color);
    const guard = rp(0xd8b84a);
    const swordAt = (hx: number, hy: number, tx: number, ty: number) => {
      b.line(hx, hy, tx, ty, sheath.base, 2, P);
      b.fill(hx - 1, hy - 3, 3, 3, rp(0x3a2a22).base, P);
      b.fill(hx - 2, hy - 1, 5, 1, guard.base, P);
    };
    swordAt(31, 44, 14, 52);
    if (def.hip.piece === 'swords') swordAt(17, 44, 33, 52);
  }
}
