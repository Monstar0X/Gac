import type { GiftTag, ItemDef, ShopEntry, Waifu } from './types';
import { FEATURED_WAIFUS, WAIFU_BY_ID } from './waifus';

/** Universal materials — drop from every Luck Royale pull and appear in the shop. */
export const UNIVERSAL_ITEMS: ItemDef[] = [
  // ── Materials (gift / connection fuel) ──
  {
    id: 'mat_stardust',
    name: 'Stardust',
    kind: 'material',
    rarity: 3,
    color: 0xd8d0ff,
    icon: 'seal',
    desc: 'Fine glittering dust. The base of every ritual.',
    tags: ['rare'],
    price: 60,
  },
  {
    id: 'mat_candy',
    name: 'Cloud Candy',
    kind: 'material',
    rarity: 3,
    color: 0xffb8d8,
    icon: 'chalice',
    desc: 'A puff of spun sugar. Melts on the tongue.',
    tags: ['sweet', 'cute'],
    price: 45,
  },
  {
    id: 'mat_tealeaf',
    name: 'Silver Tealeaf',
    kind: 'material',
    rarity: 3,
    color: 0x9fd88a,
    icon: 'scroll',
    desc: 'A quiet evening in leaf form.',
    tags: ['cozy', 'elegant'],
    price: 55,
  },
  {
    id: 'mat_ribbonspool',
    name: 'Ribbon Spool',
    kind: 'material',
    rarity: 3,
    color: 0xe86a9a,
    icon: 'ribbon',
    desc: 'Enough ribbon to tie a hundred small bows.',
    tags: ['cute'],
    price: 50,
  },
  {
    id: 'mat_whetstone',
    name: 'Whetstone',
    kind: 'material',
    rarity: 4,
    color: 0x8a8f99,
    icon: 'gear',
    desc: 'Keeps an edge true. A soldier\'s idea of a gift.',
    tags: ['combat', 'sporty'],
    price: 90,
  },
  {
    id: 'mat_lantern',
    name: 'Paper Lantern',
    kind: 'material',
    rarity: 4,
    color: 0xffd75e,
    icon: 'lamp',
    desc: 'Soft warm light. Good for late walks home.',
    tags: ['cozy', 'rustic'],
    price: 110,
  },
  {
    id: 'mat_pressedflower',
    name: 'Pressed Flower',
    kind: 'material',
    rarity: 4,
    color: 0xb98fe8,
    icon: 'scale',
    desc: 'Kept between the pages of something important.',
    tags: ['elegant', 'sweet'],
    price: 130,
  },
  {
    id: 'mat_runningboots',
    name: 'Running Boots',
    kind: 'material',
    rarity: 4,
    color: 0xff6b3a,
    icon: 'sandals',
    desc: 'Broken in over a thousand mornings.',
    tags: ['sporty', 'combat'],
    price: 150,
  },

  // ── Posters (universal flavour) ──
  {
    id: 'post_generic_1',
    name: 'Academy Poster',
    kind: 'poster',
    rarity: 3,
    color: 0xd8e8f8,
    icon: 'poster',
    desc: 'A club recruitment poster. Somebody drew a moustache on it.',
    tags: ['cute'],
    price: 0,
  },
  {
    id: 'post_generic_2',
    name: 'Festival Poster',
    kind: 'poster',
    rarity: 4,
    color: 0xffd9a0,
    icon: 'poster',
    desc: 'Summer festival, printed in four faded colours.',
    tags: ['rustic', 'sweet'],
    price: 0,
  },
  {
    id: 'post_generic_3',
    name: 'Night Sky Poster',
    kind: 'poster',
    rarity: 5,
    color: 0x6a6ad8,
    icon: 'poster',
    desc: 'A long-exposure sky. Somebody wrote a date on the back.',
    tags: ['elegant', 'rare'],
    price: 0,
  },

  // ── Cosmetics (universal) ──
  {
    id: 'cos_star_hairpin',
    name: 'Star Hairpin',
    kind: 'cosmetic',
    rarity: 4,
    color: 0xffd75e,
    icon: 'badge',
    desc: 'A small gold star. Works with anything.',
    tags: ['cute'],
    slot: 'accessory',
    price: 400,
  },
  {
    id: 'cos_wool_scarf',
    name: 'Wool Scarf',
    kind: 'cosmetic',
    rarity: 4,
    color: 0xc45a5a,
    icon: 'muffler',
    desc: 'Hand-knitted, slightly lumpy, very warm.',
    tags: ['cozy'],
    slot: 'accessory',
    price: 450,
  },
  {
    id: 'cos_petalframe',
    name: 'Petal Frame',
    kind: 'cosmetic',
    rarity: 5,
    color: 0xff9ec4,
    icon: 'badge',
    desc: 'A gilded portrait frame for the roster. Purely decorative.',
    tags: ['elegant'],
    slot: 'accessory',
    price: 900,
  },
];

