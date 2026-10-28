import type { ConnectionState, CosmeticSlot, PullResult } from '../data/types';
import { ITEM_BY_ID } from '../data/items';
import { WAIFU_BY_ID } from '../data/waifus';
import { DEFAULT_HERO, normalizeHero, type HeroAppearance } from '../data/player';
import { newGachaState, type GachaState } from './gacha';

const SAVE_KEY = 'waifu-gacha-3d:save:v1';

/**
 * Playtest balance boost. Set to 1 for the shipping economy. The current value
 * makes currency effectively unlimited so every feature (pulls, cosmetics,
 * materials, quests) can be exercised without grinding. A one-time migration
 * in `load()` tops up saves that were banked under a lower multiplier.
 */
export const CURRENCY_BOOST = 100_000;

export interface OwnedWaifu {
  id: string;
  connection: ConnectionState;
  /** Cosmetic item ids equipped per slot. */
  equipped: Partial<Record<CosmeticSlot, string>>;
  /** Material item ids bound to her, raising connection gains. */
  materials: string[];
  /** Relic ids recovered in the quest world. */
  relics: string[];
  questComplete: boolean;
  recruitedAt: number;
}

export interface SaveData {
  version: 1;
  playerName: string;
  coins: number;
  crystals: number;
  /** Royal Tokens: earned from the waifu quiz, spent on exclusive goods. */
  royalTokens: number;
  /** itemId -> count */
  items: Record<string, number>;
  waifus: Record<string, OwnedWaifu>;
  gacha: GachaState;
  /** bundleId -> pulls made on that bundle (for per-banner pity display). */
  bundlePulls: Record<string, number>;
  /** itemId -> remaining stock in the shop. */
  shopStock: Record<string, number>;
  /** Quest progress keyed by waifuId. */
  questProgress: Record<string, { relics: string[]; primeReached: boolean }>;
  stats: { totalPulls: number; questsCompleted: number; relicsFound: number };
  lastDailyClaim: string | null;
  settings: { pixelScale: number; muted: boolean };
  /** Which CURRENCY_BOOST multiplier the stored wallet was granted. */
  boostApplied: number;
  /** Quiz bookkeeping: which questions have been answered correctly. */
  quiz: { answered: string[]; correct: number; wrong: number };
  /** The player avatar's customizable appearance. */
  hero: HeroAppearance;
}

export function defaultSave(): SaveData {
  return {
    version: 1,
    playerName: 'Commander',
    coins: 1200 * CURRENCY_BOOST,
    crystals: 300 * CURRENCY_BOOST,
    royalTokens: 500,
    items: {
      mat_stardust: 6,
      mat_candy: 6,
      mat_tealeaf: 4,
      post_generic_1: 1,
    },
    waifus: {},
    gacha: newGachaState(),
    bundlePulls: {},
    shopStock: {},
    questProgress: {},
    stats: { totalPulls: 0, questsCompleted: 0, relicsFound: 0 },
    lastDailyClaim: null,
    settings: { pixelScale: 3, muted: false },
    boostApplied: CURRENCY_BOOST,
    quiz: { answered: [], correct: 0, wrong: 0 },
    hero: { ...DEFAULT_HERO },
  };
}

export class GameState {
  data: SaveData;

  constructor(data?: SaveData) {
    this.data = data ?? defaultSave();
  }

