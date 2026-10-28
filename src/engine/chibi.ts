import { Bitmap, TAG, castShadow, mix, outline, ramp, shade, type Color, type Ramp } from './pixelkit';
import {
  CW,
  CH,
  HEAD,
  inHead,
  torsoBox,
  type AnyHairStyle,
  type ChibiSpec,
  type Expression,
  type HeldProp,
  type Pose,
  type Rig,
} from './chibi-rig';
import type { OutfitDef } from '../data/outfits';
import { drawOutfitBack, drawOutfitBody, drawOutfitFront, drawOutfitHead } from './chibi-outfit';

export { CW, CH };
export type { ChibiSpec, Expression, HeldProp, Pose };

/**
 * Chibi sprite renderer.
 *
 * One code path draws every character in the game — waifus, the MC, room
 * guests, portraits and the overworld sheet's big sibling — so they all share
 * the reference art's proportions: oversized head, huge glossy eyes, small
 * body. Colours come from `CharacterSpec`; the shading and outline are applied
 * here so a new character needs only data.
 */

export interface ChibiOpts {
  spec: ChibiSpec;
  expression?: Expression;
  pose?: Pose;
  prop?: HeldProp;
  /** Draw the held weapon (rooms yes, portraits no). */
  weapon?: boolean;
  /** The MC's costume. Waifus leave this null and draw from their spec. */
  outfit?: OutfitDef | null;
}

// ── colour helpers ──────────────────────────────────────────────────────────

function skinRamp(c: Color): Ramp {
  const r = ramp(c);
  // Warm, rosy shadows keep skin from going grey under the cool hue shift.
  const sh = mix(r.sh, 0xd8808c, 0.16);
  return { hi: mix(r.hi, 0xfff4e8, 0.2), base: c, sh, deep: mix(sh, 0x7a3a5a, 0.25) };
}

/** Dark hair gets a blue sheen so the highlight band survives. */
function hairRamp(c: Color): Ramp {
  const r = ramp(c);
  const l = 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
  if (l < 70) {
    return {
      hi: mix(c, 0x8a98d8, 0.5),
      base: c,
      sh: mix(c, 0x0a0a18, 0.35),
      deep: mix(c, 0x05050e, 0.55),
    };
  }
  return r;
}

// ── hair geometry ───────────────────────────────────────────────────────────

/** Downward-pointing locks across the forehead; `lean` skews each lock sideways. */
function lock(x: number, lens: number[], lean: number): number {
  const u0 = (x - 8) / 5.2;
  const idx = Math.max(0, Math.min(lens.length - 1, Math.floor(u0)));
  const u = u0 - idx;
  const t = Math.abs((u - 0.5 - lean * 0.25) * 2);
  return Math.max(0, Math.round(lens[idx] * (1 - Math.min(1, t))));
}

/** Lowest hair row at column x for the fringe of each style. */
function fringeBottom(style: AnyHairStyle, x: number): number {
  const d = x + 0.5 - 24;
  const ad = Math.abs(d);
  switch (style) {
    case 'spiky':
      return 16 + lock(x, [3, 5, 4, 6, 3, 5, 3], 0.55);
    case 'messy':
      return 17 + lock(x, [2, 4, 3, 5, 2, 4, 3], 0.4) + (d < -5 ? 1 : 0);
    case 'mohawk':
      return ad < 5 ? 13 : 15;
    case 'short': {
      // side-swept: long on the left, tucked on the right
      const left = d < 0 ? Math.min(3, Math.floor(ad / 4)) : 0;
      return 18 + left + ((x * 5) % 7 < 2 ? 1 : 0) - (d > 6 ? 1 : 0);
    }
    case 'hime':
      return ad < 1.4 ? 18 : 20 + ((x * 3) % 8 < 1 ? 1 : 0);
    case 'braid':
    case 'ponytail':
      return ad < 1.6 ? 17 : 19 + ((x * 5) % 9 < 2 ? 1 : 0) + (ad > 9 ? 1 : 0);
    default:
      // long / twin / bob: blunt bangs with a small centre part
      return ad < 1.4 ? 18 : 20 + ((x * 5) % 9 < 2 ? 1 : 0) + (ad > 10 ? 1 : 0);
  }
}

