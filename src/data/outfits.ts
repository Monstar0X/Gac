import type { HeroHairStyle } from './player';

/**
 * The MC wardrobe.
 *
 * Each outfit is a *homage*: a silhouette, palette and prop set that reads as
 * "that kind of anime protagonist" without reproducing any one character's
 * licensed design. The `vibe` line names the genre, never the show.
 *
 * Outfits are pure data. `engine/chibi-outfit.ts` knows how to draw every
 * garment shape, so adding a costume here needs no rendering code unless it
 * introduces a brand new shape.
 */

export type GarmentShape =
  | 'tee'
  | 'hoodie'
  | 'jacket'
  | 'coat'
  | 'gi'
  | 'uniform'
  | 'robe'
  | 'vest'
  | 'suit'
  | 'armor';

export type LegShape = 'pants' | 'shorts' | 'hakama' | 'tights';
export type GarmentPattern = 'plain' | 'checker' | 'stripes' | 'panels';
export type Glyph = 'flame' | 'wing' | 'swirl' | 'star' | 'cross' | 'diamond' | 'circle';
export type NeckKind = 'none' | 'scarf' | 'tie' | 'collar';
export type HeadPiece =
  | 'none'
  | 'headband'
  | 'strawhat'
  | 'cap'
  | 'goggles'
  | 'hood'
  | 'bandana'
  | 'tophat'
  | 'mask'
  | 'headset'
  | 'crown'
  | 'horns'
  | 'ribbon';
export type BackPiece =
  | 'none'
  | 'cape'
  | 'cloak'
  | 'swords'
  | 'greatsword'
  | 'pack'
  | 'haoriTails'
  | 'harness';
export type HipPiece = 'none' | 'sword' | 'swords';

export interface OutfitDef {
  id: string;
  name: string;
  /** Genre shorthand shown under the name. */
  vibe: string;
  blurb: string;
  rarity: 3 | 4 | 5;
  garment: {
    shape: GarmentShape;
    base: number;
    trim: number;
    /** Shirt or lining that shows at the collar and cuffs. */
    under?: number;
    pattern?: GarmentPattern;
    patternColor?: number;
    /** Leave the front open so `under` shows down the middle. */
    open?: boolean;
  };
  legs: { shape: LegShape; color: number; trim?: number; boots: number; socks?: number };
  belt?: { color: number; buckle?: number };
  neck?: { kind: NeckKind; color: number };
  emblem?: { glyph: Glyph; color: number; where: 'chest' | 'back' | 'hat' };
  head?: { piece: HeadPiece; color: number; trim?: number; plate?: number };
  back?: { piece: BackPiece; color: number; trim?: number };
  hip?: { piece: HipPiece; color: number };
  gloves?: number;
  /** A matching hairstyle, applied only when the player asks for it. */
  hair?: { style: HeroHairStyle; color: number; eye: number };
}

export const CUSTOM_OUTFIT_ID = 'custom';

const BLACK = 0x1a1a22;
const WHITE = 0xf4f4f8;

