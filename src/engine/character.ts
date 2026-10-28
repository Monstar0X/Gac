import * as THREE from 'three';
import type { Accessory, CharacterSpec, HairStyle, WeaponKind } from '../data/types';

/** Shared geometry so hundreds of boxes do not blow up memory. */
const UNIT = new THREE.BoxGeometry(1, 1, 1);

/** Lighten (`amt` > 0) or darken (`amt` < 0) a packed hex colour. */
export function shade(color: number, amt: number): number {
  const r = Math.max(0, Math.min(255, ((color >> 16) & 0xff) + amt));
  const g = Math.max(0, Math.min(255, ((color >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (color & 0xff) + amt));
  return (r << 16) | (g << 8) | b;
}

function mat(color: number, opts: { emissive?: number; rough?: number; metal?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.85,
    metalness: opts.metal ?? 0.0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissive ? 0.35 : 0,
    flatShading: true,
  });
}

/**
 * Add a box to `parent` with size + centre position, in character units.
 * `tag` marks a mesh as belonging to an outfit layer so cosmetics can recolour
 * it later (see `applyOutfit`). `base`, when given, is the canonical layer
 * colour; the difference between it and this mesh's colour is remembered so
 * recolouring keeps each part's light/shadow offset.
 */
function box(
  parent: THREE.Object3D,
  color: number,
  sx: number,
  sy: number,
  sz: number,
  x: number,
  y: number,
  z: number,
  opts?: { emissive?: number; metal?: number; rough?: number; tag?: string; base?: number },
): THREE.Mesh {
  const m = new THREE.Mesh(UNIT, mat(color, opts));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  if (opts?.tag) {
    m.userData.tag = opts.tag;
    m.userData.shadeDelta = opts.base !== undefined ? color - opts.base : 0;
  }
  parent.add(m);
  return m;
}

export interface CharacterRig {
  root: THREE.Group;
  /** Head pivot, for look-at / bob. */
  head: THREE.Group;
  /** Arms, animated while walking. */
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  /** Body group (torso + head + arms), for breathing. */
  body: THREE.Group;
  height: number;
}

function hairPiece(g: THREE.Group, spec: CharacterSpec, s: number) {
  const h = spec.hair;
  const hi = shade(h, 26);
  const lo = shade(h, -32);
  const styles: Record<HairStyle, () => void> = {
    long: () => {
      box(g, h, 0.62, 0.5, 0.6, 0, 0.18, 0);
      // Crown highlight and a back volume block.
      box(g, hi, 0.5, 0.1, 0.5, 0, 0.42, 0.02);
      box(g, h, 0.66, 0.62, 0.18, 0, -0.24, -0.24);
      box(g, h, 0.14, 0.5, 0.5, -0.3, -0.2, 0);
      box(g, h, 0.14, 0.5, 0.5, 0.3, -0.2, 0);
      // Fringe strands + shaded ends.
      box(g, hi, 0.16, 0.2, 0.06, -0.14, 0.34, 0.3);
      box(g, lo, 0.14, 0.12, 0.5, -0.3, -0.42, 0);
      box(g, lo, 0.14, 0.12, 0.5, 0.3, -0.42, 0);
      box(g, lo, 0.66, 0.12, 0.18, 0, -0.53, -0.24);
    },
    twin: () => {
      box(g, h, 0.62, 0.5, 0.6, 0, 0.18, 0);
      box(g, hi, 0.5, 0.1, 0.5, 0, 0.42, 0.02);
      box(g, h, 0.16, 0.62, 0.16, -0.36, -0.06, -0.02);
      box(g, h, 0.16, 0.62, 0.16, 0.36, -0.06, -0.02);
      // Ribbon ties.
      box(g, spec.accent, 0.2, 0.08, 0.2, -0.36, 0.24, -0.02);
      box(g, spec.accent, 0.2, 0.08, 0.2, 0.36, 0.24, -0.02);
      // Shaded tail ends.
      box(g, lo, 0.16, 0.12, 0.16, -0.36, -0.42, -0.02);
      box(g, lo, 0.16, 0.12, 0.16, 0.36, -0.42, -0.02);
      box(g, hi, 0.16, 0.18, 0.06, -0.13, 0.34, 0.3);
    },
    short: () => {
      box(g, h, 0.66, 0.52, 0.64, 0, 0.18, 0);
      box(g, h, 0.68, 0.24, 0.68, 0, 0.0, 0);
      box(g, h, 0.5, 0.2, 0.12, 0, 0.3, 0.3);
      box(g, hi, 0.54, 0.1, 0.52, 0, 0.42, 0.02);
      box(g, lo, 0.68, 0.08, 0.68, 0, -0.13, 0);
      box(g, hi, 0.18, 0.14, 0.06, -0.12, 0.36, 0.32);
    },
    bob: () => {
      box(g, h, 0.66, 0.52, 0.64, 0, 0.2, 0);
      box(g, h, 0.7, 0.46, 0.7, 0, -0.06, 0);
      box(g, h, 0.7, 0.2, 0.16, 0, -0.22, -0.3);
      box(g, hi, 0.56, 0.1, 0.54, 0, 0.44, 0.02);
      // Curved bob ends catch light on the outside.
      box(g, lo, 0.12, 0.16, 0.66, -0.32, -0.28, 0);
      box(g, lo, 0.12, 0.16, 0.66, 0.32, -0.28, 0);
      box(g, hi, 0.18, 0.16, 0.06, -0.12, 0.36, 0.32);
    },
    ponytail: () => {
      box(g, h, 0.62, 0.5, 0.6, 0, 0.18, 0);
      box(g, h, 0.18, 0.66, 0.18, 0, -0.12, -0.34);
      box(g, spec.accent, 0.22, 0.08, 0.22, 0, 0.18, -0.34);
      box(g, hi, 0.5, 0.1, 0.5, 0, 0.42, 0.02);
      box(g, lo, 0.18, 0.14, 0.18, 0, -0.48, -0.34);
      box(g, hi, 0.16, 0.2, 0.06, -0.13, 0.34, 0.3);
    },
    hime: () => {
      box(g, h, 0.68, 0.54, 0.66, 0, 0.2, 0);
      box(g, h, 0.16, 0.66, 0.4, -0.32, -0.08, 0.08);
      box(g, h, 0.16, 0.66, 0.4, 0.32, -0.08, 0.08);
      box(g, h, 0.7, 0.3, 0.16, 0, -0.02, -0.32);
      box(g, hi, 0.56, 0.1, 0.54, 0, 0.45, 0.02);
      // Blunt side-lock ends are the signature of the cut.
      box(g, lo, 0.16, 0.1, 0.4, -0.32, -0.44, 0.08);
      box(g, lo, 0.16, 0.1, 0.4, 0.32, -0.44, 0.08);
      box(g, hi, 0.18, 0.18, 0.06, -0.12, 0.36, 0.33);
    },
    braid: () => {
      box(g, h, 0.64, 0.5, 0.62, 0, 0.18, 0);
      box(g, h, 0.62, 0.16, 0.16, 0, 0.06, 0.3);
      box(g, h, 0.16, 0.5, 0.16, -0.34, -0.16, -0.06);
      box(g, h, 0.16, 0.5, 0.16, 0.34, -0.16, -0.06);
      box(g, spec.accent, 0.18, 0.08, 0.18, -0.34, -0.42, -0.06);
      box(g, spec.accent, 0.18, 0.08, 0.18, 0.34, -0.42, -0.06);
      box(g, hi, 0.52, 0.1, 0.5, 0, 0.42, 0.02);
      // Alternating segments read as a plait.
      box(g, lo, 0.16, 0.1, 0.16, -0.34, -0.24, -0.06);
      box(g, lo, 0.16, 0.1, 0.16, 0.34, -0.24, -0.06);
      box(g, hi, 0.16, 0.2, 0.06, -0.13, 0.34, 0.3);
    },
  };
  g.scale.setScalar(s);
  styles[spec.hairStyle]();
  g.scale.setScalar(1);
}

function accessoryPiece(g: THREE.Group, spec: CharacterSpec) {
  const a: Accessory = spec.accessory;
  const c = spec.accessoryColor;
  switch (a) {
    case 'scarf':
      box(g, c, 0.66, 0.2, 0.62, 0, 0.62, 0);
      box(g, c, 0.2, 0.5, 0.16, 0.16, 0.4, -0.24);
      break;
    case 'ribbon':
      box(g, c, 0.3, 0.12, 0.16, 0, 0.9, -0.06);
      box(g, c, 0.1, 0.16, 0.1, -0.14, 0.96, -0.06);
      box(g, c, 0.1, 0.16, 0.1, 0.14, 0.96, -0.06);
      break;
    case 'hornband':
      box(g, c, 0.12, 0.26, 0.12, -0.26, 0.98, -0.02);
      box(g, c, 0.12, 0.26, 0.12, 0.26, 0.98, -0.02);
      box(g, 0xd8d8e0, 0.68, 0.08, 0.66, 0, 0.86, 0);
      break;
    case 'headband':
      box(g, c, 0.7, 0.14, 0.68, 0, 0.84, 0);
      box(g, c, 0.14, 0.4, 0.1, -0.3, 0.6, -0.26);
      box(g, c, 0.14, 0.4, 0.1, 0.3, 0.6, -0.26);
      break;
    case 'oniHorn':
      box(g, c, 0.14, 0.3, 0.14, -0.24, 1.0, -0.04);
      box(g, c, 0.14, 0.3, 0.14, 0.24, 1.0, -0.04);
      break;
    case 'bamboo':
      box(g, 0xd8c48a, 0.36, 0.16, 0.2, 0, 0.68, 0.3);
      box(g, 0x8a2a2a, 0.38, 0.05, 0.22, 0, 0.68, 0.3);
      break;
    case 'crown':
      box(g, c, 0.44, 0.1, 0.44, 0, 0.98, 0);
      box(g, c, 0.08, 0.16, 0.08, -0.16, 1.08, 0);
      box(g, c, 0.08, 0.16, 0.08, 0, 1.12, 0);
      box(g, c, 0.08, 0.16, 0.08, 0.16, 1.08, 0);
      break;
    default:
      break;
  }
}

function weaponPiece(g: THREE.Group, kind: WeaponKind) {
  switch (kind) {
    case 'blade':
      box(g, 0xd8dce4, 0.09, 1.3, 0.03, 0, 0.6, 0, { metal: 0.6, rough: 0.35 });
      box(g, 0x6a5a3a, 0.14, 0.18, 0.12, 0, -0.08, 0);
      box(g, 0x8a8f99, 0.3, 0.06, 0.08, 0, 0.06, 0);
      break;
    case 'scythe':
      box(g, 0x5a4a3a, 0.08, 1.5, 0.08, 0, 0.6, 0);
      box(g, 0xc0c8d4, 0.5, 0.1, 0.08, 0.22, 1.32, 0, { metal: 0.5 });
      break;
    case 'spear':
      box(g, 0x8a6a4a, 0.07, 1.6, 0.07, 0, 0.6, 0);
      box(g, 0xd8dce4, 0.14, 0.34, 0.14, 0, 1.5, 0, { metal: 0.5 });
      break;
    case 'fan':
      box(g, 0xf0e0d0, 0.5, 0.06, 0.3, 0, 0.3, 0);
      box(g, 0xd83a3a, 0.5, 0.04, 0.06, 0, 0.34, 0.12);
      break;
    case 'flail':
      box(g, 0x6a5a3a, 0.07, 0.8, 0.07, 0, 0.36, 0);
      box(g, 0x6a7080, 0.3, 0.3, 0.3, 0.05, -0.12, 0, { metal: 0.5 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        box(g, 0x6a7080, 0.09, 0.09, 0.09, 0.05 + Math.cos(a) * 0.2, -0.12 + Math.sin(a) * 0.2, 0, {
          metal: 0.5,
        });
      }
      break;
    default:
      break;
  }
}

/**
 * Build a chibi voxel character. Origin is at the feet; the character faces +Z.
 * Total height is roughly 1.9 * spec.build world units.
 *
 * Clothing meshes carry a `tag` ('top' | 'bottom' | 'accent') so outfit
 * cosmetics can recolour them without rebuilding the rig.
 */
export function buildCharacter(spec: CharacterSpec): CharacterRig {
  const s = spec.build;
  const root = new THREE.Group();

  const body = new THREE.Group();
  body.position.y = 0;
  root.add(body);

  // Shaded variants give every surface a lit side and a shadow side.
  const topLo = shade(spec.top, -26);
  const bottomLo = shade(spec.bottom, -24);
  const skinLo = shade(spec.skin, -22);
  const hairLo = shade(spec.hair, -30);
  const accentLo = shade(spec.accent, -24);

  // ── legs ──
  const legL = new THREE.Group();
  const legR = new THREE.Group();
  legL.position.set(-0.16 * s, 0.42 * s, 0);
  legR.position.set(0.16 * s, 0.42 * s, 0);
  box(legL, spec.bottom, 0.24, 0.42, 0.26, 0, -0.21, 0, { tag: 'bottom', base: spec.bottom });
  box(legR, spec.bottom, 0.24, 0.42, 0.26, 0, -0.21, 0, { tag: 'bottom', base: spec.bottom });
  // Shaded inner faces of each leg, so the pair reads as separate limbs.
  box(legL, bottomLo, 0.07, 0.42, 0.24, 0.09, -0.21, 0, { tag: 'bottom', base: spec.bottom });
  box(legR, bottomLo, 0.07, 0.42, 0.24, -0.09, -0.21, 0, { tag: 'bottom', base: spec.bottom });
  box(legL, 0x2a2a34, 0.26, 0.14, 0.3, 0, -0.4, 0.02);
  box(legR, 0x2a2a34, 0.26, 0.14, 0.3, 0, -0.4, 0.02);
  body.add(legL, legR);

  // ── torso ──
  const torso = new THREE.Group();
  torso.position.y = 0.42 * s;
  body.add(torso);

  box(torso, spec.top, 0.62, 0.56, 0.36, 0, 0.32, 0, { tag: 'top', base: spec.top });
  // Side shading on the torso.
  box(torso, topLo, 0.06, 0.56, 0.34, -0.28, 0.32, 0, { tag: 'top', base: spec.top });
  box(torso, topLo, 0.06, 0.56, 0.34, 0.28, 0.32, 0, { tag: 'top', base: spec.top });
  // Waist trim + collar
  box(torso, spec.accent, 0.66, 0.1, 0.4, 0, 0.04, 0, { tag: 'accent', base: spec.accent });
  box(torso, spec.accent, 0.66, 0.08, 0.38, 0, 0.58, 0, { tag: 'accent', base: spec.accent });
  box(torso, accentLo, 0.1, 0.08, 0.4, 0, 0.58, 0, { tag: 'accent', base: spec.accent });
  // Front placket so the torso is not a blank slab.
  box(torso, topLo, 0.08, 0.42, 0.04, 0, 0.32, 0.19, { tag: 'top', base: spec.top });
  // Skirt / lower
  box(torso, spec.bottom, 0.68, 0.22, 0.42, 0, 0.02, 0, { tag: 'bottom', base: spec.bottom });
  box(torso, bottomLo, 0.68, 0.06, 0.44, 0, -0.07, 0, { tag: 'bottom', base: spec.bottom });

  // ── arms ──
  const armL = new THREE.Group();
  const armR = new THREE.Group();
  armL.position.set(-0.4 * s, 0.52 * s, 0);
  armR.position.set(0.4 * s, 0.52 * s, 0);
  box(armL, spec.top, 0.18, 0.44, 0.2, 0, -0.2, 0, { tag: 'top', base: spec.top });
  box(armR, spec.top, 0.18, 0.44, 0.2, 0, -0.2, 0, { tag: 'top', base: spec.top });
  // Sleeve cuff + hand
  box(armL, spec.accent, 0.19, 0.07, 0.21, 0, -0.36, 0, { tag: 'accent', base: spec.accent });
  box(armR, spec.accent, 0.19, 0.07, 0.21, 0, -0.36, 0, { tag: 'accent', base: spec.accent });
  box(armL, spec.skin, 0.17, 0.16, 0.19, 0, -0.46, 0);
  box(armR, spec.skin, 0.17, 0.16, 0.19, 0, -0.46, 0);
  torso.add(armL, armR);

  // ── head ──
  const head = new THREE.Group();
  head.position.y = 0.68 * s;
  torso.add(head);

  box(head, spec.skin, 0.56, 0.5, 0.52, 0, 0.24, 0);
  // Cheek shading and jaw taper give the head a bit of volume.
  box(head, skinLo, 0.05, 0.4, 0.5, -0.27, 0.24, 0);
  box(head, skinLo, 0.05, 0.4, 0.5, 0.27, 0.24, 0);
  box(head, skinLo, 0.4, 0.05, 0.5, 0, 0.0, 0);
  // Neck
  box(head, skinLo, 0.18, 0.08, 0.18, 0, -0.02, 0);
  // Brows
  box(head, hairLo, 0.11, 0.03, 0.03, -0.13, 0.34, 0.27);
  box(head, hairLo, 0.11, 0.03, 0.03, 0.13, 0.34, 0.27);
  // Eyes: sclera, iris, highlight
  box(head, 0xfdfdfd, 0.12, 0.13, 0.03, -0.13, 0.26, 0.26);
  box(head, 0xfdfdfd, 0.12, 0.13, 0.03, 0.13, 0.26, 0.26);
  box(head, spec.eye, 0.1, 0.12, 0.04, -0.13, 0.26, 0.27);
  box(head, spec.eye, 0.1, 0.12, 0.04, 0.13, 0.26, 0.27);
  box(head, shade(spec.eye, -46), 0.1, 0.04, 0.04, -0.13, 0.21, 0.28);
  box(head, shade(spec.eye, -46), 0.1, 0.04, 0.04, 0.13, 0.21, 0.28);
  box(head, 0xffffff, 0.04, 0.05, 0.02, -0.11, 0.29, 0.29);
  box(head, 0xffffff, 0.04, 0.05, 0.02, 0.15, 0.29, 0.29);
  // Mouth + blush
  box(head, 0xd88a8a, 0.08, 0.03, 0.03, 0, 0.13, 0.27);
  box(head, 0xf0a0a0, 0.1, 0.05, 0.02, -0.2, 0.19, 0.27);
  box(head, 0xf0a0a0, 0.1, 0.05, 0.02, 0.2, 0.19, 0.27);

  hairPiece(head, spec, s);
  accessoryPiece(torso, spec);

  // ── weapon, held in the right hand ──
  if (spec.weapon !== 'none') {
    const hand = new THREE.Group();
    hand.position.set(0.42 * s, 0.3 * s, 0.06);
    hand.rotation.z = -0.25;
    weaponPiece(hand, spec.weapon);
    torso.add(hand);
  }

  // Contact shadow blob keeps characters readable against busy ground.
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 12),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  return { root, head, armL, armR, legL, legR, body, height: 1.9 * s };
}

/**
 * Apply an outfit variant's colours to an existing rig (cosmetic swap). Each
 * tagged mesh keeps the light/shadow offset it was built with, so a recoloured
 * outfit still reads as shaded rather than flat.
 */
export function applyOutfit(rig: CharacterRig, top: number, bottom: number, accent: number): void {
  const targets: Record<string, number> = { top, bottom, accent };
  rig.root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || !(m.material instanceof THREE.MeshStandardMaterial)) return;
    const tag = m.userData.tag as string | undefined;
    if (!tag || targets[tag] === undefined) return;
    const delta = (m.userData.shadeDelta as number | undefined) ?? 0;
    m.material.color.setHex(clampHex(targets[tag] + delta));
  });
}