/** How far the side locks hang beside the face. */
function lockBottom(style: AnyHairStyle): number {
  switch (style) {
    case 'long':
      return 38;
    case 'hime':
      return 40;
    case 'twin':
    case 'bob':
      return 31;
    case 'ponytail':
    case 'braid':
      return 27;
    case 'short':
      return 26;
    case 'spiky':
    case 'messy':
      return 25;
    default:
      return 22;
  }
}

type Blob = [number, number, number, number];

function blobs(b: Bitmap, list: Blob[], rp: Ramp, tag: number = TAG.hair, strength = 1) {
  let x0 = 99;
  let y0 = 99;
  let x1 = -1;
  let y1 = -1;
  for (const [cx, cy, rx, ry] of list) {
    x0 = Math.min(x0, cx - rx);
    y0 = Math.min(y0, cy - ry);
    x1 = Math.max(x1, cx + rx);
    y1 = Math.max(y1, cy + ry);
  }
  b.shape(
    x0,
    y0,
    x1,
    y1,
    (x, y) => list.some(([cx, cy, rx, ry]) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1),
    rp,
    { tag, shading: strength, light: [-0.2, -1] },
  );
}

function hairBack(r: Rig) {
  const { b, hair: hr } = r;
  const s = r.spec.hairStyle;
  const T = TAG.hair;
  const back = { ...hr, base: hr.sh, hi: hr.base, sh: hr.deep };

  // A rounded mass behind the head for every style that has volume. It swells
  // a little past the cheeks and rounds off at the tips instead of ending in a box.
  const mass = (grow: number, bottom: number, wid = 0) => {
    const half = (y: number) => {
      let h = y <= 34 ? 15 + (y - 20) * 0.13 : 16.8 - (y - 34) * 0.14;
      const edge = bottom - y;
      if (edge < 3) h -= (3 - edge) * 1.1;
      return h + grow * 0.5 + wid;
    };
    b.shape(
      4,
      6,
      44,
      bottom,
      (x, y) => {
        if (inHead(x, y, grow)) return true;
        if (y > 20 && y <= bottom) return Math.abs(x + 0.5 - 24) <= half(y);
        return false;
      },
      back,
      { tag: T, shading: 0.5, light: [-0.2, -1] },
    );
    // strand lines give long hair some structure
    if (bottom > 30) {
      for (const x of [11, 15, 32, 36]) {
        for (let y = 26; y < bottom - 2; y++) {
          if (b.tagAt(x, y) === T && y % 7 !== 0) b.set(x, y, hr.deep, T);
        }
      }
    }
  };

  switch (s) {
    case 'long':
      mass(1.4, 47, 1.5);
      break;
    case 'hime':
      mass(1.4, 48, 0.5);
      break;
    case 'bob':
      mass(1.6, 37, 0.5);
      break;
    case 'twin':
      mass(1.2, 28);
      blobs(b, [[8.5, 20, 4, 5], [6.5, 26, 4, 5.5], [6.5, 33, 4, 5.5], [8, 40, 3.6, 5], [9.5, 45, 3, 3]], back);
      blobs(b, [[39.5, 20, 4, 5], [41.5, 26, 4, 5.5], [41.5, 33, 4, 5.5], [40, 40, 3.6, 5], [38.5, 45, 3, 3]], back);
      break;
    case 'ponytail':
      mass(1.2, 27);
      blobs(b, [[39, 15, 3.4, 3.4], [42, 21, 3.4, 4.5], [43, 29, 3.2, 5], [41.5, 36, 3, 4.5]], back);
      break;
    case 'braid':
      mass(1.6, 36, 0.5);
      break;
    case 'short':
    case 'messy':
      mass(1.2, 29);
      break;
    case 'spiky':
      mass(1.2, 27);
      break;
    case 'mohawk':
      break;
  }
}