export const OUTFITS: OutfitDef[] = [
  {
    id: 'casual',
    name: 'Slate Hoodie',
    vibe: 'Slice of life',
    blurb: 'A soft grey hoodie, dark jeans and white sneakers. Nobody expects the protagonist.',
    rarity: 3,
    garment: { shape: 'hoodie', base: 0x6b7488, trim: 0x4a5266 },
    legs: { shape: 'pants', color: 0x34466a, boots: 0xeceef4 },
    hair: { style: 'messy', color: 0x4a3a2a, eye: 0x6b4a2a },
  },
  {
    id: 'student',
    name: 'Blazer Uniform',
    vibe: 'School romcom',
    blurb: 'Navy blazer, red tie, polished shoes. Exactly one dramatic rooftop scene away from fate.',
    rarity: 3,
    garment: { shape: 'uniform', base: 0x2a3355, trim: 0xd8d8e8, under: WHITE },
    legs: { shape: 'pants', color: 0x3a3f58, boots: 0x22222c },
    neck: { kind: 'tie', color: 0xc03040 },
    hair: { style: 'short', color: 0x2e2a35, eye: 0x4a3a2a },
  },
  {
    id: 'shinobi',
    name: 'Orange Shinobi Jumpsuit',
    vibe: 'Ninja shonen',
    blurb: 'Loud orange, navy shoulders and a forehead protector. Believes in it, loudly.',
    rarity: 4,
    garment: { shape: 'jacket', base: 0xf08a2c, trim: 0x2a3a8a, under: 0x2a3a8a },
    legs: { shape: 'pants', color: 0xf08a2c, trim: 0x2a3a8a, boots: 0x2a3a8a },
    head: { piece: 'headband', color: 0x2a4a9a, plate: 0xc8d0e0 },
    emblem: { glyph: 'swirl', color: 0xf4ecd8, where: 'back' },
    hair: { style: 'spiky', color: 0xf0d878, eye: 0x3a8ac0 },
  },
  {
    id: 'scout',
    name: 'Wall Scout Jacket',
    vibe: 'Military survival',
    blurb: 'Brown jacket, white trousers, leather straps and a green cloak with wings on the back.',
    rarity: 4,
    garment: { shape: 'jacket', base: 0x7a5a3a, trim: 0x4a3a28, under: WHITE },
    legs: { shape: 'pants', color: 0xe8e4d8, boots: 0x4a3626 },
    back: { piece: 'cloak', color: 0x4a6a3a, trim: 0x2f4a26 },
    emblem: { glyph: 'wing', color: 0xf4f4f8, where: 'back' },
    hip: { piece: 'swords', color: 0x9aa4b0 },
    belt: { color: 0xc8b890 },
    hair: { style: 'short', color: 0x6b4a2a, eye: 0x3a8a6a },
  },
  {
    id: 'slayer',
    name: 'Checkered Haori',
    vibe: 'Demon hunter',
    blurb: 'Green-and-black check over a dark uniform, with a plain sword at the hip.',
    rarity: 4,
    garment: {
      shape: 'robe',
      base: 0x1c1c26,
      trim: 0xf0f0f4,
      under: 0x1c1c26,
      pattern: 'checker',
      patternColor: 0x2a8a4a,
    },
    legs: { shape: 'hakama', color: 0x1c1c26, boots: 0x6a5a40, socks: WHITE },
    back: { piece: 'haoriTails', color: 0x2a8a4a, trim: 0x1c1c26 },
    belt: { color: 0x2a2a34 },
    hip: { piece: 'sword', color: 0x2a2a34 },
    hair: { style: 'messy', color: 0x6a2a2a, eye: 0xa8302a },
  },
  {
    id: 'otherworld',
    name: 'Black Track Jacket',
    vibe: 'Isekai underdog',
    blurb: 'A black tracksuit with orange stripes. Dies a lot, gets up every time.',
    rarity: 4,
    garment: {
      shape: 'jacket',
      base: 0x1f1f28,
      trim: 0xf0802c,
      under: WHITE,
      pattern: 'stripes',
      patternColor: 0xf0802c,
    },
    legs: { shape: 'pants', color: 0x2a2a36, trim: 0xf0802c, boots: 0xeceef4 },
    hair: { style: 'messy', color: 0x1a1a22, eye: 0x4a3a2a },
  },
  {
    id: 'swordsman',
    name: 'Black Swordsman Coat',
    vibe: 'Virtual-world duelist',
    blurb: 'A long black coat, fingerless gloves and a pair of blades crossed on the back.',
    rarity: 5,
    garment: { shape: 'coat', base: BLACK, trim: 0x3a3a48, under: 0x2a2a34 },
    legs: { shape: 'pants', color: 0x22222c, boots: 0x14141a },
    back: { piece: 'swords', color: 0xb8c4d4, trim: 0x2a2a34 },
    gloves: 0x2a2a34,
    hair: { style: 'messy', color: 0x1a1a22, eye: 0x2a2a3a },
  },
  {
    id: 'alchemist',
    name: 'Red Alchemist Coat',
    vibe: 'Alchemy adventure',
    blurb: 'A crimson coat with a flame sigil, white gloves and boots that have walked a long way.',
    rarity: 5,
    garment: { shape: 'coat', base: 0xa8222a, trim: 0xe8e0c8, under: BLACK },
    legs: { shape: 'pants', color: BLACK, boots: 0x2a2a34 },
    emblem: { glyph: 'flame', color: 0xf4f0e0, where: 'back' },
    gloves: WHITE,
    hair: { style: 'ponytail', color: 0xe0b64a, eye: 0xd8a02a },
  },
  {
    id: 'pirate',
    name: 'Straw Hat Rover',
    vibe: 'Pirate adventure',
    blurb: 'A red open vest, blue shorts, a yellow sash and a straw hat worth more than the ship.',
    rarity: 4,
    garment: { shape: 'vest', base: 0xc02a2a, trim: 0xe8c040 },
    legs: { shape: 'shorts', color: 0x3a5a9a, boots: 0x8a6a40 },
    belt: { color: 0xe8c040 },
    head: { piece: 'strawhat', color: 0xe8c870, trim: 0xc02a2a },
    hair: { style: 'messy', color: 0x1a1a22, eye: 0x2a2a3a },
  },
  {
    id: 'saiyan',
    name: 'Training Gi',
    vibe: 'Martial-arts shonen',
    blurb: 'Orange gi, blue undershirt and sash. Power level climbs whenever someone is hurt.',
    rarity: 5,
    garment: { shape: 'gi', base: 0xf08a2c, trim: 0xd06a1c, under: 0x2a4a9a },
    legs: { shape: 'pants', color: 0xf08a2c, boots: 0x2a4a9a, trim: 0x2a4a9a },
    belt: { color: 0x2a4a9a },
    emblem: { glyph: 'circle', color: 0xf4ecd8, where: 'back' },
    hair: { style: 'spiky', color: 0x1a1a22, eye: 0x2a2a3a },
  },
  {
    id: 'caped',
    name: 'Caped Hero Suit',
    vibe: 'Deadpan superhero',
    blurb: 'Yellow bodysuit, white cape, red gloves and boots. Wins in one hit, bored in zero.',
    rarity: 5,
    garment: { shape: 'suit', base: 0xf2d02c, trim: 0xd8aa18 },
    legs: { shape: 'tights', color: 0xf2d02c, boots: 0xc02a2a },
    belt: { color: WHITE, buckle: 0xd8aa18 },
    back: { piece: 'cape', color: 0xf0f0f4, trim: 0xc8c8d4 },
    gloves: 0xc02a2a,
    hair: { style: 'short', color: 0x1a1a22, eye: 0x2a2a3a },
  },
  {
    id: 'rookie',
    name: 'Rookie Hero Suit',
    vibe: 'Hero academy',
    blurb: 'A green bodysuit with white seams, a breathing mask and red boots, every size too big.',
    rarity: 4,
    garment: { shape: 'suit', base: 0x2a8a4a, trim: 0xe8f0e8, pattern: 'panels', patternColor: 0xe8f0e8 },
    legs: { shape: 'tights', color: 0x2a8a4a, trim: 0xe8f0e8, boots: 0xc02a2a },
    belt: { color: 0xe8e8e8, buckle: 0xc8c8c8 },
    head: { piece: 'mask', color: 0xb8bcc8, trim: 0x6a6e7a },
    gloves: 0xe8e8e8,
    hair: { style: 'messy', color: 0x2a6a4a, eye: 0x3aa860 },
  },
  {
    id: 'jujutsu',
    name: 'Dark Academy Uniform',
    vibe: 'Dark-fantasy student',
    blurb: 'A high-collared midnight uniform with silver buttons. Cheerful about terrible things.',
    rarity: 4,
    garment: { shape: 'uniform', base: 0x1c2038, trim: 0x8a90b0, under: 0x1c2038 },
    legs: { shape: 'pants', color: 0x1c2038, boots: 0x14141c },
    neck: { kind: 'collar', color: 0x2a3055 },
    hair: { style: 'spiky', color: 0xe8e8f0, eye: 0x6ab0e8 },
  },
  {
    id: 'plugsuit',
    name: 'Pilot Plugsuit',
    vibe: 'Mecha pilot',
    blurb: 'A skin-tight blue suit with white shoulder plates and a chest core that hums.',
    rarity: 4,
    garment: { shape: 'suit', base: 0x2a3a6a, trim: 0xf0f0f4, pattern: 'panels', patternColor: 0xf0f0f4 },
    legs: { shape: 'tights', color: 0x2a3a6a, trim: 0xf0f0f4, boots: 0xf0f0f4 },
    emblem: { glyph: 'diamond', color: 0x58e0f0, where: 'back' },
    head: { piece: 'headset', color: 0xf0802c },
    gloves: 0xf0f0f4,
    hair: { style: 'short', color: 0x2a2f55, eye: 0x6a4ab8 },
  },
  {
    id: 'shinigami',
    name: 'Reaper Robes',
    vibe: 'Spirit-blade shonen',
    blurb: 'Black kimono, white sash and a cleaver-sized blade across the back.',
    rarity: 5,
    garment: { shape: 'robe', base: 0x15151f, trim: 0xf0f0f4, under: WHITE },
    legs: { shape: 'hakama', color: 0x15151f, boots: 0xc8b890, socks: WHITE },
    belt: { color: WHITE },
    back: { piece: 'greatsword', color: 0xc8d0d8, trim: 0xf0f0f4 },
    hair: { style: 'spiky', color: 0xe86a2c, eye: 0x8a5a2a },
  },
  {
    id: 'trainer',
    name: 'Trainer Jacket',
    vibe: 'Creature collector',
    blurb: 'A red cap, a blue jacket with white sleeves and a yellow pack full of capture orbs.',
    rarity: 3,
    garment: { shape: 'jacket', base: 0x2a6ac0, trim: 0xf0f0f4, under: WHITE },
    legs: { shape: 'pants', color: 0x3a4a6a, boots: 0xd02a2a },
    head: { piece: 'cap', color: 0xd02a2a, trim: 0xf4f4f8 },
    back: { piece: 'pack', color: 0xe8c030, trim: 0xb88a18 },
    emblem: { glyph: 'circle', color: 0xf4f4f8, where: 'hat' },
    hair: { style: 'messy', color: 0x2a1f1a, eye: 0x6b4a2a },
  },
  {
    id: 'knight',
    name: 'Isekai Knight Plate',
    vibe: 'Fantasy knight',
    blurb: 'Silver plate over a blue tabard, a gold cross and a red cape. Summoned, then promoted.',
    rarity: 5,
    garment: { shape: 'armor', base: 0x9aa4b8, trim: 0xd0d8e8, under: 0x2a4a9a },
    legs: { shape: 'pants', color: 0x2a3a6a, boots: 0x7a8498 },
    emblem: { glyph: 'cross', color: 0xe8c040, where: 'chest' },
    back: { piece: 'cape', color: 0xa8222a, trim: 0x7a1a20 },
    hip: { piece: 'sword', color: 0x9aa4b8 },
    gloves: 0x7a8498,
    hair: { style: 'ponytail', color: 0xf0d878, eye: 0x3a8a4a },
  },
  {
    id: 'thief',
    name: 'Phantom Thief Suit',
    vibe: 'Gentleman thief',
    blurb: 'A white suit, blue-lined cape and top hat. The note always arrives before he does.',
    rarity: 5,
    garment: { shape: 'suit', base: WHITE, trim: 0xd0d4e4, under: WHITE },
    legs: { shape: 'pants', color: WHITE, boots: 0xe8e8f0 },
    neck: { kind: 'tie', color: 0x2a4aa8 },
    head: { piece: 'tophat', color: WHITE, trim: 0x2a4aa8 },
    back: { piece: 'cape', color: 0xf0f0f4, trim: 0x2a4aa8 },
    gloves: WHITE,
    hair: { style: 'messy', color: 0x2a2a3a, eye: 0x3a4a9a },
  },
  {
    id: 'mage',
    name: 'Grimoire Mage Cloak',
    vibe: 'Magic academy',
    blurb: 'A violet robe under a hooded star cloak. Mana is easy; confidence is the hard stat.',
    rarity: 4,
    garment: { shape: 'robe', base: 0x4a3a7a, trim: 0xe0c060, under: 0x2a2050 },
    legs: { shape: 'hakama', color: 0x2a2050, boots: 0x3a2a50 },
    back: { piece: 'cloak', color: 0x2a2050, trim: 0x1a1438 },
    head: { piece: 'hood', color: 0x2a2050, trim: 0x4a3a7a },
    emblem: { glyph: 'star', color: 0xf0d070, where: 'back' },
    belt: { color: 0xe0c060 },
    hair: { style: 'messy', color: 0x8a6ae0, eye: 0xe0c060 },
  },
];

export const OUTFIT_BY_ID: Record<string, OutfitDef> = Object.fromEntries(OUTFITS.map((o) => [o.id, o]));
