import * as THREE from 'three';
import type { Waifu } from '../data/types';
import { THEMES, type Theme } from '../data/themes';
import { buildProp } from './props';
import { buildCharacter, buildRelicMesh, animateRig, type CharacterRig } from './character';

export const WORLD_RADIUS = 92;

export interface RelicEntity {
  relicId: string;
  group: THREE.Group;
  position: THREE.Vector3;
  collected: boolean;
}

export interface WorldResult {
  scene: THREE.Scene;
  theme: Theme;
  waifu: Waifu;
  relics: RelicEntity[];
  primePosition: THREE.Vector3;
  primeGroup: THREE.Group;
  npcRig: CharacterRig;
  /** Radius within which the player can interact with the prime NPC. */
  primeRadius: number;
  update: (t: number, dt: number, playerPos: THREE.Vector3) => void;
  dispose: () => void;
}

/** Deterministic per-world RNG so a world looks the same every visit. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeSky(theme: Theme): THREE.Mesh {
  const geo = new THREE.SphereGeometry(WORLD_RADIUS * 3.4, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      cTop: { value: new THREE.Color(theme.sky[0]) },
      cMid: { value: new THREE.Color(theme.sky[1]) },
      cBot: { value: new THREE.Color(theme.sky[2]) },
    },
    vertexShader: /* glsl */ `
      varying float vH;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vH = normalize(wp.xyz).y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vH;
      uniform vec3 cTop, cMid, cBot;
      void main() {
        float h = clamp(vH * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = h > 0.5
          ? mix(cMid, cTop, (h - 0.5) * 2.0)
          : mix(cBot, cMid, h * 2.0);
        // subtle banding keeps the pixel look consistent
        col = floor(col * 24.0 + 0.5) / 24.0;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

function makeGround(theme: Theme, rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const tile = theme.tile;
  const count = Math.ceil((WORLD_RADIUS * 2) / tile) + 1;
  const half = (count * tile) / 2;

  // One merged geometry per palette colour keeps draw calls low.
  const buckets = new Map<number, THREE.BufferGeometry[]>();
  const box = new THREE.BoxGeometry(1, 1, 1);

  for (let ix = 0; ix < count; ix++) {
    for (let iz = 0; iz < count; iz++) {
      const x = ix * tile - half + tile / 2;
      const z = iz * tile - half + tile / 2;
      const dist = Math.hypot(x, z);
      if (dist > WORLD_RADIUS + tile) continue;
      const idx = Math.floor(rng() * theme.ground.length);
      const color = theme.ground[Math.min(idx, theme.ground.length - 1)];
      // Slight height variation for a chunky, hand-placed feel.
      const h = 1 + (rng() < 0.25 ? 0.35 : 0);
      const m4 = new THREE.Matrix4()
        .makeTranslation(x, -h / 2 + 0.1, z)
        .multiply(new THREE.Matrix4().makeScale(tile * 1.02, h, tile * 1.02));
      const cloned = box.clone().applyMatrix4(m4);
      const arr = buckets.get(color) ?? [];
      arr.push(cloned);
      buckets.set(color, arr);
    }
  }

  buckets.forEach((geos, color) => {
    const merged = mergeGeometries(geos);
    const mesh = new THREE.Mesh(
      merged,
      new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }),
    );
    mesh.receiveShadow = true;
    g.add(mesh);
    geos.forEach((x) => x.dispose());
  });
  box.dispose();
  return g;
}

/** Minimal geometry merge (position + normal + uv), avoids the examples addon. */
function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let vCount = 0;
  let iCount = 0;
  for (const g of geos) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : 0;
  }
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    const p = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const u = g.attributes.uv as THREE.BufferAttribute | undefined;
    const gi = g.index as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      pos[(vo + i) * 3] = p.getX(i);
      pos[(vo + i) * 3 + 1] = p.getY(i);
      pos[(vo + i) * 3 + 2] = p.getZ(i);
      nor[(vo + i) * 3] = n.getX(i);
      nor[(vo + i) * 3 + 1] = n.getY(i);
      nor[(vo + i) * 3 + 2] = n.getZ(i);
      if (u) {
        uv[(vo + i) * 2] = u.getX(i);
        uv[(vo + i) * 2 + 1] = u.getY(i);
      }
    }
    for (let i = 0; i < gi.count; i++) idx[io + i] = gi.getX(i) + vo;
    vo += p.count;
    io += gi.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

/** Pick a clear spot away from the spawn ring and the prime location. */
function scatterPositions(
  rng: () => number,
  count: number,
  minR: number,
  maxR: number,
  avoid: { pos: THREE.Vector3; r: number }[],
): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const a = rng() * Math.PI * 2;
    const r = minR + rng() * (maxR - minR);
    const p = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    if (p.length() < 11) continue; // keep the spawn plaza clear
    let ok = true;
    for (const av of avoid) {
      if (p.distanceTo(av.pos) < av.r) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const o of out) {
      if (p.distanceTo(o) < 4.5) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(p);
  }
  return out;
}

/**
 * Build a full quest world for a featured waifu: themed terrain, scattered
 * props, the relic pickups and the prime location NPC.
 */
export function buildWorld(waifu: Waifu, collectedRelicIds: string[] = []): WorldResult {
  const theme = THEMES[waifu.theme ?? 'walls'];
  const rng = seeded(hash(waifu.id));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.sky[1]);
  scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);

  const disposables: { dispose: () => void }[] = [];

  // ── sky ──
  const sky = makeSky(theme);
  scene.add(sky);
  disposables.push(sky.geometry, sky.material as THREE.Material);

  // ── lights ──
  const hemi = new THREE.HemisphereLight(theme.sky[1], theme.ground[0], theme.ambient);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(theme.sunColor, theme.sun);
  sun.position.set(...theme.sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const d = 60;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.0012;
  sun.shadow.normalBias = 0.05;
  scene.add(sun);
  scene.add(sun.target);

  // ── ground ──
  const ground = makeGround(theme, rng);
  scene.add(ground);
  ground.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) disposables.push(mesh.geometry, mesh.material as THREE.Material);
  });

  // ── prime location + relic layout (computed before scatter so we can avoid it) ──
  const quest = waifu.quest;
  const primeAngle = rng() * Math.PI * 2;
  const primeDist = 56;
  const primePosition = new THREE.Vector3(
    Math.cos(primeAngle) * primeDist,
    0,
    Math.sin(primeAngle) * primeDist,
  );

  const relicPositions: THREE.Vector3[] = [];
  const relicCount = quest?.relics.length ?? 0;
  for (let i = 0; i < relicCount; i++) {
    const a = primeAngle + Math.PI + (i / Math.max(1, relicCount)) * Math.PI * 2;
    const r = 26 + (i % 2) * 16 + rng() * 8;
    relicPositions.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }

  const avoid = [
    { pos: primePosition, r: 16 },
    ...relicPositions.map((p) => ({ pos: p, r: 7 })),
  ];

  // ── scatter props ──
  for (const s of theme.scatter) {
    const pts = scatterPositions(rng, s.count, s.minR, s.maxR, avoid);
    for (const p of pts) {
      const prop = buildProp(s.kind, Math.floor(rng() * 1000));
      prop.position.copy(p);
      prop.rotation.y = rng() * Math.PI * 2;
      const sc = 0.85 + rng() * 0.4;
      prop.scale.setScalar(sc);
      scene.add(prop);
      prop.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) disposables.push(mesh.geometry, mesh.material as THREE.Material);
      });
    }
  }

  // ── border ring ──
  const borderCount = theme.border.count;
  for (let i = 0; i < borderCount; i++) {
    const a = (i / borderCount) * Math.PI * 2;
    const r = WORLD_RADIUS + 3;
    const prop = buildProp(theme.border.kind, i);
    prop.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    prop.rotation.y = -a + Math.PI / 2;
    prop.scale.setScalar(1.4);
    scene.add(prop);
    prop.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) disposables.push(mesh.geometry, mesh.material as THREE.Material);
    });
  }

  // ── prime location structure ──
  const primeGroup = new THREE.Group();
  primeGroup.position.copy(primePosition);

  // Glowing ritual ring on the ground.
  const ringMat = new THREE.MeshBasicMaterial({
    color: theme.accent,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.4, 6.2, 32), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.35;
  primeGroup.add(ring);
  disposables.push(ring.geometry, ringMat);

  const ringInner = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.0, 32), ringMat.clone());
  ringInner.rotation.x = -Math.PI / 2;
  ringInner.position.y = 0.36;
  primeGroup.add(ringInner);
  disposables.push(ringInner.geometry, ringInner.material as THREE.Material);

  // Landmark structure, themed to the world.
  const landmark = buildLandmark(theme, rng);
  primeGroup.add(landmark);
  landmark.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) disposables.push(mesh.geometry, mesh.material as THREE.Material);
  });

  // ── the waifu NPC ──
  const npcRig = buildCharacter(waifu.spec);
  npcRig.root.position.set(0, 0, 0);
  npcRig.root.scale.setScalar(1.35);
  primeGroup.add(npcRig.root);
  npcRig.root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) disposables.push(mesh.material as THREE.Material);
  });

  // Floating nameplate-ish glow above her head.
  const haloMat = new THREE.MeshBasicMaterial({
    color: waifu.spec.accent,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.16, 6, 20), haloMat);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 3.4;
  primeGroup.add(halo);
  disposables.push(halo.geometry, haloMat);

  scene.add(primeGroup);

  // ── relic pickups ──
  const relics: RelicEntity[] = [];
  (quest?.relics ?? []).forEach((def, i) => {
    const pos = relicPositions[i] ?? new THREE.Vector3(0, 0, 0);
    const group = new THREE.Group();
    group.position.copy(pos);

    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x6a6258,
      roughness: 0.8,
      flatShading: true,
    });
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 2.2), pedestalMat);
    pedestal.position.y = 0.25;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    group.add(pedestal);
    disposables.push(pedestal.geometry, pedestalMat);

    const inner = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.6), pedestalMat.clone());
    inner.position.y = 0.6;
    group.add(inner);
    disposables.push(inner.geometry, inner.material as THREE.Material);

    const prop = buildRelicMesh(def.shape, def.color, def.glow);
    prop.position.y = 1.9;
    prop.scale.setScalar(1.25);
    group.add(prop);
    prop.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) disposables.push(mesh.geometry, mesh.material as THREE.Material);
    });

    // Light column so relics are visible from far away.
    const beamMat = new THREE.MeshBasicMaterial({
      color: def.glow,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 14, 10, 1, true), beamMat);
    beam.position.y = 7;
    group.add(beam);
    disposables.push(beam.geometry, beamMat);

    const light = new THREE.PointLight(def.glow, 3.2, 16, 2);
    light.position.y = 2.2;
    group.add(light);

    const collected = collectedRelicIds.includes(def.id);
    group.visible = !collected;

    scene.add(group);
    relics.push({ relicId: def.id, group, position: pos.clone(), collected });
  });

  // ── spawn plaza marker ──
  const spawnMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const spawnRing = new THREE.Mesh(new THREE.RingGeometry(3.0, 3.5, 28), spawnMat);
  spawnRing.rotation.x = -Math.PI / 2;
  spawnRing.position.y = 0.3;
  scene.add(spawnRing);
  disposables.push(spawnRing.geometry, spawnMat);

  const primeRadius = 8;

  let haloAngle = 0;

  const update = (t: number, dt: number, playerPos: THREE.Vector3) => {
    // Bob + spin the relic props.
    for (const r of relics) {
      if (r.collected) continue;
      r.group.children.forEach((c) => {
        if (c.type === 'Group') {
          c.rotation.y = t * 0.9;
          c.position.y = 1.9 + Math.sin(t * 2 + r.position.x) * 0.16;
        }
      });
    }

    // NPC idles, and turns to face the player when close.
    animateRig(npcRig, t, 0);
    const toPlayer = new THREE.Vector3().subVectors(playerPos, primePosition);
    const dist = toPlayer.length();
    if (dist < 22) {
      const targetYaw = Math.atan2(toPlayer.x, toPlayer.z);
      npcRig.root.rotation.y = lerpAngle(npcRig.root.rotation.y, targetYaw, Math.min(1, dt * 3));
    } else {
      npcRig.root.rotation.y = lerpAngle(npcRig.root.rotation.y, primeAngle + Math.PI, Math.min(1, dt * 2));
    }

    // Ring pulse intensifies as the player approaches.
    haloAngle += dt * 1.6;
    halo.rotation.z = haloAngle;
    halo.position.y = 3.4 + Math.sin(t * 1.8) * 0.12;
    const near = Math.max(0, 1 - dist / 40);
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.32 + near * 0.4 + Math.sin(t * 2.4) * 0.06;
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.35 + near * 0.45;

    // Keep the sun shadow box centred on the player.
    sun.position.set(playerPos.x + theme.sunPos[0] * 0.5, theme.sunPos[1], playerPos.z + theme.sunPos[2] * 0.5);
    sun.target.position.copy(playerPos);
    sun.target.updateMatrixWorld();
    sky.position.set(playerPos.x, 0, playerPos.z);
  };

  const dispose = () => {
    for (const d of disposables) {
      try {
        d.dispose();
      } catch {
        /* already disposed */
      }
    }
  };

  return {
    scene,
    theme,
    waifu,
    relics,
    primePosition,
    primeGroup,
    npcRig,
    primeRadius,
    update,
    dispose,
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

/** The landmark structure that marks the prime location for each theme. */
function buildLandmark(theme: Theme, rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const add = (
    color: number,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    emissive?: number,
  ) => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      flatShading: true,
      emissive: emissive ?? 0x000000,
      emissiveIntensity: emissive ? 0.5 : 0,
    });
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  };

  switch (theme.id) {
    case 'walls':
      // Tall watchtower — Mikasa's prime location.
      add(0x9a8f7a, 5, 22, 5, 0, 11, -4);
      add(0x7a6f5a, 6.4, 1.4, 6.4, 0, 22.5, -4);
      add(0xa83a3a, 5.6, 2.0, 5.6, 0, 24.2, -4);
      add(0xd8c8a8, 2.4, 1.2, 0.5, 0, 6, -1.4);
      add(0x9fd8f0, 1.4, 1.4, 0.3, 0, 16, -1.4, 0x3a6a8a);
      break;
    case 'manor':
      // Frozen fountain.
      add(0x9ab4c8, 7, 1.2, 7, 0, 0.6, -4);
      add(0xb9d3ee, 2.2, 4, 2.2, 0, 3, -4);
      add(0xdce9ff, 3.6, 0.8, 3.6, 0, 5.2, -4);
      add(0x7fb6e8, 1.0, 2.4, 1.0, 0, 6.6, -4, 0x3f7fb8);
      break;
    case 'wasteland':
      // Crashed Franxx husk.
      add(0xb8384f, 6, 7, 14, 0, 3.5, -6);
      add(0xe83a5a, 4, 3, 5, 0, 8, -1);
      add(0x3fc4d8, 1.6, 1.6, 1.6, -2.6, 5, -4, 0x3fc4d8);
      add(0x3fc4d8, 1.6, 1.6, 1.6, 2.6, 5, -4, 0x3fc4d8);
      break;
    case 'leaf':
      // Village gate.
      add(0xa83a3a, 1.6, 13, 1.6, -4.5, 6.5, -3);
      add(0xa83a3a, 1.6, 13, 1.6, 4.5, 6.5, -3);
      add(0x8a2a2a, 12, 1.6, 2.2, 0, 13.8, -3);
      add(0x8a2a2a, 10, 1.0, 1.8, 0, 12.2, -3);
      break;
    case 'bamboo':
      // Moonlit shrine.
      add(0x8a2a2a, 6, 0.8, 5, 0, 0.4, -4);
      add(0x6a1a1a, 1.0, 5, 1.0, -2.4, 2.9, -4);
      add(0x6a1a1a, 1.0, 5, 1.0, 2.4, 2.9, -4);
      add(0x6a1a1a, 7, 1.0, 6, 0, 5.6, -4);
      add(0xffd75e, 1.4, 1.4, 1.4, 0, 2.2, -4, 0xffd75e);
      break;
    case 'camelot':
      // Round table ring of broken pillars.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const h = 6 + Math.sin(i * 2.1) * 2.4;
        add(
          0xd8d4c8,
          1.4,
          h,
          1.4,
          Math.cos(a) * 7,
          h / 2,
          -4 + Math.sin(a) * 7,
        );
      }
      add(0x54633a, 12, 0.6, 12, 0, 0.3, -4);
      add(0xe0b64a, 2.6, 0.5, 2.6, 0, 1.0, -4, 0xe0b64a);
      break;
    default:
      add(0x9a8f7a, 4, 10, 4, 0, 5, -4);
      break;
  }

  void rng;
  return g;
}