function hairFront(r: Rig) {
  const { b, hair: hr } = r;
  const s = r.spec.hairStyle;
  const T = TAG.hair;
  const grow = s === 'mohawk' ? 0 : 1.2;

  // Spikes and tufts break the silhouette above the skull.
  const tufts = (list: [number, number, number, number][]) => {
    for (const [sx, h, w, lean] of list) {
      b.shape(sx - w / 2 - 2, 8 - h, sx + w / 2 + 2, 11, (x, y) => {
        const t = (y - (8 - h)) / (h + 3);
        return Math.abs(x + 0.5 - (sx + lean * (1 - t) * 2.2)) <= (w / 2) * t + 0.2;
      }, hr, { tag: T, shading: 0.8, light: [-0.3, -1] });
    }
  };
  if (s === 'spiky') {
    tufts([[10, 4, 7, -1], [16, 6, 8, -1], [24, 7, 9, 0], [32, 6, 8, 1], [38, 4, 7, 1]]);
  } else if (s === 'messy') {
    tufts([[11, 3, 8, -1], [18, 5, 8, -1], [25, 6, 9, 1], [32, 5, 8, 1], [38, 3, 7, 1]]);
    // one stubborn strand
    b.line(24, 3, 26, 1, hr.base, 1, T);
    b.set(26, 2, hr.hi, T);
  } else if (s === 'mohawk') {
    b.shape(19, 1, 29, 14, (x, y) => {
      const t = (y - 1) / 13;
      return Math.abs(x + 0.5 - 24) <= 2.4 + t * 2.2;
    }, hr, { tag: T });
  }

  // Cap + fringe.
  b.shape(
    6,
    5,
    42,
    30,
    (x, y) => {
      if (!inHead(x, y, grow)) return false;
      if (s === 'mohawk') return y <= 15 && Math.abs(x + 0.5 - 24) <= 7;
      return y <= fringeBottom(s, x);
    },
    hr,
    { tag: T, shading: 0.75, light: [-0.25, -1] },
  );

  // Side locks hang past the cheeks for long styles.
  const lb = lockBottom(s);
  if (s !== 'mohawk') {
    const w = s === 'hime' ? 4 : s === 'long' ? 3.4 : 3;
    for (const side of [-1, 1]) {
      const edge = 24 + side * (HEAD.rx - 1.2);
      b.shape(edge - 5, 17, edge + 5, lb, (x, y) => {
        if (y > lb || y < 17) return false;
        const dx = side * (x + 0.5 - 24);
        if (dx < HEAD.rx - 1.2 - w || dx > HEAD.rx + 0.8) return false;
        if (y < 24) return inHead(x, y, grow);
        return true;
      }, hr, { tag: T, shading: 0.5, light: [-0.2, -1] });
    }
  }

  // The "angel ring" highlight across the crown.
  if (s !== 'mohawk') {
    for (let x = 12; x <= 35; x++) {
      const t = (x - 24 + 0.5) / 12;
      const y = Math.round(11.5 + t * t * 2.6);
      if (b.tagAt(x, y) === T) b.set(x, y, hr.hi, T);
      if (b.tagAt(x, y + 1) === T && x % 3 !== 0 && Math.abs(t) < 0.7) b.set(x, y + 1, mix(hr.hi, hr.base, 0.5), T);
    }
  }

  // Dark line where the fringe meets the face, like the reference.
  for (let x = 6; x <= 42; x++) {
    for (let y = 8; y <= 30; y++) {
      if (b.tagAt(x, y) === T && b.tagAt(x, y + 1) === TAG.skin) b.set(x, y, hr.deep, T);
    }
  }

  // Braid over the shoulder is in front of the body.
  if (s === 'braid') {
    const seg: Blob[] = [];
    for (let i = 0; i < 7; i++) seg.push([35.5 + (i % 2 ? 0.6 : -0.2), 33 + i * 2.5, 2.9, 1.9]);
    blobs(b, seg, hr);
    b.rect(34, 48, 4, 2, ramp(r.accent.base), { tag: TAG.accessory });
  }
}

