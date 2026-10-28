import type { PropKind, ThemeId } from './types';

export interface Theme {
  id: ThemeId;
  name: string;
  /** Sky gradient: zenith, horizon, ground-haze. */
  sky: [number, number, number];
  fog: number;
  fogNear: number;
  fogFar: number;
  /** Ground tile palette, darkest to lightest. */
  ground: number[];
  /** Scatter table: prop kind + count + radius band. */
  scatter: { kind: PropKind; count: number; minR: number; maxR: number }[];
  /** Dense ring of props forming the world border. */
  border: { kind: PropKind; count: number };
  ambient: number;
  sun: number;
  sunColor: number;
  sunPos: [number, number, number];
  accent: number;
  /** Ground tile size in world units. */
  tile: number;
}

export const THEMES: Record<ThemeId, Theme> = {
  walls: {
    id: 'walls',
    name: 'Districts Beyond the Wall',
    sky: [0x4a7fc4, 0xa8cbe8, 0xd9e6ef],
    fog: 0xc3d8e6,
    fogNear: 55,
    fogFar: 165,
    ground: [0x4a6b35, 0x5c7f3f, 0x6d9349, 0x83a75a, 0x96b86b],
    scatter: [
      { kind: 'tree', count: 22, minR: 16, maxR: 72 },
      { kind: 'bush', count: 34, minR: 12, maxR: 78 },
      { kind: 'rock', count: 16, minR: 14, maxR: 76 },
      { kind: 'house', count: 7, minR: 30, maxR: 66 },
      { kind: 'tower', count: 2, minR: 40, maxR: 60 },
    ],
    border: { kind: 'wall', count: 40 },
    ambient: 0.72,
    sun: 1.25,
    sunColor: 0xfff3d6,
    sunPos: [60, 90, 40],
    accent: 0x8fb44f,
    tile: 6,
  },
  manor: {
    id: 'manor',
    name: 'Frozen Manor Grounds',
    sky: [0x1d2b52, 0x4a6ba8, 0xb9d3ee],
    fog: 0xc9dcee,
    fogNear: 40,
    fogFar: 140,
    ground: [0xb9c9da, 0xcbd9e8, 0xdce7f2, 0xeaf2fa, 0xf6fafe],
    scatter: [
      { kind: 'pine', count: 30, minR: 16, maxR: 78 },
      { kind: 'rock', count: 14, minR: 12, maxR: 70 },
      { kind: 'snowman', count: 8, minR: 14, maxR: 60 },
      { kind: 'lamp', count: 10, minR: 18, maxR: 58 },
      { kind: 'house', count: 4, minR: 34, maxR: 62 },
    ],
    border: { kind: 'pine', count: 46 },
    ambient: 0.85,
    sun: 0.95,
    sunColor: 0xdce9ff,
    sunPos: [-50, 80, 55],
    accent: 0x7fb6e8,
    tile: 6,
  },
  wasteland: {
    id: 'wasteland',
    name: 'Klaxosaur Wasteland',
    sky: [0x3b2350, 0xb8586a, 0xf0a878],
    fog: 0xd08e7a,
    fogNear: 45,
    fogFar: 150,
    ground: [0x6b4a3a, 0x815a45, 0x96704f, 0xa9855f, 0xbb9a72],
    scatter: [
      { kind: 'ruin', count: 26, minR: 14, maxR: 80 },
      { kind: 'rock', count: 24, minR: 10, maxR: 78 },
      { kind: 'crystal', count: 12, minR: 16, maxR: 72 },
      { kind: 'pillar', count: 10, minR: 20, maxR: 66 },
      { kind: 'tent', count: 5, minR: 26, maxR: 58 },
    ],
    border: { kind: 'pillar', count: 34 },
    ambient: 0.6,
    sun: 1.0,
    sunColor: 0xffb27a,
    sunPos: [70, 55, -60],
    accent: 0xff6b7d,
    tile: 7,
  },
  leaf: {
    id: 'leaf',
    name: 'Hidden Leaf Outskirts',
    sky: [0x2f6fbf, 0x8fc4e8, 0xdceff7],
    fog: 0xbfe0ea,
    fogNear: 50,
    fogFar: 155,
    ground: [0x3f6b30, 0x517f3b, 0x639348, 0x79a857, 0x8fbc68],
    scatter: [
      { kind: 'tree', count: 40, minR: 14, maxR: 82 },
      { kind: 'bamboo', count: 18, minR: 16, maxR: 74 },
      { kind: 'bush', count: 28, minR: 10, maxR: 76 },
      { kind: 'lamp', count: 12, minR: 18, maxR: 62 },
      { kind: 'house', count: 8, minR: 28, maxR: 64 },
      { kind: 'gate', count: 2, minR: 36, maxR: 56 },
    ],
    border: { kind: 'tree', count: 52 },
    ambient: 0.68,
    sun: 1.15,
    sunColor: 0xfff0c2,
    sunPos: [-45, 85, 50],
    accent: 0xe86a2c,
    tile: 6,
  },
  bamboo: {
    id: 'bamboo',
    name: 'Wisteria Grove',
    sky: [0x241b3d, 0x5a4a8f, 0x9b86c9],
    fog: 0x6b5aa0,
    fogNear: 38,
    fogFar: 130,
    ground: [0x2b3a2a, 0x354a32, 0x41583c, 0x4e6647, 0x5d7753],
    scatter: [
      { kind: 'bamboo', count: 52, minR: 12, maxR: 82 },
      { kind: 'wisteria', count: 20, minR: 14, maxR: 76 },
      { kind: 'bush', count: 22, minR: 10, maxR: 72 },
      { kind: 'rock', count: 12, minR: 12, maxR: 68 },
      { kind: 'lamp', count: 14, minR: 16, maxR: 60 },
    ],
    border: { kind: 'bamboo', count: 56 },
    ambient: 0.55,
    sun: 0.7,
    sunColor: 0xc9b6ff,
    sunPos: [30, 70, -40],
    accent: 0xb98fe8,
    tile: 6,
  },
  camelot: {
    id: 'camelot',
    name: 'Camelot Battlefield',
    sky: [0x2b3f6b, 0x6f8fc4, 0xcfdcec],
    fog: 0xbccfe0,
    fogNear: 55,
    fogFar: 175,
    ground: [0x54633a, 0x67784a, 0x7b8d59, 0x90a26b, 0xa6b87e],
    scatter: [
      { kind: 'pillar', count: 20, minR: 16, maxR: 78 },
      { kind: 'ruin', count: 18, minR: 14, maxR: 76 },
      { kind: 'tree', count: 16, minR: 18, maxR: 74 },
      { kind: 'rock', count: 14, minR: 12, maxR: 70 },
      { kind: 'tower', count: 3, minR: 38, maxR: 62 },
    ],
    border: { kind: 'pillar', count: 42 },
    ambient: 0.75,
    sun: 1.1,
    sunColor: 0xffeec9,
    sunPos: [55, 95, 45],
    accent: 0xe0b64a,
    tile: 7,
  },
};
