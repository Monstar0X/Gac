/**
 * Rooms are keyed by anime series, not by waifu. Every waifu from the same
 * series lives in the same room, so recruiting Ram or Emilia fills out Rem's
 * Re:Zero manor rather than opening a room of their own.
 *
 * The default `cozy` room is used before the player owns anyone.
 */

export interface RoomPalette {
  /** Floor plank colours, darkest to lightest. */
  floor: number[];
  wall: number;
  trim: number;
  beam: number;
  /** Rug colour bands, outer to inner. */
  rug: number[];
  background: number;
  fog: number;
  /** Hemisphere light intensity. */
  ambient: number;
  hemiSky: number;
  hemiGround: number;
  fire: number;
  lamp: number;
}

export interface RoomDecor {
  fireplace: boolean;
  bookshelf: boolean;
  bed: boolean;
  teaTable: boolean;
  lamps: boolean;
  plants: boolean;
  window: boolean;
}

/** One themed centrepiece so each room reads as its own place. */
export type RoomSignature =
  | 'clock'
  | 'trainingDummy'
  | 'banners'
  | 'lanterns'
  | 'cockpit'
  | 'blossoms'
  | 'arcade'
  | 'herbStall'
  | 'shrine'
  | 'none';

export interface RoomDef {
  id: string;
  /** Series whose waifus live here. '' = the universal starter room. */
  series: string;
  name: string;
  blurb: string;
  palette: RoomPalette;
  decor: RoomDecor;
  signature: RoomSignature;
}

export const DEFAULT_ROOM_ID = 'cozy';