// ── face ────────────────────────────────────────────────────────────────────

function drawEye(b: Bitmap, x0: number, outer: -1 | 1, iris: Color, expr: Expression, lash: Color, lid: Color) {
  const y0 = 22;
  const ir = ramp(iris);
  const outerX = outer < 0 ? x0 : x0 + 6;
  const T = TAG.eye;

  if (expr === 'blink') {
    for (let c = 0; c < 7; c++) b.set(x0 + c, y0 + 5, lash, T);
    b.set(outerX, y0 + 4, lash, T);
    b.set(outerX + outer, y0 + 4, lash, T);
    for (let c = 1; c < 6; c++) b.set(x0 + c, y0 + 6, lid, T);
    return;
  }
  if (expr === 'smile') {
    // ^ ^ eyes
    b.set(x0 + 2, y0 + 3, lash, T);
    b.set(x0 + 3, y0 + 3, lash, T);
    b.set(x0 + 4, y0 + 3, lash, T);
    b.set(x0 + 1, y0 + 4, lash, T);
    b.set(x0 + 5, y0 + 4, lash, T);
    b.set(x0, y0 + 5, lash, T);
    b.set(x0 + 6, y0 + 5, lash, T);
    return;
  }

  // lash line, with an outward flick
  for (let c = 0; c < 7; c++) b.set(x0 + c, y0, lash, T);
  b.set(outerX, y0 - 1, lash, T);
  b.set(outerX + outer, y0, lash, T);
  // iris body: dark at the top, glowing toward the bottom
  for (let row = 1; row <= 6; row++) {
    for (let c = 0; c < 7; c++) {
      if ((row === 1 || row === 6) && (c === 0 || c === 6)) continue;
      let col = ir.base;
      if (row === 1) col = ir.deep;
      else if (row === 2) col = ir.sh;
      else if (row === 5) col = ir.hi;
      else if (row === 6) col = mix(ir.hi, 0xffffff, 0.2);
      if (c === 0 || c === 6) col = row >= 5 ? ir.base : ir.deep;
      b.set(x0 + c, y0 + row, col, T);
    }
  }
  // pupil
  for (let row = 3; row <= 5; row++) for (let c = 2; c <= 4; c++) b.set(x0 + c, y0 + row, ir.deep, T);
  // highlights: one big, one small
  b.set(x0 + 1, y0 + 2, 0xffffff, T);
  b.set(x0 + 2, y0 + 2, 0xffffff, T);
  b.set(x0 + 1, y0 + 3, 0xffffff, T);
  b.set(x0 + 2, y0 + 3, 0xf4f0ff, T);
  b.set(x0 + 5, y0 + 5, mix(ir.hi, 0xffffff, 0.75), T);
  // lower lid
  for (let c = 1; c <= 5; c++) b.set(x0 + c, y0 + 7, lid, T);
  if (expr === 'open') b.set(x0 + 4, y0 + 2, 0xffffff, T);
}

function drawFace(r: Rig, expr: Expression) {
  const { b, spec } = r;
  const lash = mix(r.hair.deep, 0x1a0f24, 0.55);
  const lid = mix(r.skin.sh, 0x6a2a4a, 0.35);

  // blush
  const bl = mix(r.skin.base, 0xff7a96, 0.5);
  for (const x of [13, 14, 15, 32, 33, 34]) b.set(x, 31, bl, TAG.skin);
  if (expr === 'smile' || expr === 'open') for (const x of [14, 33]) b.set(x, 32, bl, TAG.skin);

  drawEye(b, 13, -1, spec.eye, expr, lash, lid);
  drawEye(b, 28, 1, spec.eye, expr, lash, lid);

  const mouth = mix(0x8a2a3a, r.skin.sh, 0.2);
  switch (expr) {
    case 'smile':
      b.set(22, 32, mouth, TAG.eye);
      b.set(23, 33, mouth, TAG.eye);
      b.set(24, 33, mouth, TAG.eye);
      b.set(25, 32, mouth, TAG.eye);
      break;
    case 'open':
      b.fill(23, 32, 2, 2, mouth, TAG.eye);
      b.set(23, 33, 0xe8708a, TAG.eye);
      b.set(24, 33, 0xe8708a, TAG.eye);
      break;
    case 'sad':
      b.set(23, 33, mouth, TAG.eye);
      b.set(24, 33, mouth, TAG.eye);
      b.set(22, 34, mouth, TAG.eye);
      b.set(25, 34, mouth, TAG.eye);
      break;
    default:
      b.set(23, 33, mouth, TAG.eye);
      b.set(24, 33, mouth, TAG.eye);
  }
}

