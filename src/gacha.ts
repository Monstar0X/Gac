import type { ItemDef, PullResult, Rarity, Waifu } from '../data/types';
import { ITEMS, ITEM_BY_ID, MATERIALS } from '../data/items';
import { FEATURED_WAIFUS, WAIFU_BY_ID, WAIFUS } from '../data/waifus';

/**
 * A bundle is the themed key that unlocks a featured waifu's quest world.
 * Bundles are the headline prize of the Luck Royale; every other pull yields
 * materials, posters or a standard waifu.
 */
export interface Bundle {
  id: string;
  name: string;
  series: string;
  /** Featured waifu whose quest world this bundle unlocks. */
  waifuId: string;
  accent: number;
  tagline: string;
  /** Item pools: themed first, then universal fallback. */
  poolItems: string[];
  /** Waifu pool: standard waifus that can drop alongside the bundle. */
  poolWaifus: string[];
  /** Bundle id doubles as an inventory item id. */
  itemId: string;
}

export const RATES = {
  /** Chance the headline prize (the bundle) drops on a single pull. */
  bundle: 0.018,
  fiveStar: 0.05,
  fourStar: 0.33,
} as const;

export const PITY = {
  /** Guaranteed bundle after this many pulls without one. */
  bundle: 80,
  /** Guaranteed 4★ or better after this many pulls. */
  fourStar: 10,
} as const;

export const PULL_COST = { single: 60, ten: 540 } as const;

export function buildBundles(): Bundle[] {
  return FEATURED_WAIFUS.map((w) => {
    const themed = ITEMS.filter((i) => i.waifuId === w.id).map((i) => i.id);
    const universal = ITEMS.filter((i) => !i.waifuId).map((i) => i.id);
    return {
      id: `bundle_${w.id}`,
      itemId: `bundle_${w.id}`,
      name: `${w.name} Bundle`,
      series: w.series,
      waifuId: w.id,
      accent: w.spec.accent,
      tagline: `${w.series} · unlocks her quest world`,
      poolItems: [...themed, ...universal],
      poolWaifus: WAIFUS.filter((x) => !x.featured).map((x) => x.id),
    };
  });
}

export const BUNDLES = buildBundles();
export const BUNDLE_BY_ID: Record<string, Bundle> = Object.fromEntries(
  BUNDLES.map((b) => [b.id, b]),
);

/** Inventory definition for a bundle, so it can sit in the player's bag. */
export function bundleItemDef(b: Bundle): ItemDef {
  const w = WAIFU_BY_ID[b.waifuId];
  return {
    id: b.itemId,
    name: b.name,
    kind: 'bundle',
    rarity: 5,
    color: b.accent,
    icon: 'key',
    desc: `Unlocks the ${w?.quest?.title ?? 'quest'} world. Head to Quests to begin.`,
    tags: ['rare'],
    waifuId: b.waifuId,
    price: 0,
  };
}

/** Bundle items, registered into the shared item lookup. */
export const BUNDLE_ITEMS: ItemDef[] = BUNDLES.map(bundleItemDef);
for (const bi of BUNDLE_ITEMS) ITEM_BY_ID[bi.id] = bi;

export interface GachaState {
  pityBundle: number;
  pityFourStar: number;
  totalPulls: number;
}

export function newGachaState(): GachaState {
  return { pityBundle: 0, pityFourStar: 0, totalPulls: 0 };
}

export interface GachaContext {
  ownedWaifus: Set<string>;
  /** Item ids the player already owns at least one of (bundles included). */
  ownedItems: Set<string>;
}

function pickRarity(state: GachaState, rng: () => number): Rarity {
  const roll = rng();
  if (roll < RATES.fiveStar) return 5;
  if (roll < RATES.fiveStar + RATES.fourStar) return 4;
  if (state.pityFourStar >= PITY.fourStar) return 4;
  return 3;
}

function pickStandardWaifu(bundle: Bundle, rarity: Rarity, rng: () => number): Waifu | null {
  const pool = bundle.poolWaifus
    .map((id) => WAIFU_BY_ID[id])
    .filter((w) => w && w.rarity === rarity);
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}