export const ROOMS: RoomDef[] = [
  {
    id: 'cozy',
    series: '',
    name: 'Your Room',
    blurb: 'A quiet rented room. Warm lamps, a low fire, room for whoever comes home.',
    palette: {
      floor: [0x6a4a34, 0x745239, 0x7d5940, 0x6f4d37],
      wall: 0x4a3540,
      trim: 0x5c4250,
      beam: 0x4a3428,
      rug: [0x8a3a44, 0xa84a54, 0xd8b06a, 0x8a3a44],
      background: 0x2b1f2a,
      fog: 0x3a2a30,
      ambient: 2.1,
      hemiSky: 0xffd9a8,
      hemiGround: 0x3a2a24,
      fire: 0xff9a3a,
      lamp: 0xffc98a,
    },
    decor: {
      fireplace: true,
      bookshelf: true,
      bed: true,
      teaTable: true,
      lamps: true,
      plants: true,
      window: true,
    },
    signature: 'none',
  },

  // ── Attack on Titan ──
  {
    id: 'aot',
    series: 'Attack on Titan',
    name: 'Survey Corps Barracks',
    blurb: 'Stone walls and ODM racks. The wind off the wall never really stops.',
    palette: {
      floor: [0x5c5348, 0x665c50, 0x6f6559, 0x585045],
      wall: 0x6b6a63,
      trim: 0x807e75,
      beam: 0x4a443a,
      rug: [0x5a4a3a, 0x6d5b47, 0x8a7458, 0x5a4a3a],
      background: 0x232a26,
      fog: 0x39423a,
      ambient: 1.9,
      hemiSky: 0xe8e4d4,
      hemiGround: 0x32362e,
      fire: 0xffb055,
      lamp: 0xffdca8,
    },
    decor: {
      fireplace: true,
      bookshelf: true,
      bed: false,
      teaTable: true,
      lamps: true,
      plants: false,
      window: true,
    },
    signature: 'trainingDummy',
  },

  // ── Re:Zero ──
  {
    id: 'rezero',
    series: 'Re:Zero',
    name: 'Roswaal Manor',
    blurb: 'Polished floors and tall windows. A grandfather clock keeps the whole house in time.',
    palette: {
      floor: [0x6b4f3a, 0x77593f, 0x836246, 0x5f4632],
      wall: 0x39406b,
      trim: 0xcfd6ea,
      beam: 0x2e3455,
      rug: [0x2b3160, 0x3b4478, 0x8fa4d8, 0x2b3160],
      background: 0x1e2340,
      fog: 0x2b3157,
      ambient: 2.2,
      hemiSky: 0xd8e4ff,
      hemiGround: 0x2a2f4a,
      fire: 0xffb877,
      lamp: 0xcfe0ff,
    },
    decor: {
      fireplace: true,
      bookshelf: true,
      bed: false,
      teaTable: true,
      lamps: true,
      plants: true,
      window: true,
    },
    signature: 'clock',
  },

  // ── Darling in the Franxx ──
  {
    id: 'franxx',
    series: 'Darling in the Franxx',
    name: 'Plantation Hangar',
    blurb: 'A maintenance bay with a stripped cockpit. Somewhere below, a Franxx hums.',
    palette: {
      floor: [0x4a4238, 0x554c41, 0x5f564a, 0x423b32],
      wall: 0x5a4a44,
      trim: 0x8a6a5a,
      beam: 0x3a322c,
      rug: [0x6a2a34, 0x8a3644, 0xd8a05a, 0x6a2a34],
      background: 0x2a1e20,
      fog: 0x3d2a2a,
      ambient: 1.8,
      hemiSky: 0xffc9a8,
      hemiGround: 0x30241f,
      fire: 0xff7a3a,
      lamp: 0xffb070,
    },
    decor: {
      fireplace: false,
      bookshelf: false,
      bed: false,
      teaTable: true,
      lamps: true,
      plants: false,
      window: true,
    },
    signature: 'cockpit',
  },

  // ── Naruto ──
  {
    id: 'naruto',
    series: 'Naruto',
    name: 'Leaf Village Apartment',
    blurb: 'Paper lanterns, a scroll rack, and a window over the rooftops of the Hidden Leaf.',
    palette: {
      floor: [0x7a5a3c, 0x866444, 0x926d4b, 0x6d5036],
      wall: 0xb59a72,
      trim: 0x8a6f4c,
      beam: 0x5c452e,
      rug: [0x3a5a34, 0x4a7040, 0xd8b06a, 0x3a5a34],
      background: 0x2c2418,
      fog: 0x4a3c28,
      ambient: 2.3,
      hemiSky: 0xffe4b0,
      hemiGround: 0x40301c,
      fire: 0xffa03a,
      lamp: 0xffd070,
    },
    decor: {
      fireplace: false,
      bookshelf: true,
      bed: true,
      teaTable: true,
      lamps: true,
      plants: true,
      window: true,
    },
    signature: 'lanterns',
  },

  // ── Demon Slayer ──
  {
    id: 'demonslayer',
    series: 'Demon Slayer',
    name: 'Butterfly Estate Room',
    blurb: 'Tatami, wisteria in the rafters, and a garden that keeps the night at bay.',
    palette: {
      floor: [0x8a7a58, 0x96845f, 0xa28e67, 0x7d6e4f],
      wall: 0x2f3a34,
      trim: 0xd8d0b8,
      beam: 0x3f4a42,
      rug: [0x3a2a4a, 0x4d3a63, 0xb98fe8, 0x3a2a4a],
      background: 0x1e2420,
      fog: 0x2f3a34,
      ambient: 1.9,
      hemiSky: 0xd8c9ff,
      hemiGround: 0x2a2f2a,
      fire: 0xffb060,
      lamp: 0xe8c9ff,
    },
    decor: {
      fireplace: false,
      bookshelf: true,
      bed: true,
      teaTable: true,
      lamps: true,
      plants: true,
      window: true,
    },
    signature: 'blossoms',
  },

  // ── Fate ──
  {
    id: 'fate',
    series: 'Fate',
    name: 'Camelot Hall',
    blurb: 'Banner-hung stone and a long table. Gold catches every torch.',
    palette: {
      floor: [0x5f5a50, 0x6a645a, 0x756e63, 0x544f46],
      wall: 0x3f4468,
      trim: 0xd8c48a,
      beam: 0x333750,
      rug: [0x2a3a7a, 0x3a4a92, 0xe0b64a, 0x2a3a7a],
      background: 0x22263e,
      fog: 0x333a58,
      ambient: 2.0,
      hemiSky: 0xffe8b8,
      hemiGround: 0x2e3148,
      fire: 0xffa845,
      lamp: 0xffd98a,
    },
    decor: {
      fireplace: true,
      bookshelf: true,
      bed: false,
      teaTable: true,
      lamps: true,
      plants: false,
      window: true,
    },
    signature: 'banners',
  },

  // ── Petal Academy ──
  {
    id: 'petal',
    series: 'Petal Academy',
    name: 'Academy Clubroom',
    blurb: 'Chalk dust, mismatched desks, and blossom light through the window.',
    palette: {
      floor: [0x9a7a56, 0xa6865f, 0xb29269, 0x8d6f4e],
      wall: 0xd8cfc0,
      trim: 0xb59a72,
      beam: 0x8a6f4c,
      rug: [0xe8a0c0, 0xf0b8d0, 0xfff0f6, 0xe8a0c0],
      background: 0x3a3038,
      fog: 0x5a4a52,
      ambient: 2.6,
      hemiSky: 0xfff0e0,
      hemiGround: 0x4a3c38,
      fire: 0xffb070,
      lamp: 0xffe0c0,
    },
    decor: {
      fireplace: false,
      bookshelf: true,
      bed: false,
      teaTable: true,
      lamps: true,
      plants: true,
      window: true,
    },
    signature: 'blossoms',
  },

  // ── Neon Circuit ──
  {
    id: 'neon',
    series: 'Neon Circuit',
    name: 'Neon Circuit Loft',
    blurb: 'Concrete, cables and city glow. An arcade cabinet never quite switches off.',
    palette: {
      floor: [0x33333e, 0x3b3b47, 0x44444f, 0x2c2c36],
      wall: 0x2a2a3a,
      trim: 0x3fc4d8,
      beam: 0x22222e,
      rug: [0x1a1a2a, 0x242440, 0x3fc4d8, 0x1a1a2a],
      background: 0x14141f,
      fog: 0x22223a,
      ambient: 1.7,
      hemiSky: 0xa8e8ff,
      hemiGround: 0x1a1a26,
      fire: 0xff4a8a,
      lamp: 0x6fe0ff,
    },
    decor: {
      fireplace: false,
      bookshelf: true,
      bed: true,
      teaTable: true,
      lamps: true,
      plants: false,
      window: true,
    },
    signature: 'arcade',
  },

  // ── Meadow Rest ──
  {
    id: 'meadow',
    series: 'Meadow Rest',
    name: 'Meadow Cottage',
    blurb: 'Whitewash, drying herbs and a fire that smells of applewood.',
    palette: {
      floor: [0x8a6a46, 0x96754f, 0xa28058, 0x7d5f3f],
      wall: 0xe4dcc8,
      trim: 0xa88a5c,
      beam: 0x6a5236,
      rug: [0x6a8a4a, 0x7fa05c, 0xe8dcc0, 0x6a8a4a],
      background: 0x2e2a22,
      fog: 0x4a4434,
      ambient: 2.4,
      hemiSky: 0xffeec8,
      hemiGround: 0x40382a,
      fire: 0xff9f45,
      lamp: 0xffd8a0,
    },
    decor: {
      fireplace: true,
      bookshelf: true,
      bed: true,
      teaTable: true,
      lamps: true,
      plants: true,
      window: true,
    },
    signature: 'herbStall',
  },

  // ── Camelot ──
  {
    id: 'camelot',
    series: 'Camelot',
    name: 'Camelot Study',
    blurb: 'A stone chamber off the great hall. Spell notes in every margin, and a cold hearth.',
    palette: {
      floor: [0x5f5a50, 0x6a645a, 0x756e63, 0x544f46],
      wall: 0x3f4468,
      trim: 0xd8c48a,
      beam: 0x333750,
      rug: [0x2a3a7a, 0x3a4a92, 0xe0b64a, 0x2a3a7a],
      background: 0x22263e,
      fog: 0x333a58,
      ambient: 1.9,
      hemiSky: 0xffe8b8,
      hemiGround: 0x2e3148,
      fire: 0xffa845,
      lamp: 0xffd98a,
    },
    decor: {
      fireplace: true,
      bookshelf: true,
      bed: false,
      teaTable: true,
      lamps: true,
      plants: false,
      window: true,
    },
    signature: 'banners',
  },

  // ── Wisteria ──
  {
    id: 'wisteria',
    series: 'Wisteria',
    name: 'Wisteria Estate Kitchen',
    blurb: 'A working kitchen with herbs in the rafters. Someone is always feeding someone here.',
    palette: {
      floor: [0x8a7a58, 0x96845f, 0xa28e67, 0x7d6e4f],
      wall: 0x2f3a34,
      trim: 0xd8d0b8,
      beam: 0x3f4a42,
      rug: [0x3a2a4a, 0x4d3a63, 0xb98fe8, 0x3a2a4a],
      background: 0x1e2420,
      fog: 0x2f3a34,
      ambient: 2.1,
      hemiSky: 0xd8c9ff,
      hemiGround: 0x2a2f2a,
      fire: 0xffb060,
      lamp: 0xe8c9ff,
    },
    decor: {
      fireplace: true,
      bookshelf: false,
      bed: false,
      teaTable: true,
      lamps: true,
      plants: true,
      window: true,
    },
    signature: 'herbStall',
  },
];

export const ROOM_BY_ID: Record<string, RoomDef> = Object.fromEntries(
  ROOMS.map((r) => [r.id, r]),
);

export const DEFAULT_ROOM: RoomDef = ROOM_BY_ID[DEFAULT_ROOM_ID];

/** The room a series' waifus live in, or undefined if the series has none. */
export function roomForSeries(series: string): RoomDef | undefined {
  return ROOMS.find((r) => r.series === series);
}