// ── body (waifus) ───────────────────────────────────────────────────────────

function drawLegsDefault(r: Rig) {
  const { b, male, pose } = r;
  const sock = ramp(0xeceaf6);
  const shoe = ramp(mix(r.bottom.base, 0x2a2030, 0.6));
  const dy = pose === 'sit' ? -2 : 0;
  if (male) {
    b.rect(19, 44, 5, 8 + dy, r.bottom, { tag: TAG.cloth });
    b.rect(24, 44, 5, 8 + dy, r.bottom, { tag: TAG.cloth });
    b.set(24, 46, r.bottom.deep, TAG.cloth);
    b.set(24, 47, r.bottom.deep, TAG.cloth);
    b.rrect(18, 52 + dy, 6, 3, shoe, { tag: TAG.cloth });
    b.rrect(24, 52 + dy, 6, 3, shoe, { tag: TAG.cloth });
    return;
  }
  b.rect(20, 47, 3, 3 + dy, r.skin, { tag: TAG.skin });
  b.rect(25, 47, 3, 3 + dy, r.skin, { tag: TAG.skin });
  b.rect(20, 49 + dy, 3, 3, sock, { tag: TAG.cloth });
  b.rect(25, 49 + dy, 3, 3, sock, { tag: TAG.cloth });
  b.rrect(19, 52 + dy, 5, 3, shoe, { tag: TAG.cloth });
  b.rrect(24, 52 + dy, 5, 3, shoe, { tag: TAG.cloth });
}

function drawTorsoDefault(r: Rig) {
  const { b, male } = r;
  const tb = torsoBox(male);
  b.rrect(tb.x, tb.y, tb.w, tb.h, r.top, { tag: TAG.cloth });
  if (male) {
    // collar and a belt line keep the plain tee from reading as a block
    b.fill(22, 34, 4, 2, r.skin.sh, TAG.skin);
    b.fill(tb.x, 42, tb.w, 1, r.bottom.sh, TAG.cloth);
    return;
  }
  // skirt, widening toward the hem
  b.shape(15, 43, 32, 48, (x, y) => {
    const spread = Math.floor((y - 43) * 0.5);
    return y >= 43 && y <= 48 && x >= 18 - spread && x <= 29 + spread;
  }, r.bottom, { tag: TAG.cloth });
  for (const x of [21, 24, 27]) for (let y = 45; y <= 48; y++) b.set(x, y, r.bottom.sh, TAG.cloth);
  for (let x = 15; x <= 32; x++) if (b.tagAt(x, 48) === TAG.cloth) b.set(x, 48, r.accent.base, TAG.cloth);
  // bow at the collar
  const a = r.accent;
  b.fill(20, 36, 3, 2, a.base, TAG.accessory);
  b.fill(25, 36, 3, 2, a.base, TAG.accessory);
  b.set(20, 36, a.hi, TAG.accessory);
  b.set(25, 36, a.hi, TAG.accessory);
  b.fill(23, 36, 2, 2, a.sh, TAG.accessory);
  b.set(22, 38, a.sh, TAG.accessory);
  b.set(25, 38, a.sh, TAG.accessory);
}