/** Keep a colour inside the 0x000000..0xffffff range after offsetting. */
function clampHex(v: number): number {
  const r = Math.max(0, Math.min(255, (v >> 16) & 0xff));
  const g = Math.max(0, Math.min(255, (v >> 8) & 0xff));
  const b = Math.max(0, Math.min(255, v & 0xff));
  return (r << 16) | (g << 8) | b;
}

/** Advance a walk cycle on a rig. `t` is elapsed time, `speed` 0..1. */
export function animateRig(rig: CharacterRig, t: number, speed: number): void {
  const amp = 0.75 * speed;
  const sw = Math.sin(t * 9) * amp;
  rig.legL.rotation.x = sw;
  rig.legR.rotation.x = -sw;
  rig.armL.rotation.x = -sw * 0.8;
  rig.armR.rotation.x = sw * 0.8;
  rig.body.position.y = Math.abs(Math.sin(t * 9)) * 0.05 * speed;
  rig.head.rotation.z = Math.sin(t * 9) * 0.03 * speed;
  // Idle breathing
  if (speed < 0.05) {
    rig.body.position.y = Math.sin(t * 1.6) * 0.018;
    rig.head.rotation.z = Math.sin(t * 0.9) * 0.02;
  }
}

/** Simple 3D relic prop matching a RelicShape. */
export function buildRelicMesh(shape: string, color: number, glow: number): THREE.Group {
  const g = new THREE.Group();
  switch (shape) {
    case 'muffler':
      box(g, color, 0.6, 0.16, 0.5, 0, 0, 0);
      box(g, color, 0.16, 0.44, 0.14, 0.2, -0.26, 0.14);
      box(g, glow, 0.62, 0.04, 0.52, 0, 0.1, 0, { emissive: glow });
      break;
    case 'poster':
      box(g, color, 0.5, 0.7, 0.04, 0, 0, 0);
      box(g, glow, 0.42, 0.6, 0.02, 0, 0, 0.03, { emissive: glow });
      box(g, 0x8a6a4a, 0.54, 0.06, 0.06, 0, 0.36, 0);
      box(g, 0x8a6a4a, 0.54, 0.06, 0.06, 0, -0.36, 0);
      break;
    case 'gear':
      box(g, color, 0.16, 0.5, 0.16, -0.12, 0, 0, { metal: 0.5 });
      box(g, color, 0.16, 0.5, 0.16, 0.12, 0, 0, { metal: 0.5 });
      box(g, 0x3a3a44, 0.5, 0.1, 0.2, 0, 0.2, 0);
      box(g, glow, 0.1, 0.3, 0.1, 0, -0.3, 0, { emissive: glow });
      break;
    case 'badge':
      box(g, color, 0.34, 0.34, 0.06, 0, 0, 0, { metal: 0.6, emissive: glow });
      box(g, glow, 0.2, 0.2, 0.03, 0, 0, 0.05, { emissive: glow });
      break;
    case 'flail':
      box(g, 0x6a5a3a, 0.08, 0.7, 0.08, 0, 0.2, 0);
      box(g, color, 0.34, 0.34, 0.34, 0.1, -0.3, 0, { metal: 0.6 });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        box(g, color, 0.1, 0.1, 0.1, 0.1 + Math.cos(a) * 0.22, -0.3 + Math.sin(a) * 0.22, 0, { metal: 0.6 });
      }
      break;
    case 'ribbon':
      box(g, color, 0.44, 0.14, 0.1, 0, 0, 0);
      box(g, color, 0.18, 0.26, 0.1, -0.2, 0, 0);
      box(g, color, 0.18, 0.26, 0.1, 0.2, 0, 0);
      break;
    case 'teacup':
      box(g, color, 0.32, 0.28, 0.32, 0, 0, 0);
      box(g, glow, 0.26, 0.03, 0.26, 0, 0.14, 0, { emissive: glow });
      box(g, color, 0.12, 0.16, 0.06, 0.2, 0, 0);
      box(g, 0xe8e8f0, 0.42, 0.04, 0.42, 0, -0.16, 0);
      break;
    case 'horn':
      box(g, color, 0.16, 0.36, 0.16, 0, 0, 0, { emissive: glow });
      box(g, color, 0.1, 0.16, 0.1, 0, 0.24, 0, { emissive: glow });
      break;
    case 'headband':
      box(g, color, 0.6, 0.12, 0.5, 0, 0, 0);
      box(g, glow, 0.62, 0.03, 0.52, 0, 0.07, 0, { emissive: glow });
      break;
    case 'key':
      box(g, color, 0.1, 0.6, 0.1, 0, 0, 0, { metal: 0.6 });
      box(g, color, 0.3, 0.1, 0.1, 0.12, 0.28, 0, { metal: 0.6 });
      box(g, color, 0.14, 0.1, 0.1, 0.2, 0.14, 0, { metal: 0.6 });
      break;
    case 'dogtag':
      box(g, color, 0.3, 0.4, 0.04, 0, 0, 0, { metal: 0.7 });
      box(g, 0x8a8f99, 0.06, 0.3, 0.03, 0, 0.32, 0);
      break;
    case 'scale':
      box(g, color, 0.44, 0.34, 0.08, 0, 0, 0, { emissive: glow, rough: 0.4 });
      box(g, glow, 0.3, 0.2, 0.04, 0, 0.02, 0.06, { emissive: glow });
      break;
    case 'scroll':
      box(g, color, 0.6, 0.26, 0.26, 0, 0, 0);
      box(g, 0x8a6a4a, 0.68, 0.1, 0.1, 0, 0.12, 0);
      box(g, 0x8a6a4a, 0.68, 0.1, 0.1, 0, -0.12, 0);
      break;
    case 'sandals':
      box(g, color, 0.3, 0.08, 0.5, -0.2, 0, 0);
      box(g, color, 0.3, 0.08, 0.5, 0.2, 0, 0);
      break;
    case 'coupon':
      box(g, color, 0.5, 0.3, 0.03, 0, 0, 0, { emissive: glow });
      box(g, 0xffffff, 0.4, 0.2, 0.01, 0, 0, 0.03);
      break;
    case 'muzzle':
      box(g, color, 0.3, 0.24, 0.26, 0, 0, 0);
      box(g, 0x8a2a2a, 0.32, 0.05, 0.28, 0, 0.1, 0);
      break;
    case 'haori':
      box(g, color, 0.66, 0.7, 0.14, 0, 0, 0);
      box(g, 0xe8dcc0, 0.16, 0.7, 0.15, -0.2, 0, 0.01);
      box(g, 0xe8dcc0, 0.16, 0.7, 0.15, 0.2, 0, 0.01);
      break;
    case 'blade':
      box(g, 0xe8dcc0, 0.08, 0.5, 0.08, 0, -0.2, 0);
      box(g, color, 0.14, 1.0, 0.04, 0, 0.5, 0, { metal: 0.7, emissive: glow });
      break;
    case 'sheath':
      box(g, color, 0.16, 1.1, 0.16, 0, 0, 0, { metal: 0.4 });
      box(g, 0xe0b64a, 0.2, 0.12, 0.2, 0, 0.5, 0);
      break;
    case 'chalice':
      box(g, color, 0.34, 0.34, 0.34, 0, 0.16, 0, { metal: 0.6, emissive: glow });
      box(g, color, 0.08, 0.3, 0.08, 0, -0.16, 0, { metal: 0.6 });
      box(g, color, 0.3, 0.06, 0.3, 0, -0.32, 0, { metal: 0.6 });
      break;
    case 'banner':
      box(g, 0x8a6a4a, 0.07, 1.2, 0.07, -0.24, 0, 0);
      box(g, color, 0.5, 0.9, 0.03, 0, 0.1, 0);
      box(g, glow, 0.4, 0.1, 0.02, 0, 0.4, 0.03, { emissive: glow });
      break;
    case 'lamp':
      box(g, 0x8a6a4a, 0.06, 0.7, 0.06, 0, 0, 0);
      box(g, color, 0.34, 0.4, 0.34, 0, 0.5, 0, { emissive: glow });
      break;
    case 'crystal':
      box(g, color, 0.24, 0.6, 0.24, 0, 0.1, 0, { emissive: glow, rough: 0.3 });
      break;
    default:
      box(g, color, 0.36, 0.36, 0.36, 0, 0, 0, { emissive: glow });
      break;
  }
  return g;
}
