import type { CharacterSpec } from './types';
import { CUSTOM_OUTFIT_ID, OUTFIT_BY_ID, type BackPiece, type HeadPiece, type OutfitDef } from './outfits';

/**
 * The player avatar's appearance. Every field is independently choosable, so a
 * preset is only a starting point the player can pull apart piece by piece.
 *
 * The presets are named after the archetype each one evokes rather than any
 * single licensed character, which keeps the palette swappable.
 */

export type HeroHairStyle =
  | 'spiky'
  | 'messy'
  | 'short'
  | 'bob'
  | 'long'
  | 'ponytail'
  | 'hime'
  | 'twin'
  | 'braid'
  | 'mohawk';

export type HeroHeadgear =
  | 'none'
  | 'headband'
  | 'goggles'
  | 'strawhat'
  | 'hood'
  | 'crown'
  | 'ribbon'
  | 'horns'
  | 'mask'
  | 'bandana';

export type HeroBack = 'none' | 'cape' | 'scarf' | 'haori' | 'cloak' | 'pack';

export interface HeroAppearance {
  skin: number;
  hair: number;
  hairStyle: HeroHairStyle;
  eye: number;
  top: number;
  bottom: number;
  accent: number;
  headgear: HeroHeadgear;
  back: HeroBack;
  /** 0.9 = petite, 1.0 = standard, 1.1 = tall. */
  build: number;
  /** Wardrobe outfit id, or 'custom' to use the colour and gear pickers. */
  outfit?: string;
}

export interface HeroPreset {
  id: string;
  name: string;
  /** Short flavour line shown under the preset button. */
  blurb: string;
  appearance: HeroAppearance;
}

export const HERO_HAIR_STYLES: { id: HeroHairStyle; label: string }[] = [
  { id: 'spiky', label: 'Spiky' },
  { id: 'messy', label: 'Messy' },
  { id: 'short', label: 'Short' },
  { id: 'bob', label: 'Bob' },
  { id: 'long', label: 'Long' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'hime', label: 'Hime Cut' },
  { id: 'twin', label: 'Twintails' },
  { id: 'braid', label: 'Braid' },
  { id: 'mohawk', label: 'Mohawk' },
];

export const HERO_HEADGEAR: { id: HeroHeadgear; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'headband', label: 'Headband' },
  { id: 'goggles', label: 'Goggles' },
  { id: 'strawhat', label: 'Straw Hat' },
  { id: 'hood', label: 'Hood' },
  { id: 'crown', label: 'Crown' },
  { id: 'ribbon', label: 'Ribbon' },
  { id: 'horns', label: 'Horns' },
  { id: 'mask', label: 'Mask' },
  { id: 'bandana', label: 'Bandana' },
];

export const HERO_BACKS: { id: HeroBack; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'cape', label: 'Cape' },
  { id: 'scarf', label: 'Scarf' },
  { id: 'haori', label: 'Haori' },
  { id: 'cloak', label: 'Cloak' },
  { id: 'pack', label: 'Backpack' },
];

/** Skin ramp, light to deep. */
export const HERO_SKINS: number[] = [
  0xffe0c4, 0xf8d0ab, 0xf0c9a0, 0xe0b088, 0xc99268, 0xa9714c, 0x8a5836, 0x6b4028,
];

/** Hair colours: natural ramp plus the anime spectrum. */
export const HERO_HAIRS: number[] = [
  0x1a1a22, 0x2e2a35, 0x4a3a2a, 0x6b4a2a, 0x8a5a34, 0xb08050, 0xd8b070, 0xf0d878,
  0xe8e8f0, 0xc9d4e8, 0xa8c8f0, 0x7fb6e8, 0x4a7fc4, 0x3a4a9a, 0x6a4ab8, 0x9b6ae0,
  0xd06ab8, 0xf07aa8, 0xe84a6a, 0xc02030, 0xe86a2c, 0xf0a02c, 0x6ab84a, 0x3a8a5a,
];

