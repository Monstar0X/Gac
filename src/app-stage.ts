import { GameState } from '../game/state';
import { Stage } from './stage';
import { drawPortrait } from '../ui/portraits';
import type { IsoRoom } from './iso-room';
import { WAIFU_BY_ID } from '../data/waifus';
import type { ItemDef, Waifu } from '../data/types';
import { ITEM_BY_ID } from '../data/items';
import { DEFAULT_ROOM, ROOMS, ROOM_BY_ID, roomForSeries, type RoomDef } from '../data/rooms';
import { BUNDLE_BY_ID } from '../game/gacha';

export type ScreenId =
  | 'title'
  | 'home'
  | 'gacha'
  | 'quests'
  | 'roster'
  | 'store'
  | 'bag'
  | 'quiz'
  | 'hero'
  | 'world';

export interface AppContext {
  stage: Stage;
  state: GameState;
  canvas: HTMLCanvasElement;
  /** Swap the full-screen UI. */
  setScreen: (id: ScreenId) => void;
  /** Push a transient message. */
  toast: (text: string, kind?: 'info' | 'relic' | 'good' | 'bad') => void;
  /** Re-render the current screen in place. */
  refresh: () => void;
  /** Force a save + HUD refresh. */
  sync: () => void;
  /** Home room controls (only valid while the home screen is mounted). */
  home: {
    /** Show a series room with the given waifus standing in it. */
    setRoom: (roomId: string, guests: Waifu[]) => void;
    room: IsoRoom | null;
    /** Room id currently mounted. */
    roomId: string;
  };

  /** Mount a quest scene on the shared stage. */
  mountQuest: (scene: { dispose: () => void }) => void;
  /** Dispose and detach the active quest scene. */
  clearStage: () => void;
  /** Switch the home screen to another series room. */
  showRoom: (roomId: string) => void;
  /** Camera yaw accessor for the in-world compass (set by the world screen). */
  pendingQuestWaifu?: string;
}

/** Renders a waifu portrait into a fresh canvas element. */
export function portraitCanvas(
  waifuId: string,
  size = 128,
  background: number | null = 0x2a2233,
): HTMLCanvasElement {
  const w = WAIFU_BY_ID[waifuId];
  const c = document.createElement('canvas');
  if (!w) return c;
  drawPortrait(c, w.spec, { size, background, rarity: w.rarity });
  return c;
}

export function itemName(itemId: string): string {
  if (BUNDLE_BY_ID[itemId]) return BUNDLE_BY_ID[itemId].name;
  return ITEM_BY_ID[itemId]?.name ?? itemId;
}

export function itemDef(itemId: string): ItemDef | undefined {
  return ITEM_BY_ID[itemId];
}

/**
 * Which rooms the player can visit: every series they own at least one waifu
 * from, plus the starter room when they own nobody. Sorted so the starter room
 * is first and the rest follow the order in `ROOMS`.
 */
export function availableRooms(state: GameState): RoomDef[] {
  const series = new Set<string>();
  for (const o of state.ownedWaifuList()) {
    const w = WAIFU_BY_ID[o.id];
    if (w) series.add(w.series);
  }
  const out = ROOMS.filter((r) => r.series !== '' && series.has(r.series));
  return out.length ? out : [DEFAULT_ROOM];
}

/**
 * The waifus standing in a room: every owned waifu from that series. The
 * starter room falls back to the player's highest-connection waifu so it is
 * never empty, and a series room falls back to anyone owned when the series
 * has no resident yet.
 */
export function roomGuests(state: GameState, roomId: string): Waifu[] {
  const def = ROOM_BY_ID[roomId] ?? DEFAULT_ROOM;
  const owned = state
    .ownedWaifuList()
    .map((o) => WAIFU_BY_ID[o.id])
    .filter((w): w is Waifu => !!w);

  const byConnection = [...state.ownedWaifuList()].sort(
    (a, b) => b.connection.level - a.connection.level || b.connection.xp - a.connection.xp,
  );
  const rank = new Map(byConnection.map((o, i) => [o.id, i]));
  const sortOwned = (list: Waifu[]) => list.sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99));

  if (def.series === '') return sortOwned(owned).slice(0, 1);
  const residents = owned.filter((w) => w.series === def.series);
  return sortOwned(residents.length ? residents : owned).slice(0, 6);
}

/** Resolve a waifu's series room id, falling back to the starter room. */
export function roomIdForWaifu(waifuId: string): string {
  const w = WAIFU_BY_ID[waifuId];
  if (!w) return DEFAULT_ROOM.id;
  return roomForSeries(w.series)?.id ?? DEFAULT_ROOM.id;
}

export { DEFAULT_ROOM, ROOM_BY_ID, ROOMS, roomForSeries };
