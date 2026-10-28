/**
 * Core domain types for the waifu collection game.
 *
 * Two waifu tiers:
 *  - featured : hand-authored waifu with a dedicated quest world (Mikasa, Rem, ...)
 *  - standard : filler waifu that only drops from the Luck Royale gacha
 */

export type Rarity = 3 | 4 | 5;

/** Visual biome of a quest world. */
export type ThemeId =
  | 'walls'
  | 'manor'
  | 'wasteland'
  | 'leaf'
  | 'bamboo'
  | 'camelot';

export type GiftTag =
  | 'sweet'
  | 'combat'
  | 'elegant'
  | 'cute'
  | 'rustic'
  | 'rare'
  | 'sporty'
  | 'cozy';

export type ItemKind = 'material' | 'poster' | 'relic' | 'cosmetic' | 'bundle';

export type CosmeticSlot = 'outfit' | 'hair' | 'accessory';

/** 3D prop silhouettes the model factory knows how to build. */
export type RelicShape =
  | 'muffler'
  | 'poster'
  | 'gear'
  | 'badge'
  | 'flail'
  | 'ribbon'
  | 'teacup'
  | 'horn'
  | 'headband'
  | 'key'
  | 'dogtag'
  | 'scale'
  | 'scroll'
  | 'sandals'
  | 'coupon'
  | 'muzzle'
  | 'haori'
  | 'blade'
  | 'sheath'
  | 'chalice'
  | 'banner'
  | 'seal'
  | 'lamp'
  | 'crystal';

export type PropKind =
  | 'pine'
  | 'tree'
  | 'rock'
  | 'bush'
  | 'crystal'
  | 'lamp'
  | 'wall'
  | 'house'
  | 'tower'
  | 'pillar'
  | 'bamboo'
  | 'wisteria'
  | 'ruin'
  | 'tent'
  | 'cactus'
  | 'snowman'
  | 'gate';

export type HairStyle =
  | 'long'
  | 'twin'
  | 'short'
  | 'bob'
  | 'ponytail'
  | 'hime'
  | 'braid';

export type Accessory =
  | 'scarf'
  | 'ribbon'
  | 'hornband'
  | 'headband'
  | 'oniHorn'
  | 'bamboo'
  | 'crown'
  | 'none';

export type WeaponKind = 'blade' | 'scythe' | 'spear' | 'fan' | 'flail' | 'none';

/** Everything the voxel/portrait factories need to draw a character. */
export interface CharacterSpec {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  eye: number;
  top: number;
  bottom: number;
  accent: number;
  accessory: Accessory;
  accessoryColor: number;
  weapon: WeaponKind;
  /** 0.9 = petite, 1.0 = standard, 1.1 = tall. */
  build: number;
  /** Draw with trousers instead of a skirt. */
  male?: boolean;
  /** Alternate outfit palettes unlocked by cosmetics. */
  outfitVariants?: { id: string; label: string; top: number; bottom: number; accent: number }[];
}

export interface RelicDef {
  id: string;
  name: string;
  desc: string;
  shape: RelicShape;
  color: number;
  glow: number;
}

export interface QuestDef {
  id: string;
  title: string;
  intro: string;
  primeName: string;
  primeHint: string;
  primeLine: string;
  relics: RelicDef[];
  reward: { crystals: number; coins: number; /** Quest-exclusive currency. */ royalTokens: number };
}

export interface Waifu {
  id: string;
  name: string;
  series: string;
  title: string;
  rarity: Rarity;
  /** Featured waifus own a quest world and a Luck Royale bundle. */
  featured: boolean;
  theme?: ThemeId;
  spec: CharacterSpec;
  bio: string;
  /** Gift tags this waifu likes; matching materials give bonus connection. */
  giftTags: GiftTag[];
  /** Lines shown as connection level rises. */
  dialogue: string[];
  quest?: QuestDef;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: Rarity;
  color: number;
  icon: RelicShape;
  desc: string;
  tags: GiftTag[];
  /** Themed waifu this item belongs to (undefined = universal). */
  waifuId?: string;
  slot?: CosmeticSlot;
  /** Soft-currency shop price. 0 = not purchasable. */
  price: number;
}

export interface ShopEntry {
  itemId: string;
  currency: 'coins' | 'crystals' | 'royalTokens';
  price: number;
  /** Stock per restock cycle, -1 = unlimited. */
  stock: number;
}

export interface PullResult {
  kind: 'waifu' | 'item' | 'bundle';
  waifuId?: string;
  itemId?: string;
  rarity: Rarity;
  /** Duplicate waifu converted into connection shards. */
  duplicate?: boolean;
  /** Duplicate bundle converted into crystals. */
  refund?: number;
  shards?: number;
}

export interface ConnectionState {
  level: number;
  xp: number;
}