/** Eye colours. */
export const HERO_EYES: number[] = [
  0x3a2a20, 0x4a3a2a, 0x6b4a2a, 0x4a6a9a, 0x3a8ac0, 0x3aa8a0, 0x5aa84a, 0x8a8a3a,
  0xc0a03a, 0xc06a2a, 0xa8202a, 0x9a4ac0, 0x6a6a8a, 0x9aa8b8, 0xd8d8e8, 0x2a2a3a,
];

/** Outfit colours, grouped warm → cool → neutral → vivid. */
export const HERO_COLORS: number[] = [
  0x2a2a3a, 0x3a3a4a, 0x4a4a5a, 0x5a5a6a, 0x6a6a7a, 0x8a8a9a, 0xb8b8c8, 0xe8e8f0,
  0x8a2a2a, 0xa8202a, 0xc03040, 0xe84a5a, 0xf07aa8, 0xd06ab8, 0x8a3a9a, 0x6a4ab8,
  0x3a4a9a, 0x2a6ac0, 0x3a8ac0, 0x3aa8c0, 0x2a8a7a, 0x3a8a4a, 0x5aa84a, 0x8aa83a,
  0xc0a03a, 0xe0b64a, 0xf0a02c, 0xe86a2c, 0xa86a2a, 0x7a5a3a, 0x5a4a3a, 0x4a3a2a,
];

export const HERO_BUILDS: { value: number; label: string }[] = [
  { value: 0.9, label: 'Petite' },
  { value: 1.0, label: 'Standard' },
  { value: 1.1, label: 'Tall' },
];