/** Per-waifu themed items: the four quest relics plus signature cosmetics. */
const THEMED_TEMPLATES: {
  waifuId: string;
  cosmetics: { id: string; name: string; desc: string; slot: ItemDef['slot']; color: number; icon: ItemDef['icon']; tags: GiftTag[]; price: number }[];
  extras: { id: string; name: string; desc: string; color: number; icon: ItemDef['icon']; tags: GiftTag[]; price: number }[];
}[] = [
  {
    waifuId: 'mikasa',
    cosmetics: [
      { id: 'cos_mikasa_scout', name: 'Survey Corps Jacket', desc: 'Wings of Freedom on the back.', slot: 'outfit', color: 0x6f7a4a, icon: 'haori', tags: ['combat'], price: 700 },
      { id: 'cos_mikasa_short', name: 'Cropped Cut', desc: 'Practical. Unbothered.', slot: 'hair', color: 0x1a1a22, icon: 'seal', tags: ['combat'], price: 600 },
      { id: 'cos_mikasa_blade', name: 'Twin Blades', desc: 'Ultrahard steel, paired.', slot: 'accessory', color: 0xb8bcc4, icon: 'blade', tags: ['combat'], price: 800 },
    ],
    extras: [
      { id: 'mat_mikasa_wire', name: 'Steel Wire', desc: 'Spare gas-hook cable.', color: 0xb8bcc4, icon: 'gear', tags: ['combat'], price: 140 },
      { id: 'mat_mikasa_emblem', name: 'Wings Patch', desc: 'A stitched corps patch.', color: 0x9fd8ff, icon: 'badge', tags: ['combat'], price: 160 },
    ],
  },
  {
    waifuId: 'rem',
    cosmetics: [
      { id: 'cos_rem_maid', name: 'Maid Uniform', desc: 'Pressed, pleated, perfect.', slot: 'outfit', color: 0xf4f4f8, icon: 'haori', tags: ['elegant'], price: 700 },
      { id: 'cos_rem_oni', name: 'Oni Awakening', desc: 'Horn released. Eyes glowing.', slot: 'hair', color: 0x6fc4e8, icon: 'horn', tags: ['rare'], price: 850 },
      { id: 'cos_rem_flail', name: 'Morningstar', desc: 'A heavy gift for a heavy hitter.', slot: 'accessory', color: 0x6a7080, icon: 'flail', tags: ['combat'], price: 800 },
    ],
    extras: [
      { id: 'mat_rem_sugar', name: 'Rock Sugar', desc: 'For the tea. Two cubes, always.', color: 0xf8f8ff, icon: 'chalice', tags: ['sweet'], price: 140 },
      { id: 'mat_rem_lace', name: 'Maid Lace', desc: 'A scrap of white trim.', color: 0xf4f4f8, icon: 'ribbon', tags: ['elegant'], price: 160 },
    ],
  },
  {
    waifuId: 'zerotwo',
    cosmetics: [
      { id: 'cos_zero_suit', name: 'Pilot Suit', desc: 'Red, sleek, built for a cockpit.', slot: 'outfit', color: 0xe83a5a, icon: 'haori', tags: ['combat'], price: 700 },
      { id: 'cos_zero_horns', name: 'Klaxosaur Horns', desc: 'Red horns, plainly visible.', slot: 'accessory', color: 0xff4a6a, icon: 'horn', tags: ['rare'], price: 850 },
      { id: 'cos_zero_long', name: 'Loose Pink Hair', desc: 'Down and past her shoulders.', slot: 'hair', color: 0xff9ec4, icon: 'seal', tags: ['sweet'], price: 600 },
    ],
    extras: [
      { id: 'mat_zero_fuel', name: 'Franxx Fuel', desc: 'Magma energy, bottled.', color: 0xff6b7d, icon: 'crystal', tags: ['rare'], price: 180 },
      { id: 'mat_zero_honey', name: 'Honey Jar', desc: 'She eats it with a spoon.', color: 0xffd75e, icon: 'chalice', tags: ['sweet'], price: 140 },
    ],
  },
  {
    waifuId: 'hinata',
    cosmetics: [
      { id: 'cos_hinata_jacket', name: 'Orange Jacket', desc: 'Borrowed and never returned.', slot: 'outfit', color: 0xe8862c, icon: 'haori', tags: ['sporty'], price: 700 },
      { id: 'cos_hinata_hime', name: 'Loose Hime Cut', desc: 'Long, straight, immaculate.', slot: 'hair', color: 0x3a3a6a, icon: 'seal', tags: ['elegant'], price: 600 },
      { id: 'cos_hinata_byakugan', name: 'Byakugan Lenses', desc: 'Pale eyes, all-seeing.', slot: 'accessory', color: 0xe8e8f4, icon: 'seal', tags: ['rare'], price: 850 },
    ],
    extras: [
      { id: 'mat_hinata_herb', name: 'Herb Salve', desc: 'For training bruises.', color: 0x8ac46a, icon: 'scroll', tags: ['rustic'], price: 140 },
      { id: 'mat_hinata_kunai', name: 'Practice Kunai', desc: 'Blunted, well used.', color: 0xb8bcc4, icon: 'blade', tags: ['combat'], price: 170 },
    ],
  },
  {
    waifuId: 'nezuko',
    cosmetics: [
      { id: 'cos_nezuko_haori', name: 'Checkered Haori', desc: 'Green and cream checks.', slot: 'outfit', color: 0x3a5a3a, icon: 'haori', tags: ['cozy'], price: 700 },
      { id: 'cos_nezuko_long', name: 'Loose Long Hair', desc: 'Pink-tipped, always untied.', slot: 'hair', color: 0x2a1a1a, icon: 'seal', tags: ['cute'], price: 600 },
      { id: 'cos_nezuko_bamboo', name: 'Carved Muzzle', desc: 'Tied with red cord.', slot: 'accessory', color: 0xd8c48a, icon: 'muzzle', tags: ['cute'], price: 800 },
    ],
    extras: [
      { id: 'mat_nezuko_mochi', name: 'Sweet Mochi', desc: 'Chewy, pink, gone fast.', color: 0xffb8d8, icon: 'chalice', tags: ['sweet'], price: 140 },
      { id: 'mat_nezuko_wisteria', name: 'Wisteria Sprig', desc: 'Keeps the bad dreams away.', color: 0xb98fe8, icon: 'scale', tags: ['rare'], price: 180 },
    ],
  },
  {
    waifuId: 'saber',
    cosmetics: [
      { id: 'cos_saber_armor', name: 'Silver Armour', desc: 'Plate and blue velvet.', slot: 'outfit', color: 0x2a3a8a, icon: 'haori', tags: ['elegant'], price: 700 },
      { id: 'cos_saber_braid', name: 'Royal Braid', desc: 'Golden, braided, crowned.', slot: 'hair', color: 0xf0d878, icon: 'seal', tags: ['elegant'], price: 600 },
      { id: 'cos_saber_excalibur', name: 'Excalibur', desc: 'The sword of promised victory.', slot: 'accessory', color: 0xe0b64a, icon: 'blade', tags: ['combat'], price: 900 },
    ],
    extras: [
      { id: 'mat_saber_steel', name: 'Camelot Steel', desc: 'Folded a hundred times.', color: 0xb8bcc4, icon: 'gear', tags: ['combat'], price: 170 },
      { id: 'mat_saber_wine', name: 'Golden Chalice Wine', desc: 'She will not drink it. Buy it anyway.', color: 0xe0b64a, icon: 'chalice', tags: ['elegant'], price: 190 },
    ],
  },
];