function drawArmsDefault(r: Rig, weaponHand: boolean) {
  const { b, male } = r;
  const sleeve = r.top;
  if (r.arms === 'hold') {
    for (const side of [-1, 1]) {
      const ux = side < 0 ? (male ? 15 : 16) : male ? 30 : 29;
      b.rrect(ux, 35, 3, 5, sleeve, { tag: TAG.cloth });
      const fx = side < 0 ? 18 : 25;
      b.rrect(fx, 38, 5, 3, sleeve, { tag: TAG.cloth });
      const hx = side < 0 ? 22 : 24;
      b.rect(hx, 38, 2, 3, r.skin, { tag: TAG.skin });
    }
    return;
  }
  const lx = male ? 15 : 16;
  const rx = male ? 30 : 29;
  b.rrect(lx, 35, 3, 8, sleeve, { tag: TAG.cloth });
  b.rrect(rx, 35, 3, 8, sleeve, { tag: TAG.cloth });
  b.rect(lx, 43, 3, 2, r.skin, { tag: TAG.skin });
  b.rect(rx, 43, 3, 2, r.skin, { tag: TAG.skin });
  void weaponHand;
}

// ── accessories & weapons ──────────────────────────────────────────────────

function drawAccessory(r: Rig) {
  const { b, spec } = r;
  const acc = ramp(spec.accessoryColor);
  const T = TAG.accessory;
  switch (spec.accessory) {
    case 'scarf':
      b.rrect(17, 35, 14, 3, acc, { tag: T });
      b.rrect(27, 37, 3, 10, acc, { tag: T });
      for (let y = 40; y < 48; y += 3) b.set(28, y, acc.sh, T);
      break;
    case 'ribbon': {
      const bx = spec.hairStyle === 'twin' ? 0 : 1;
      const draw = (x: number, y: number) => {
        b.fill(x, y, 3, 3, acc.base, T);
        b.fill(x + 5, y, 3, 3, acc.base, T);
        b.set(x, y, acc.hi, T);
        b.set(x + 5, y, acc.hi, T);
        b.fill(x + 3, y, 2, 3, acc.sh, T);
        b.set(x + 1, y + 3, acc.sh, T);
        b.set(x + 6, y + 3, acc.sh, T);
      };
      if (spec.hairStyle === 'twin') {
        draw(3, 14);
        draw(37, 14);
      } else {
        draw(30 + bx, 7);
      }
      break;
    }
    case 'hornband': {
      b.fill(8, 12, 32, 2, ramp(0xe8e8f0).base, T);
      for (let x = 8; x < 40; x++) b.set(x, 13, 0xb8b8c8, T);
      for (const side of [-1, 1]) {
        const cx = 24 + side * 7;
        for (let i = 0; i < 6; i++) {
          const w = Math.max(1, 3 - Math.floor(i / 2));
          b.fill(Math.round(cx - w / 2 + side * (i > 3 ? 0.5 : 0)), 11 - i, w, 1, i < 2 ? acc.deep : acc.base, T);
        }
        b.set(cx, 6, acc.hi, T);
      }
      break;
    }
    case 'headband': {
      const band = ramp(spec.accessoryColor);
      for (let x = 7; x <= 40; x++) {
        for (let y = 12; y <= 15; y++) {
          if (inHead(x, y, 1.3)) b.set(x, y, y === 15 ? band.sh : band.base, T);
        }
      }
      b.fill(18, 11, 12, 6, ramp(0xc8d0e0).base, T);
      b.fill(18, 11, 12, 1, 0xf0f4ff, T);
      b.fill(18, 16, 12, 1, 0x7a84a0, T);
      b.fill(21, 13, 6, 1, 0x4a5470, T);
      b.set(22, 12, 0x4a5470, T);
      b.set(25, 14, 0x4a5470, T);
      break;
    }
    case 'oniHorn': {
      const horn = ramp(spec.accessoryColor);
      for (let i = 0; i < 6; i++) {
        const w = Math.max(1, 3 - Math.floor(i / 2));
        b.fill(17 - Math.floor(i / 3), 11 - i, w, 1, i < 2 ? horn.base : horn.hi, T);
      }
      break;
    }
    case 'bamboo': {
      const bam = ramp(0xd8c48a);
      b.rrect(19, 30, 10, 4, bam, { tag: T });
      for (const x of [22, 26]) b.fill(x, 30, 1, 4, 0x8a7a40, T);
      b.fill(12, 31, 7, 1, ramp(0xf08aa8).base, T);
      b.fill(29, 31, 7, 1, ramp(0xf08aa8).base, T);
      break;
    }
    case 'crown': {
      const g = ramp(0xe8c040);
      b.fill(16, 8, 17, 3, g.base, T);
      for (const x of [16, 20, 24, 28, 32]) b.fill(x, 5, 2, 3, g.hi, T);
      b.set(24, 6, 0xe84a6a, T);
      b.set(24, 9, 0x6ac8f0, T);
      b.fill(16, 10, 17, 1, g.sh, T);
      break;
    }
    default:
      break;
  }
}