/** Archetype presets. Each evokes a hero type without naming a licensed one. */
export const HERO_PRESETS: HeroPreset[] = [
  {
    id: 'shonen',
    name: 'Shonen Lead',
    blurb: 'Bright spiky hair, loud jacket, never gives up.',
    appearance: {
      skin: 0xf0c9a0,
      hair: 0xf0d878,
      hairStyle: 'spiky',
      eye: 0x3a8ac0,
      top: 0xe86a2c,
      bottom: 0x2a6ac0,
      accent: 0x2a2a3a,
      headgear: 'headband',
      back: 'none',
      build: 1.0,
    },
  },
  {
    id: 'scout',
    name: 'Wall Scout',
    blurb: 'Short brown hair, green cloak, harness straps.',
    appearance: {
      skin: 0xf8d0ab,
      hair: 0x6b4a2a,
      hairStyle: 'short',
      eye: 0x6a6a8a,
      top: 0x8a6a4a,
      bottom: 0xe8e8f0,
      accent: 0x3a5a3a,
      headgear: 'none',
      back: 'cloak',
      build: 1.05,
    },
  },
  {
    id: 'slayer',
    name: 'Demon Slayer',
    blurb: 'Dark red hair, checkered haori, hanafuda earrings.',
    appearance: {
      skin: 0xf0c9a0,
      hair: 0x8a2a2a,
      hairStyle: 'messy',
      eye: 0xa8202a,
      top: 0x2a2a3a,
      bottom: 0x2a2a3a,
      accent: 0x3a8a4a,
      headgear: 'none',
      back: 'haori',
      build: 1.0,
    },
  },
  {
    id: 'otherworlder',
    name: 'Otherworlder',
    blurb: 'Black messy hair, orange tracksuit, no luck at all.',
    appearance: {
      skin: 0xf8d0ab,
      hair: 0x1a1a22,
      hairStyle: 'messy',
      eye: 0x4a3a2a,
      top: 0xf0a02c,
      bottom: 0x2a2a3a,
      accent: 0xe8e8f0,
      headgear: 'none',
      back: 'none',
      build: 1.0,
    },
  },
  {
    id: 'pilot',
    name: 'Franxx Pilot',
    blurb: 'Pale pink hair, red flight suit, twin horns.',
    appearance: {
      skin: 0xffe0c4,
      hair: 0xf07aa8,
      hairStyle: 'long',
      eye: 0x3aa8c0,
      top: 0xa8202a,
      bottom: 0x8a2a2a,
      accent: 0xe8e8f0,
      headgear: 'horns',
      back: 'none',
      build: 1.0,
    },
  },
  {
    id: 'knight',
    name: 'Court Knight',
    blurb: 'Golden hair, silver plate, a blade with no sheath.',
    appearance: {
      skin: 0xf8d0ab,
      hair: 0xf0d878,
      hairStyle: 'ponytail',
      eye: 0x3a8a4a,
      top: 0xb8b8c8,
      bottom: 0x3a4a9a,
      accent: 0xc0a03a,
      headgear: 'crown',
      back: 'cape',
      build: 1.05,
    },
  },
  {
    id: 'mage',
    name: 'Royal Mage',
    blurb: 'Silver hair, deep violet robe, too many books.',
    appearance: {
      skin: 0xffe0c4,
      hair: 0xe8e8f0,
      hairStyle: 'long',
      eye: 0x9a4ac0,
      top: 0x6a4ab8,
      bottom: 0x3a3a4a,
      accent: 0xc0a03a,
      headgear: 'hood',
      back: 'cloak',
      build: 0.95,
    },
  },
  {
    id: 'ninja',
    name: 'Shadow Ninja',
    blurb: 'Dark hood, wrapped mask, quiet footsteps.',
    appearance: {
      skin: 0xe0b088,
      hair: 0x2e2a35,
      hairStyle: 'spiky',
      eye: 0x2a2a3a,
      top: 0x3a3a4a,
      bottom: 0x2a2a3a,
      accent: 0xa8202a,
      headgear: 'mask',
      back: 'none',
      build: 1.0,
    },
  },
  {
    id: 'samurai',
    name: 'Wandering Samurai',
    blurb: 'Topknot, straw hat, a well-worn haori.',
    appearance: {
      skin: 0xe0b088,
      hair: 0x2a2a3a,
      hairStyle: 'ponytail',
      eye: 0x4a3a2a,
      top: 0x5a4a3a,
      bottom: 0x4a4a5a,
      accent: 0xc03040,
      headgear: 'strawhat',
      back: 'haori',
      build: 1.05,
    },
  },
  {
    id: 'royal',
    name: 'Crown Princess',
    blurb: 'Long pale hair, jewel tones, absolutely in charge.',
    appearance: {
      skin: 0xffe0c4,
      hair: 0xf0d878,
      hairStyle: 'hime',
      eye: 0x9a4ac0,
      top: 0xd06ab8,
      bottom: 0x8a3a9a,
      accent: 0xc0a03a,
      headgear: 'ribbon',
      back: 'cape',
      build: 0.95,
    },
  },
  {
    id: 'scholar',
    name: 'Meadow Scholar',
    blurb: 'Soft braid, green layers, always carrying a book.',
    appearance: {
      skin: 0xf8d0ab,
      hair: 0xb08050,
      hairStyle: 'braid',
      eye: 0x5aa84a,
      top: 0x3a8a4a,
      bottom: 0x8a8a9a,
      accent: 0xe0b64a,
      headgear: 'goggles',
      back: 'pack',
      build: 0.95,
    },
  },
  {
    id: 'circuit',
    name: 'Neon Runner',
    blurb: 'Twin blue tails, lit accents, quick on her feet.',
    appearance: {
      skin: 0xf0c9a0,
      hair: 0x3a8ac0,
      hairStyle: 'twin',
      eye: 0x3aa8c0,
      top: 0x2a2a3a,
      bottom: 0x3a4a9a,
      accent: 0x3aa8c0,
      headgear: 'goggles',
      back: 'pack',
      build: 0.95,
    },
  },
];

export const HERO_PRESET_BY_ID: Record<string, HeroPreset> = Object.fromEntries(
  HERO_PRESETS.map((p) => [p.id, p]),
);

