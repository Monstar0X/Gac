import * as THREE from 'three';
import type { PropKind } from '../data/types';

const UNIT = new THREE.BoxGeometry(1, 1, 1);

function m(color: number, opts: { emissive?: number; rough?: number; metal?: number } = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.rough ?? 0.9,
    metalness: opts.metal ?? 0,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissive ? 0.5 : 0,
    flatShading: true,
  });
}

function b(
  parent: THREE.Object3D,
  color: number,
  sx: number,
  sy: number,
  sz: number,
  x: number,
  y: number,
  z: number,
  opts?: { emissive?: number; rough?: number; metal?: number },
): THREE.Mesh {
  const mesh = new THREE.Mesh(UNIT, m(color, opts));
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const CACHE = new Map<string, THREE.Group>();

/**
 * Build a decorative prop. Results are cached by kind+seed and cloned, which
 * keeps the scatter pass cheap even with a few hundred props.
 */
export function buildProp(kind: PropKind, seed: number): THREE.Group {
  const key = `${kind}:${seed % 4}`;
  const hit = CACHE.get(key);
  if (hit) return hit.clone(true);

  const g = new THREE.Group();
  const v = seed % 4;

  switch (kind) {
    case 'pine': {
      const trunkH = 0.8 + v * 0.15;
      b(g, 0x4a3a2a, 0.28, trunkH, 0.28, 0, trunkH / 2, 0);
      for (let i = 0; i < 3; i++) {
        const w = 2.2 - i * 0.5;
        b(g, 0x1f5a3a + i * 0x040a04, w, 1.0, w, 0, trunkH + 0.3 + i * 0.7, 0);
      }
      b(g, 0xf4fafe, 0.7, 0.14, 0.7, 0, trunkH + 2.0, 0);
      break;
    }
    case 'tree': {
      const trunkH = 1.6 + v * 0.2;
      b(g, 0x5a4030, 0.34, trunkH, 0.34, 0, trunkH / 2, 0);
      b(g, 0x3f7a3a, 2.4 + v * 0.2, 1.5, 2.4 + v * 0.2, 0, trunkH + 0.5, 0);
      b(g, 0x4f9048, 1.6, 1.0, 1.6, 0.2, trunkH + 1.3, 0.1);
      break;
    }
    case 'rock': {
      const s = 0.6 + v * 0.25;
      b(g, 0x7a7a80, s * 1.4, s, s * 1.2, 0, s * 0.4, 0);
      b(g, 0x8f8f96, s * 0.8, s * 0.6, s * 0.8, s * 0.4, s * 0.7, 0);
      break;
    }
    case 'bush':
      b(g, 0x3a6a34, 1.2 + v * 0.1, 0.8, 1.2 + v * 0.1, 0, 0.4, 0);
      b(g, 0x4a7f3f, 0.8, 0.5, 0.8, 0.25, 0.8, 0.1);
      break;
    case 'crystal': {
      const h = 1.6 + v * 0.5;
      b(g, 0x7fd8e8, 0.4, h, 0.4, 0, h / 2, 0, { emissive: 0x3fa8c8, rough: 0.3 });
      b(g, 0x9fe8f8, 0.22, h * 0.6, 0.22, 0.4, h * 0.3, 0, { emissive: 0x3fa8c8, rough: 0.3 });
      b(g, 0x9fe8f8, 0.2, h * 0.45, 0.2, -0.35, h * 0.22, 0.1, { emissive: 0x3fa8c8, rough: 0.3 });
      break;
    }
    case 'lamp':
      b(g, 0x3a3a44, 0.16, 3.0, 0.16, 0, 1.5, 0, { metal: 0.4 });
      b(g, 0xffd75e, 0.5, 0.5, 0.5, 0, 3.1, 0, { emissive: 0xffd75e });
      b(g, 0x3a3a44, 0.7, 0.1, 0.7, 0, 3.4, 0, { metal: 0.4 });
      break;
    case 'wall':
      b(g, 0x9a9a96, 3.2, 8, 1.6, 0, 4, 0);
      b(g, 0x8a8a86, 3.4, 0.4, 1.8, 0, 8.1, 0);
      break;
    case 'house': {
      const w = 4 + v * 0.8;
      const h = 3 + v * 0.4;
      b(g, 0xd8c8a8, w, h, w * 0.85, 0, h / 2, 0);
      b(g, 0xa83a3a, w * 1.15, 0.5, w, 0, h + 0.25, 0);
      b(g, 0x8a3a3a, w * 1.05, 0.9, w * 0.95, 0, h + 0.9, 0);
      b(g, 0x6a4a2a, w * 0.28, h * 0.55, 0.2, 0, h * 0.28, w * 0.44);
      b(g, 0x9fd8f0, w * 0.24, w * 0.24, 0.16, -w * 0.3, h * 0.62, w * 0.44, {
        emissive: 0x3a6a8a,
      });
      b(g, 0x9fd8f0, w * 0.24, w * 0.24, 0.16, w * 0.3, h * 0.62, w * 0.44, {
        emissive: 0x3a6a8a,
      });
      break;
    }
    case 'tower': {
      const h = 14 + v * 3;
      b(g, 0x9a8f7a, 4.2, h, 4.2, 0, h / 2, 0);
      b(g, 0x7a6f5a, 5.4, 1.2, 5.4, 0, h + 0.6, 0);
      b(g, 0xa83a3a, 4.6, 1.6, 4.6, 0, h + 2.0, 0);
      b(g, 0xd8c8a8, 2.0, 1.0, 0.4, 0, h * 0.3, 2.1);
      break;
    }
    case 'pillar': {
      const h = 6 + v * 2;
      b(g, 0xd8d4c8, 1.6, h, 1.6, 0, h / 2, 0);
      b(g, 0xe8e4d8, 2.2, 0.5, 2.2, 0, h + 0.25, 0);
      b(g, 0xc8c4b8, 2.0, 0.4, 2.0, 0, 0.2, 0);
      break;
    }
    case 'bamboo': {
      const h = 7 + v * 2.5;
      for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 0.5;
        b(g, 0x7aa84a, 0.3, h, 0.3, ox, h / 2, i * 0.2);
        for (let k = 1; k < 5; k++) {
          b(g, 0x5f8a3a, 0.34, 0.1, 0.34, ox, (h / 5) * k, i * 0.2);
        }
        b(g, 0x8fbc5a, 1.2, 0.5, 0.5, ox + 0.6, h * 0.75, i * 0.2);
      }
      break;
    }
    case 'wisteria': {
      const trunkH = 2.6;
      b(g, 0x4a3a30, 0.5, trunkH, 0.5, 0, trunkH / 2, 0);
      b(g, 0x4a7a4a, 4.5, 1.2, 4.5, 0, trunkH + 0.5, 0);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = 1.9;
        b(g, 0xb98fe8, 0.5, 1.8, 0.5, Math.cos(a) * r, trunkH - 0.6, Math.sin(a) * r, {
          emissive: 0x6a4a9a,
        });
      }
      break;
    }
    case 'ruin': {
      const h = 2.5 + v;
      b(g, 0x8a8078, 2.4, h, 1.2, 0, h / 2, 0);
      b(g, 0x9a9088, 1.0, 1.6, 1.0, 1.0, h + 0.8, 0.2);
      b(g, 0x6a625a, 1.6, 0.6, 1.0, -0.6, 0.3, 0.5);
      break;
    }
    case 'tent': {
      b(g, 0x8a6a4a, 0.1, 2.4, 2.4, -1.2, 1.2, 0);
      b(g, 0x8a6a4a, 0.1, 2.4, 2.4, 1.2, 1.2, 0);
      b(g, 0xc45a3a, 2.6, 0.2, 2.6, 0, 2.4, 0);
      break;
    }
    case 'cactus': {
      const h = 2.4 + v * 0.6;
      b(g, 0x4a8a4a, 0.7, h, 0.7, 0, h / 2, 0);
      b(g, 0x4a8a4a, 0.5, 0.5, 0.5, 0.55, h * 0.5, 0);
      b(g, 0x4a8a4a, 0.5, 1.0, 0.5, 0.7, h * 0.62, 0);
      break;
    }
    case 'snowman':
      b(g, 0xf8fcff, 1.2, 1.2, 1.2, 0, 0.6, 0);
      b(g, 0xf8fcff, 0.85, 0.85, 0.85, 0, 1.6, 0);
      b(g, 0x2a2a34, 0.12, 0.12, 0.1, -0.2, 1.75, 0.42);
      b(g, 0x2a2a34, 0.12, 0.12, 0.1, 0.2, 1.75, 0.42);
      b(g, 0xe8862c, 0.3, 0.1, 0.1, 0, 1.62, 0.45);
      break;
    case 'gate': {
      b(g, 0xa83a3a, 1.0, 8, 1.0, -3.5, 4, 0);
      b(g, 0xa83a3a, 1.0, 8, 1.0, 3.5, 4, 0);
      b(g, 0x8a2a2a, 8.5, 1.2, 1.4, 0, 8.6, 0);
      b(g, 0x8a2a2a, 7.0, 0.8, 1.2, 0, 7.4, 0);
      break;
    }
    default:
      b(g, 0x8a8a8a, 1, 1, 1, 0, 0.5, 0);
      break;
  }

  CACHE.set(key, g);
  return g.clone(true);
}

export function clearPropCache(): void {
  CACHE.clear();
}