function drawWeapon(r: Rig) {
  const { b, spec } = r;
  const steel = ramp(0xc8d0dc);
  const wood = ramp(0x7a5a3a);
  const T = TAG.prop;
  switch (spec.weapon) {
    case 'blade':
      b.line(34, 42, 42, 28, steel.base, 2, T);
      b.line(35, 41, 42, 29, steel.hi, 1, T);
      b.fill(32, 42, 5, 2, 0xc0a03a, T);
      b.fill(33, 44, 3, 3, wood.base, T);
      break;
    case 'spear':
      b.line(38, 12, 38, 54, wood.base, 2, T);
      b.shape(36, 4, 41, 14, (x, y) => Math.abs(x + 0.5 - 39) <= ((y - 4) / 10) * 2.6 + 0.4 && y <= 13, steel, { tag: T });
      b.fill(37, 14, 3, 1, 0xa8202a, T);
      break;
    case 'scythe':
      b.line(38, 14, 38, 54, wood.base, 2, T);
      b.shape(28, 8, 41, 18, (x, y) => {
        const dx = x + 0.5 - 38;
        const dy = y + 0.5 - 18;
        const d = Math.hypot(dx, dy);
        return d >= 8 && d <= 10.5 && dy <= 0 && dx <= 2;
      }, steel, { tag: T });
      break;
    case 'fan':
      b.shape(33, 36, 42, 46, (x, y) => y >= 38 && y <= 45 && Math.abs(x - 38) <= (y - 36) * 0.7, ramp(0xf4f0e8), { tag: T });
      for (let i = -2; i <= 2; i++) b.set(38 + i, 45, 0xc0392b, T);
      b.fill(37, 36, 2, 3, wood.base, T);
      break;
    case 'flail': {
      b.line(33, 44, 41, 48, 0x8a8f99, 1, T);
      b.ellipse(42, 50, 3.2, 3.2, ramp(0x6a6f7a), { tag: T });
      for (const [dx, dy] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) b.set(42 + dx, 50 + dy, 0xc8d0dc, T);
      break;
    }
    default:
      break;
  }
}

function drawProp(r: Rig, prop: HeldProp) {
  const { b } = r;
  const T = TAG.prop;
  if (prop === 'mug') {
    const m = ramp(0xf0eef6);
    b.rrect(21, 37, 5, 5, m, { tag: T });
    b.fill(26, 38, 1, 3, m.sh, T);
    b.fill(22, 38, 3, 1, 0x7a5a3a, T);
    b.set(23, 39, r.accent.base, T);
    // steam
    b.set(22, 34, 0xdce6ff, T);
    b.set(24, 33, 0xdce6ff, T);
  } else if (prop === 'book') {
    const cover = ramp(0x2a3560);
    b.rrect(19, 37, 10, 6, cover, { tag: T });
    b.fill(20, 38, 8, 4, 0xe8dfc8, T);
    b.fill(24, 38, 1, 4, 0xa89a78, T);
    b.fill(21, 39, 2, 1, 0x8a7a58, T);
    b.fill(26, 39, 2, 1, 0x8a7a58, T);
  } else if (prop === 'handheld') {
    b.rrect(19, 37, 10, 5, ramp(0x2a2f4a), { tag: T });
    b.fill(22, 38, 5, 3, 0x5ac8f0, T);
    b.set(23, 38, 0xcdf4ff, T);
    b.fill(19, 38, 2, 3, 0x3a8ae0, T);
    b.fill(27, 38, 2, 3, 0xe84a5a, T);
  }
}