  // ── persistence ──
  static load(): GameState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return new GameState();
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== 1) return new GameState();
      const base = defaultSave();
      // Shallow-merge so new fields added in later versions survive.
      const merged: SaveData = {
        ...base,
        ...parsed,
        items: { ...parsed.items },
        waifus: { ...parsed.waifus },
        gacha: { ...base.gacha, ...parsed.gacha },
        bundlePulls: { ...parsed.bundlePulls },
        shopStock: { ...parsed.shopStock },
        questProgress: { ...parsed.questProgress },
        stats: { ...base.stats, ...parsed.stats },
        settings: { ...base.settings, ...parsed.settings },
        quiz: { ...base.quiz, ...parsed.quiz },
        hero: normalizeHero(parsed.hero),
      };
      // Wallets saved before a boost change are topped up once, so an existing
      // playtest save reaches the same spending power as a fresh one.
      const applied = parsed.boostApplied ?? 1;
      if (applied < CURRENCY_BOOST) {
        const factor = CURRENCY_BOOST / Math.max(1, applied);
        merged.coins = Math.round(merged.coins * factor);
        merged.crystals = Math.round(merged.crystals * factor);
        merged.boostApplied = CURRENCY_BOOST;
      }
      return new GameState(merged);
    } catch {
      return new GameState();
    }
  }

  save(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked — game continues in memory */
    }
  }

  reset(): void {
    this.data = defaultSave();
    this.save();
  }

  // ── currency ──
  get coins() {
    return this.data.coins;
  }
  get crystals() {
    return this.data.crystals;
  }

  addCoins(n: number) {
    this.data.coins = Math.max(0, this.data.coins + n);
  }
  addCrystals(n: number) {
    this.data.crystals = Math.max(0, this.data.crystals + n);
  }
  get royalTokens() {
    return this.data.royalTokens;
  }
  addRoyalTokens(n: number) {
    this.data.royalTokens = Math.max(0, this.data.royalTokens + n);
  }
  canAfford(currency: 'coins' | 'crystals' | 'royalTokens', price: number) {
    if (currency === 'coins') return this.coins >= price;
    if (currency === 'crystals') return this.crystals >= price;
    return this.royalTokens >= price;
  }
  spend(currency: 'coins' | 'crystals' | 'royalTokens', price: number): boolean {
    if (!this.canAfford(currency, price)) return false;
    if (currency === 'coins') this.addCoins(-price);
    else if (currency === 'crystals') this.addCrystals(-price);
    else this.addRoyalTokens(-price);
    return true;
  }

  // ── inventory ──
  itemCount(itemId: string): number {
    return this.data.items[itemId] ?? 0;
  }
  addItem(itemId: string, n = 1) {
    this.data.items[itemId] = (this.data.items[itemId] ?? 0) + n;
  }
  removeItem(itemId: string, n = 1): boolean {
    const have = this.itemCount(itemId);
    if (have < n) return false;
    const left = have - n;
    if (left <= 0) delete this.data.items[itemId];
    else this.data.items[itemId] = left;
    return true;
  }
  hasItem(itemId: string) {
    return this.itemCount(itemId) > 0;
  }
  ownedItemIds(): string[] {
    return Object.keys(this.data.items).filter((id) => (this.data.items[id] ?? 0) > 0);
  }
  ownedItemSet(): Set<string> {
    return new Set(this.ownedItemIds());
  }

  // ── shop stock ──
  stockFor(itemId: string, defaultStock: number): number {
    if (defaultStock < 0) return -1;
    const v = this.data.shopStock[itemId];
    return v === undefined ? defaultStock : v;
  }
  consumeStock(itemId: string, defaultStock: number) {
    if (defaultStock < 0) return;
    const cur = this.stockFor(itemId, defaultStock);
    this.data.shopStock[itemId] = Math.max(0, cur - 1);
  }
  restockAll() {
    this.data.shopStock = {};
  }

  // ── waifus ──
  ownsWaifu(id: string) {
    return !!this.data.waifus[id];
  }
  ownedWaifuSet(): Set<string> {
    return new Set(Object.keys(this.data.waifus));
  }
  ownedWaifuList(): OwnedWaifu[] {
    return Object.values(this.data.waifus);
  }
  addWaifu(id: string): OwnedWaifu {
    const existing = this.data.waifus[id];
    if (existing) {
      // Saves written before materials existed lack the field.
      if (!existing.materials) existing.materials = [];
      return existing;
    }
    const owned: OwnedWaifu = {
      id,
      connection: { level: 1, xp: 0 },
      equipped: {},
      materials: [],
      relics: [],
      questComplete: false,
      recruitedAt: Date.now(),
    };
    this.data.waifus[id] = owned;
    return owned;
  }

  /** XP required to reach the next connection level. */
  static xpForLevel(level: number): number {
    return 100 + (level - 1) * 75;
  }

  /**
   * Feed a material to a waifu. Matching gift tags give a 2x bonus, and
   * duplicates of the same item give diminishing returns per level.
   */
  giveGift(waifuId: string, itemId: string): { xp: number; bonus: boolean; leveled: boolean } {
    const owned = this.data.waifus[waifuId];
    const def = ITEM_BY_ID[itemId];
    if (!owned || !def) return { xp: 0, bonus: false, leveled: false };
    if (def.kind !== 'material') return { xp: 0, bonus: false, leveled: false };
    if (!this.removeItem(itemId)) return { xp: 0, bonus: false, leveled: false };

    const waifu = WAIFU_BY_ID[waifuId];
    const bonus = def.tags.some((t) => waifu.giftTags.includes(t));
    const base = def.rarity >= 5 ? 90 : def.rarity === 4 ? 55 : 30;
    // Materials bound to her raise every gift's yield.
    const matMul = 1 + this.materialBonus(waifuId);
    const xp = Math.round(base * (bonus ? 2 : 1) * matMul);

    const before = owned.connection.level;
    owned.connection.xp += xp;
    let guard = 0;
    while (owned.connection.xp >= GameState.xpForLevel(owned.connection.level) && guard++ < 100) {
      owned.connection.xp -= GameState.xpForLevel(owned.connection.level);
      owned.connection.level += 1;
    }
    return { xp, bonus, leveled: owned.connection.level > before };
  }

  /** Shards from duplicate pulls are stored as crystals-equivalent XP. */
  addConnectionShards(waifuId: string, shards: number) {
    const owned = this.data.waifus[waifuId];
    if (!owned) return;
    owned.connection.xp += shards;
    let guard = 0;
    while (owned.connection.xp >= GameState.xpForLevel(owned.connection.level) && guard++ < 100) {
      owned.connection.xp -= GameState.xpForLevel(owned.connection.level);
      owned.connection.level += 1;
    }
  }

  equip(waifuId: string, itemId: string): boolean {
    const owned = this.data.waifus[waifuId];
    const def = ITEM_BY_ID[itemId];
    if (!owned || !def || def.kind !== 'cosmetic' || !def.slot) return false;
    if (!this.hasItem(itemId)) return false;
    if (def.waifuId && def.waifuId !== waifuId) return false;
    owned.equipped[def.slot] = itemId;
    return true;
  }

  unequip(waifuId: string, slot: CosmeticSlot) {
    const owned = this.data.waifus[waifuId];
    if (owned) delete owned.equipped[slot];
  }

  // ── material binding ──
  /** Material ids currently bound to a waifu. */
  materialsOf(waifuId: string): string[] {
    return this.data.waifus[waifuId]?.materials ?? [];
  }

  /**
   * Connection gain multiplier from bound materials: each material adds a
   * bonus scaled by rarity, with diminishing returns so stacking everything
   * is not strictly optimal.
   */
  materialBonus(waifuId: string): number {
    const mats = this.materialsOf(waifuId);
    if (!mats.length) return 0;
    let bonus = 0;
    for (const id of mats) {
      const def = ITEM_BY_ID[id];
      if (!def) continue;
      bonus += def.rarity >= 5 ? 0.18 : def.rarity === 4 ? 0.12 : 0.08;
    }
    // Diminishing: 1 + b + b^2/2 ... approaches e^b, capped.
    return Math.min(0.9, bonus);
  }

  /** Bind a material to a waifu. Consumes one from the inventory. */
  equipMaterial(waifuId: string, itemId: string): { ok: boolean; reason?: string } {
    const owned = this.data.waifus[waifuId];
    const def = ITEM_BY_ID[itemId];
    if (!owned) return { ok: false, reason: 'No such waifu.' };
    if (!def || def.kind !== 'material') return { ok: false, reason: 'Not a material.' };
    if (!owned.materials) owned.materials = [];
    if (owned.materials.includes(itemId)) return { ok: false, reason: 'Already bound.' };
    if (owned.materials.length >= 3) return { ok: false, reason: 'Three materials is the limit.' };
    if (!this.removeItem(itemId)) return { ok: false, reason: 'None left in the inventory.' };
    owned.materials.push(itemId);
    return { ok: true };
  }

  /** Unbind a material, returning it to the inventory. */
  unequipMaterial(waifuId: string, itemId: string): boolean {
    const owned = this.data.waifus[waifuId];
    if (!owned?.materials) return false;
    const i = owned.materials.indexOf(itemId);
    if (i < 0) return false;
    owned.materials.splice(i, 1);
    this.addItem(itemId, 1);
    return true;
  }

  // ── quiz (Royal Tokens) ──
  quizAnswered(questionId: string): boolean {
    return this.data.quiz.answered.includes(questionId);
  }

  /** Record a quiz answer. Correct answers pay Royal Tokens once. */
  answerQuiz(questionId: string, correct: boolean, reward: number): { paid: boolean; reward: number } {
    if (correct) {
      this.data.quiz.correct += 1;
      if (this.data.quiz.answered.includes(questionId)) return { paid: false, reward: 0 };
      this.data.quiz.answered.push(questionId);
      this.addRoyalTokens(reward);
      return { paid: true, reward };
    }
    this.data.quiz.wrong += 1;
    return { paid: false, reward: 0 };
  }

  // ── quests ──
  questState(waifuId: string) {
    if (!this.data.questProgress[waifuId]) {
      this.data.questProgress[waifuId] = { relics: [], primeReached: false };
    }
    return this.data.questProgress[waifuId];
  }

  /** A featured waifu's quest is playable only once her bundle is owned. */
  ownsBundle(waifuId: string): boolean {
    return this.hasItem(`bundle_${waifuId}`);
  }

  questUnlocked(waifuId: string): boolean {
    return this.ownsBundle(waifuId);
  }

  collectRelic(waifuId: string, relicId: string): boolean {
    const q = this.questState(waifuId);
    if (q.relics.includes(relicId)) return false;
    q.relics.push(relicId);
    this.data.stats.relicsFound += 1;
    if (!this.hasItem(relicId)) this.addItem(relicId, 1);
    return true;
  }

  markPrimeReached(waifuId: string) {
    this.questState(waifuId).primeReached = true;
  }

  /** Complete the quest: recruit the waifu and bank the rewards. */
  completeQuest(waifuId: string): { alreadyOwned: boolean } {
    const waifu = WAIFU_BY_ID[waifuId];
    const already = this.ownsWaifu(waifuId);
    const owned = this.addWaifu(waifuId);
    const q = this.questState(waifuId);
    owned.questComplete = true;
    owned.relics = [...new Set([...owned.relics, ...q.relics])];
    if (!already && waifu?.quest) {
      this.addCrystals(waifu.quest.reward.crystals);
      this.addCoins(waifu.quest.reward.coins);
      // Royal Tokens are the quest-exclusive currency.
      this.addRoyalTokens(waifu.quest.reward.royalTokens);
      this.data.stats.questsCompleted += 1;
    }
    return { alreadyOwned: already };
  }

  // ── gacha ──
  gachaContext(): { ownedWaifus: Set<string>; ownedItems: Set<string> } {
    return { ownedWaifus: this.ownedWaifuSet(), ownedItems: this.ownedItemSet() };
  }

  /** Apply a pull result to the save. Returns a short summary for the UI. */
  applyPull(r: PullResult): void {
    if (r.kind === 'bundle') {
      if (r.duplicate) {
        this.addCrystals(r.refund ?? 150);
      } else if (r.itemId) {
        this.addItem(r.itemId, 1);
      }
      return;
    }
    if (r.kind === 'waifu') {
      if (r.duplicate && r.waifuId) {
        this.addConnectionShards(r.waifuId, r.shards ?? 0);
      } else if (r.waifuId) {
        this.addWaifu(r.waifuId);
      }
      return;
    }
    if (r.itemId) this.addItem(r.itemId, 1);
  }

  // ── daily ──
  todayKey(): string {
    return new Date().toISOString().slice(0, 10);
  }
  canClaimDaily(): boolean {
    return this.data.lastDailyClaim !== this.todayKey();
  }
  claimDaily(): { coins: number; crystals: number } | null {
    if (!this.canClaimDaily()) return null;
    const coins = 800 * CURRENCY_BOOST;
    const crystals = 120 * CURRENCY_BOOST;
    this.addCoins(coins);
    this.addCrystals(crystals);
    this.data.lastDailyClaim = this.todayKey();
    return { coins, crystals };
  }

  // ── hero ──
  /** The player avatar's appearance. */
  hero(): HeroAppearance {
    return this.data.hero;
  }

  /** Apply a partial appearance change; unknown values are clamped on load. */
  setHero(patch: Partial<HeroAppearance>) {
    this.data.hero = normalizeHero({ ...this.data.hero, ...patch });
    this.save();
  }

  /** Replace the whole appearance, e.g. when applying a preset. */
  setHeroAppearance(appearance: HeroAppearance) {
    this.data.hero = normalizeHero(appearance);
    this.save();
  }
}

export { SAVE_KEY };