function buildThemedItems(): ItemDef[] {
  const out: ItemDef[] = [];
  for (const t of THEMED_TEMPLATES) {
    const waifu = WAIFU_BY_ID[t.waifuId];
    if (!waifu) continue;

    // Quest relics become collectible items once the quest is done.
    for (const relic of waifu.quest?.relics ?? []) {
      out.push({
        id: relic.id,
        name: relic.name,
        kind: 'relic',
        rarity: 5,
        color: relic.color,
        icon: relic.shape,
        desc: relic.desc,
        tags: waifu.giftTags,
        waifuId: waifu.id,
        price: 0,
      });
    }

    // Signature poster for every featured waifu.
    out.push({
      id: `post_${waifu.id}`,
      name: `${waifu.name} Poster`,
      kind: 'poster',
      rarity: waifu.rarity,
      color: waifu.spec.accent,
      icon: 'poster',
      desc: `A printed poster of ${waifu.name}. Hangs nicely in the room.`,
      tags: waifu.giftTags,
      waifuId: waifu.id,
      price: 0,
    });

    for (const c of t.cosmetics) {
      out.push({
        id: c.id,
        name: c.name,
        kind: 'cosmetic',
        rarity: 5,
        color: c.color,
        icon: c.icon,
        desc: c.desc,
        tags: c.tags,
        waifuId: waifu.id,
        slot: c.slot,
        price: c.price,
      });
    }

    for (const e of t.extras) {
      out.push({
        id: e.id,
        name: e.name,
        kind: 'material',
        rarity: 4,
        color: e.color,
        icon: e.icon,
        desc: e.desc,
        tags: e.tags,
        waifuId: waifu.id,
        price: e.price,
      });
    }
  }
  return out;
}