// ── public API ──────────────────────────────────────────────────────────────

const cache = new Map<string, Bitmap>();

function keyOf(o: ChibiOpts): string {
  const s = o.spec;
  return [
    s.skin, s.hair, s.hairStyle, s.eye, s.top, s.bottom, s.accent, s.accessory, s.accessoryColor,
    s.weapon, s.male ? 1 : 0, s.headgear ?? '', s.back ?? '',
    o.expression ?? 'neutral', o.pose ?? 'stand', o.prop ?? 'none', o.weapon ? 1 : 0, o.outfit?.id ?? '',
  ].join('|');
}

/** Render a chibi onto a fresh bitmap (uncached). */
export function renderChibi(o: ChibiOpts): Bitmap {
  const b = new Bitmap(CW, CH);
  const spec = o.spec;
  const prop = o.prop ?? 'none';
  const rig: Rig = {
    b,
    spec,
    male: !!spec.male,
    pose: o.pose ?? 'stand',
    arms: prop === 'none' ? 'down' : 'hold',
    outfit: o.outfit ?? null,
    skin: skinRamp(spec.skin),
    hair: hairRamp(spec.hair),
    top: ramp(spec.top),
    bottom: ramp(spec.bottom),
    accent: ramp(spec.accent),
  };

  hairBack(rig);
  if (rig.outfit) drawOutfitBack(rig);

  // weapon sits behind the near hand
  if (o.weapon && spec.weapon !== 'none') drawWeapon(rig);

  if (rig.outfit) {
    drawOutfitBody(rig);
  } else {
    drawLegsDefault(rig);
    drawTorsoDefault(rig);
    drawArmsDefault(rig, !!o.weapon);
  }
  if (!rig.outfit && spec.accessory === 'scarf') drawAccessory(rig);

  // head
  b.ellipse(HEAD.cx, HEAD.cy, HEAD.rx, HEAD.ry, { ...rig.skin, deep: rig.skin.sh }, { p: HEAD.p, tag: TAG.skin, shading: 0.8 });
  // small ear hint under the hair for short styles
  hairFront(rig);
  castShadow(b, TAG.skin, TAG.hair, mix(rig.skin.sh, 0x8a4a6a, 0.2));
  drawFace(rig, o.expression ?? 'neutral');

  if (rig.outfit) {
    drawOutfitHead(rig);
    drawOutfitFront(rig);
  } else if (spec.accessory !== 'scarf') {
    drawAccessory(rig);
  }
  drawProp(rig, prop);

  return outline(b, 0.36);
}

/** Cached bitmap for a spec/pose/expression combination. */
export function chibiBitmap(o: ChibiOpts): Bitmap {
  const k = keyOf(o);
  let hit = cache.get(k);
  if (!hit) {
    hit = renderChibi(o);
    cache.set(k, hit);
    if (cache.size > 600) cache.delete(cache.keys().next().value as string);
  }
  return hit;
}

/** A standalone canvas at an integer pixel scale. */
export function chibiCanvas(o: ChibiOpts, scale = 3): HTMLCanvasElement {
  const bmp = chibiBitmap(o);
  const c = document.createElement('canvas');
  c.width = bmp.w * scale;
  c.height = bmp.h * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bmp.canvas(), 0, 0, c.width, c.height);
  return c;
}

export { shade };