export const DEFAULT_HERO: HeroAppearance = {
  skin: 0xffe0c4,
  hair: 0x4a3a2a,
  hairStyle: 'messy',
  eye: 0x6b4a2a,
  top: 0x6b7488,
  bottom: 0x34466a,
  accent: 0x4a5266,
  headgear: 'none',
  back: 'none',
  build: 1.0,
  outfit: 'casual',
};

/** Clamp a stored appearance back into the catalogue, tolerating bad saves. */
export function normalizeHero(raw: Partial<HeroAppearance> | undefined): HeroAppearance {
  const base = DEFAULT_HERO;
  if (!raw) return { ...base };
  const style = HERO_HAIR_STYLES.some((s) => s.id === raw.hairStyle) ? raw.hairStyle! : base.hairStyle;
  const gear = HERO_HEADGEAR.some((g) => g.id === raw.headgear) ? raw.headgear! : base.headgear;
  const back = HERO_BACKS.some((b) => b.id === raw.back) ? raw.back! : base.back;
  const num = (v: unknown, fallback: number) =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return {
    skin: num(raw.skin, base.skin),
    hair: num(raw.hair, base.hair),
    hairStyle: style,
    eye: num(raw.eye, base.eye),
    top: num(raw.top, base.top),
    bottom: num(raw.bottom, base.bottom),
    accent: num(raw.accent, base.accent),
    headgear: gear,
    back,
    build: num(raw.build, base.build),
    outfit:
      raw.outfit === CUSTOM_OUTFIT_ID || (raw.outfit && OUTFIT_BY_ID[raw.outfit])
        ? raw.outfit
        : // saves from before the wardrobe keep their own colours
          raw.top !== undefined
          ? CUSTOM_OUTFIT_ID
          : base.outfit,
  };
}

const HEAD_MAP: Record<HeroHeadgear, HeadPiece> = {
  none: 'none', headband: 'headband', goggles: 'goggles', strawhat: 'strawhat', hood: 'hood',
  crown: 'crown', ribbon: 'ribbon', horns: 'horns', mask: 'mask', bandana: 'bandana',
};
const BACK_MAP: Record<HeroBack, BackPiece> = {
  none: 'none', cape: 'cape', scarf: 'none', haori: 'haoriTails', cloak: 'cloak', pack: 'pack',
};

/** Build a costume from the colour and gear pickers ("custom fit"). */
export function customOutfit(hero: HeroAppearance): OutfitDef {
  return {
    id: CUSTOM_OUTFIT_ID,
    name: 'Custom Fit',
    vibe: 'Your own colours',
    blurb: 'Pick every colour and piece yourself.',
    rarity: 3,
    garment: { shape: 'jacket', base: hero.top, trim: hero.accent, under: hero.accent },
    legs: { shape: 'pants', color: hero.bottom, boots: hero.accent },
    neck: hero.back === 'scarf' ? { kind: 'scarf', color: hero.accent } : undefined,
    head: { piece: HEAD_MAP[hero.headgear], color: hero.accent, trim: hero.top, plate: 0xc8d0e0 },
    back: { piece: BACK_MAP[hero.back], color: hero.accent, trim: hero.top },
  };
}

/** The costume the hero is currently wearing. */
export function heroOutfit(hero: HeroAppearance): OutfitDef {
  const o = hero.outfit && OUTFIT_BY_ID[hero.outfit];
  return o || customOutfit(hero);
}

/**
 * The hero seen through the same lens as the waifus, so portrait and sprite
 * factories can draw them with the shared code path.
 */
export function heroToSpec(hero: HeroAppearance): Omit<CharacterSpec, 'hairStyle'> & { hairStyle: HeroHairStyle; male: true } {
  return {
    skin: hero.skin,
    hair: hero.hair,
    hairStyle: hero.hairStyle,
    eye: hero.eye,
    top: hero.top,
    bottom: hero.bottom,
    accent: hero.accent,
    accessory: 'none',
    accessoryColor: hero.accent,
    weapon: 'none',
    build: hero.build,
    male: true,
    };
}