function pickItem(bundle: Bundle, rarity: Rarity, rng: () => number): string {
  const eligible = bundle.poolItems
    .map((id) => ITEM_BY_ID[id])
    .filter((i) => i && i.rarity <= rarity && i.kind !== 'bundle');
  const pool = eligible.length ? eligible : MATERIALS;
  const weights = pool.map((i) => {
    const rarityWeight = i.rarity >= 4 ? 0.55 : 1;
    const themed = i.waifuId === bundle.waifuId ? 1.8 : 1;
    return rarityWeight * themed;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i].id;
  }
  return pool[pool.length - 1].id;
}

/**
 * Resolve one pull. Mutates `state` (pity counters). The caller applies the
 * result to the inventory, since it owns save persistence.
 */
export function rollOnce(
  bundle: Bundle,
  state: GachaState,
  ctx: GachaContext,
  rng: () => number = Math.random,
): PullResult {
  state.totalPulls += 1;
  state.pityBundle += 1;
  state.pityFourStar += 1;

  // ── headline prize: the bundle that unlocks the quest world ──
  const bundleHit = rng() < RATES.bundle || state.pityBundle >= PITY.bundle;
  if (bundleHit) {
    state.pityBundle = 0;
    state.pityFourStar = 0;
    if (ctx.ownedItems.has(bundle.itemId)) {
      // Duplicate bundles convert into crystals so they are never dead pulls.
      return { kind: 'bundle', itemId: bundle.itemId, rarity: 5, duplicate: true, refund: 150 };
    }
    return { kind: 'bundle', itemId: bundle.itemId, rarity: 5 };
  }

  const rarity = pickRarity(state, rng);
  if (rarity >= 4) state.pityFourStar = 0;

  // A waifu drop competes with an item drop of the same rarity.
  const waifuChance = rarity === 5 ? 0.4 : 0.42;
  if (rng() < waifuChance) {
    const w = pickStandardWaifu(bundle, rarity, rng);
    if (w) return resolveWaifu(w, ctx);
  }

  return { kind: 'item', itemId: pickItem(bundle, rarity, rng), rarity };
}

function resolveWaifu(w: Waifu, ctx: GachaContext): PullResult {
  if (ctx.ownedWaifus.has(w.id)) {
    const shards = w.rarity === 5 ? 120 : w.rarity === 4 ? 60 : 30;
    return { kind: 'waifu', waifuId: w.id, rarity: w.rarity, duplicate: true, shards };
  }
  return { kind: 'waifu', waifuId: w.id, rarity: w.rarity };
}

export function rollMany(
  bundle: Bundle,
  count: number,
  state: GachaState,
  ctx: GachaContext,
  rng: () => number = Math.random,
): PullResult[] {
  const out: PullResult[] = [];
  for (let i = 0; i < count; i++) out.push(rollOnce(bundle, state, ctx, rng));
  return out;
}

/** Seeded RNG so pull sequences are reproducible in tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Human-readable label + subtitle for a pull result. */
export function describePull(r: PullResult): { title: string; sub: string; color: number } {
  if (r.kind === 'bundle') {
    const b = BUNDLE_BY_ID[r.itemId ?? ''];
    return {
      title: b?.name ?? 'Bundle',
      sub: r.duplicate ? `Duplicate · +${r.refund} crystals` : 'Unlocks a quest world',
      color: b?.accent ?? 0xffd75e,
    };
  }
  if (r.kind === 'waifu') {
    const w = WAIFU_BY_ID[r.waifuId ?? ''];
    return {
      title: w?.name ?? 'Waifu',
      sub: r.duplicate ? `Duplicate · +${r.shards} connection` : (w?.series ?? ''),
      color: w?.spec.accent ?? 0xffd75e,
    };
  }
  const i = ITEM_BY_ID[r.itemId ?? ''];
  return { title: i?.name ?? 'Item', sub: i?.desc ?? '', color: i?.color ?? 0xffd75e };
}