export const THEMED_ITEMS: ItemDef[] = buildThemedItems();

/**
 * Royal goods: the only items priced in Royal Tokens. Materials here are the
 * strongest gifts in the game, so the quiz and quests have a meaningful sink.
 */
export const ROYAL_ITEMS: ItemDef[] = [
  {
    id: 'royal_elixir',
    name: 'Royal Elixir',
    kind: 'material',
    rarity: 5,
    color: 0xe0b64a,
    icon: 'chalice',
    desc: 'A golden draught brewed for the court. The strongest connection gift there is.',
    tags: ['elegant', 'rare', 'sweet', 'cozy', 'rustic', 'combat', 'sporty', 'cute'],
    price: 240,
  },
  {
    id: 'royal_relic',
    name: 'Sealed Royal Relic',
    kind: 'material',
    rarity: 5,
    color: 0x9fd8ff,
    icon: 'crystal',
    desc: 'An unopened relic from the royal vault. Prized by every kind of waifu.',
    tags: ['rare', 'elegant', 'combat'],
    price: 320,
  },
  {
    id: 'royal_crown',
    name: 'Circlet of the Crown',
    kind: 'cosmetic',
    rarity: 5,
    color: 0xe0b64a,
    icon: 'chalice',
    desc: 'A gold circlet worn at the brow. Fits any waifu, any series.',
    tags: ['elegant', 'rare'],
    slot: 'accessory',
    price: 500,
  },
  {
    id: 'royal_cloak',
    name: 'Royal Cloak',
    kind: 'cosmetic',
    rarity: 5,
    color: 0x6a4a9a,
    icon: 'banner',
    desc: 'A deep violet cloak trimmed in gold thread.',
    tags: ['elegant', 'rare'],
    slot: 'outfit',
    price: 620,
  },
];

export const ITEMS: ItemDef[] = [...UNIVERSAL_ITEMS, ...THEMED_ITEMS, ...ROYAL_ITEMS];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
);

export const MATERIALS = ITEMS.filter((i) => i.kind === 'material');
export const POSTERS = ITEMS.filter((i) => i.kind === 'poster');
export const RELICS = ITEMS.filter((i) => i.kind === 'relic');
export const COSMETICS = ITEMS.filter((i) => i.kind === 'cosmetic');

/** Gift tags a material can satisfy, used by the connection calculator. */
export function materialTags(itemId: string): GiftTag[] {
  return ITEM_BY_ID[itemId]?.tags ?? [];
}

export function isFavoriteGift(waifu: Waifu, itemId: string): boolean {
  const tags = materialTags(itemId);
  return tags.some((t) => waifu.giftTags.includes(t));
}

/** Store stock: universal goods are unlimited, themed goods are limited. */
export const SHOP: ShopEntry[] = [
  ...ROYAL_ITEMS.map<ShopEntry>((i) => ({
    itemId: i.id,
    currency: 'royalTokens',
    price: i.price,
    stock: -1,
  })),
  ...UNIVERSAL_ITEMS.filter((i) => i.price > 0).map<ShopEntry>((i) => ({
    itemId: i.id,
    currency: 'coins',
    price: i.price,
    stock: -1,
  })),
  ...THEMED_ITEMS.filter((i) => i.kind === 'material' && i.price > 0).map<ShopEntry>((i) => ({
    itemId: i.id,
    currency: 'coins',
    price: i.price,
    stock: 5,
  })),
  ...THEMED_ITEMS.filter((i) => i.kind === 'cosmetic').map<ShopEntry>((i) => ({
    itemId: i.id,
    currency: 'coins',
    price: i.price,
    stock: 1,
  })),
];

/** Crystals buy the featured Luck Royale bundles. */
export const BUNDLE_PRICES: Record<string, number> = {
  coins_1: 0,
};

export const CURRENCY_PACKS: { id: string; label: string; coins: number; crystals: number; cost: string }[] = [
  { id: 'daily', label: 'Daily Ration', coins: 500, crystals: 0, cost: 'free' },
  { id: 'scout', label: 'Scout Supply', coins: 2500, crystals: 0, cost: 'free' },
  { id: 'royal', label: 'Royal Chest', coins: 0, crystals: 300, cost: 'free' },
];

export { FEATURED_WAIFUS };
