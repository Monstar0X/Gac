import * as THREE from 'three';
import { Stage } from './engine/stage';
import { GameState } from './game/state';
import {
  availableRooms,
  roomGuests,
  type AppContext,
  type ScreenId,
} from './engine/app-stage';
import { FEATURED_WAIFUS, WAIFU_BY_ID } from './data/waifus';
import { DEFAULT_ROOM, ROOM_BY_ID } from './data/rooms';
import { IsoRoom } from './engine/iso-room';
import { el, clear, fmt } from './ui/dom';
import { drawItemIcon } from './ui/portraits';
import { BUNDLE_BY_ID } from './game/gacha';

import { renderTitle } from './ui/screens/title';
import { renderHome } from './ui/screens/home';
import { renderGacha } from './ui/screens/gacha';
import { renderQuests } from './ui/screens/quests';
import { renderRoster } from './ui/screens/roster';
import { renderStore } from './ui/screens/store';
import { renderBag } from './ui/screens/bag';
import { renderQuiz } from './ui/screens/quiz';
import { renderHero } from './ui/screens/hero';
import { renderWorld } from './ui/screens/world';
import { pixelIcon, iconLabel, type IconName } from './ui/icons';

const NAV: { id: ScreenId; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'quests', label: 'Quests', icon: 'map' },
  { id: 'gacha', label: 'Royale', icon: 'star' },
  { id: 'roster', label: 'Waifus', icon: 'heart' },
  { id: 'store', label: 'Store', icon: 'cart' },
  { id: 'bag', label: 'Bag', icon: 'bag' },
  { id: 'quiz', label: 'Quiz', icon: 'crown' },
  { id: 'hero', label: 'Hero', icon: 'cap' },
];

export class App implements AppContext {
  stage: Stage;
  state: GameState;
  canvas: HTMLCanvasElement;
  private uiRoot: HTMLElement;
  private hudEl: HTMLElement | null = null;
  private navEl: HTMLElement | null = null;
  private screenEl: HTMLElement | null = null;
  private toastStack: HTMLElement;
  private current: ScreenId = 'title';
  /** The 2D isometric home diorama shown behind every shell screen. */
  private room2d: IsoRoom;
  /** Room currently shown on the home screen. */
  private activeRoomId: string = DEFAULT_ROOM.id;
  /** Content currently mounted on the stage, for disposal on swap. */
  private activeQuest: { dispose: () => void } | null = null;
  /** The mounted quest scene, exposed for automated tests. */
  activeQuestScene: unknown = null;
  home: AppContext['home'];

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.canvas = canvas;
    this.uiRoot = uiRoot;
    this.state = GameState.load();
    this.stage = new Stage(canvas);
    this.stage.setPixelScale(this.state.data.settings.pixelScale);

    this.toastStack = el('div', { class: 'toast-stack' });

    this.room2d = new IsoRoom(document.getElementById('room-canvas') as HTMLCanvasElement);
    this.room2d.onPick = (id) => {
      if (id === 'hero') {
        this.setScreen('hero');
        return;
      }
      const w = WAIFU_BY_ID[id];
      if (w) import('./ui/screens/roster').then(({ openSheet }) => openSheet(this, w));
    };
    this.room2d.start();
    this.home = {
      room: null,
      roomId: this.activeRoomId,
      setRoom: (roomId, guests) => {
        this.activeRoomId = roomId;
        this.room2d.setRoom(ROOM_BY_ID[roomId] ?? DEFAULT_ROOM, guests, this.state.hero());
        this.home.room = this.room2d;
        this.home.roomId = roomId;
      },
    };

    window.addEventListener('resize', () => {
      this.rebuildNavOverflow();
      this.room2d.layout();
      this.room2d.renderFrame();
    });
  }

  /** Current screen id, for feedback reports and tests. */
  get screenId(): ScreenId {
    return this.current;
  }

  // ── screen routing ──
  setScreen(id: ScreenId) {
    this.current = id;
    this.render();
  }

  refresh() {
    this.render();
  }

  sync() {
    this.state.save();
    this.renderHud();
  }

  toast(text: string, kind: 'info' | 'relic' | 'good' | 'bad' = 'info') {
    const t = el('div', { class: `toast ${kind}`, text });
    this.toastStack.append(t);
    window.setTimeout(() => {
      t.style.transition = 'opacity .3s, transform .3s';
      t.style.opacity = '0';
      t.style.transform = 'translateX(30px)';
      window.setTimeout(() => t.remove(), 320);
    }, 3400);
    while (this.toastStack.childElementCount > 5) {
      this.toastStack.firstElementChild?.remove();
    }
  }

  /** Which renderer is visible: the 2D home diorama (shell) or the quest world. */
  private setView(v: 'shell' | 'world') {
    document.body.dataset.view = v;
    // The diorama only animates while it is visible.
    if (v === 'shell') this.room2d.start();
    else this.room2d.stop();
  }

  /** Detach whatever 3D content is currently rendering. */
  private releaseStageContent() {
    if (this.activeQuest) {
      this.activeQuest.dispose();
      this.activeQuest = null;
    }
  }

  private render() {
    clear(this.uiRoot);
    this.hudEl = null;
    this.navEl = null;
    this.screenEl = null;

    if (this.current === 'title') {
      this.releaseStageContent();
      this.stage.show(null);
      this.setView('shell');
      document.body.dataset.screen = 'title';
      this.mountActiveRoom();
      const title = renderTitle(this);
      this.uiRoot.append(title);
      return;
    }

    // ── world is a full-bleed mode with its own minimal HUD ──
    if (this.current === 'world') {
      this.setView('world');
      const world = renderWorld(this);
      this.uiRoot.append(world);
      this.uiRoot.append(this.toastStack);
      return;
    }

    // ── standard shell: HUD + nav + screen ──
    this.releaseStageContent();
    this.setView('shell');
    document.body.dataset.screen = this.current;
    this.mountActiveRoom();
    this.stage.show(null);

    this.hudEl = this.buildHud();
    this.uiRoot.append(this.hudEl);
    this.renderHud();

    this.screenEl = el('div', { class: 'screen' });
    this.uiRoot.append(this.screenEl);

    switch (this.current) {
      case 'home':
        renderHome(this, this.screenEl);
        break;
      case 'gacha':
        renderGacha(this, this.screenEl);
        break;
      case 'quests':
        renderQuests(this, this.screenEl);
        break;
      case 'roster':
        renderRoster(this, this.screenEl);
        break;
      case 'store':
        renderStore(this, this.screenEl);
        break;
      case 'bag':
        renderBag(this, this.screenEl);
        break;
      case 'quiz':
        renderQuiz(this, this.screenEl);
        break;
      case 'hero':
        renderHero(this, this.screenEl);
        break;
    }

    if (this.current !== 'home') {
      // Dim the room behind menu screens so panels stay readable.
      this.screenEl.style.background =
        'linear-gradient(180deg, rgba(8,10,32,.72), rgba(8,10,32,.9))';
    }

    this.navEl = this.buildNav();
    this.uiRoot.append(this.navEl);
    this.uiRoot.append(this.toastStack);
  }

  /**
   * Mount the room the player is currently browsing. Falls back to the first
   * available room if the active one is no longer reachable (e.g. after a
   * reset), so the home screen is never blank.
   */
  private mountActiveRoom() {
    const rooms = availableRooms(this.state);
    if (!rooms.some((r) => r.id === this.activeRoomId)) {
      this.activeRoomId = rooms[0].id;
    }
    const guests = roomGuests(this.state, this.activeRoomId);
    this.home.setRoom(this.activeRoomId, guests);
  }

  /** Switch the visible room and redraw. */
  showRoom(roomId: string) {
    this.activeRoomId = roomId;
    if (this.current === 'home') this.render();
    else this.mountActiveRoom();
  }

  // ── HUD ──
  private buildHud(): HTMLElement {
    const hud = el('div', { class: 'hud' });
    const left = el('div', { class: 'hud-left' });
    const right = el('div', { class: 'hud-right' });
    hud.append(left, right);
    return hud;
  }

  renderHud() {
    if (!this.hudEl) return;
    const left = this.hudEl.querySelector('.hud-left') as HTMLElement;
    const right = this.hudEl.querySelector('.hud-right') as HTMLElement;
    if (!left || !right) return;
    clear(left);
    clear(right);

    left.append(
      el('div', { class: 'res' }, [
        el('span', { class: 'ico coin' }),
        el('span', { class: 'label', text: fmt(this.state.coins) }),
      ]),
      el('div', { class: 'res' }, [
        el('span', { class: 'ico crystal' }),
        el('span', { class: 'label', text: fmt(this.state.crystals) }),
      ]),
      el('div', { class: 'res' }, [
        el('span', { class: 'ico token' }),
        el('span', { class: 'label', text: fmt(this.state.royalTokens) }),
      ]),
    );

    // Owned waifu count
    const owned = this.state.ownedWaifuList().length;
    right.append(
      el('div', { class: 'res' }, [
        el('span', { class: 'ico shard' }),
        el('span', { class: 'label', text: `${owned}/${Object.keys(WAIFU_BY_ID).length}` }),
      ]),
    );

    if (this.state.canClaimDaily()) {
      const dailyBtn = el('button', {
        class: 'btn small',
        onClick: () => {
          const got = this.state.claimDaily();
          if (got) {
            this.sync();
            this.toast(`Daily gift: +${fmt(got.coins)} coins, +${fmt(got.crystals)} crystals`, 'good');
          }
        },
      });
      dailyBtn.append(iconLabel('gift', 'Daily', 16));
      right.append(dailyBtn);
    }

    const settingsBtn = el('button', {
      class: 'btn ghost small',
      title: 'Settings',
      'aria-label': 'Settings',
      onClick: () => this.openSettings(),
    });
    settingsBtn.append(pixelIcon('gear', 18, 'btn-ico'));
    right.append(settingsBtn);
  }

  private openSettings() {
    import('./ui/screens/settings').then(({ openSettings }) => openSettings(this));
  }

  // ── nav ──
  private buildNav(): HTMLElement {
    const nav = el('div', { class: 'nav' });
    for (const item of NAV) {
      const badgeCount = this.navBadge(item.id);
      const btn = el('button', { class: `nav-btn${this.current === item.id ? ' active' : ''}` }, [
        pixelIcon(item.icon, 24, 'nav-ico'),
        el('span', { text: item.label }),
        badgeCount > 0 ? el('span', { class: 'badge', text: String(badgeCount) }) : null,
      ]);
      btn.addEventListener('click', () => this.setScreen(item.id));
      nav.append(btn);
    }
    return nav;
  }

  private navBadge(id: ScreenId): number {
    if (id === 'quests') {
      // Featured waifus whose bundle is owned but quest not finished.
      return FEATURED_WAIFUS.filter(
        (w) => this.state.questUnlocked(w.id) && !this.state.data.waifus[w.id]?.questComplete,
      ).length;
    }
    if (id === 'bag') {
      return Object.keys(this.state.data.items).length > 0 ? 0 : 0;
    }
    return 0;
  }

  private rebuildNavOverflow() {
    /* layout is CSS-driven; hook kept for future use */
  }

  /** Mount a quest scene on the stage. Returns the scene for the world UI. */
  mountQuest(scene: unknown) {
    this.releaseStageContent();
    this.activeQuest = scene as { dispose: () => void };
    // Exposed for the smoke tests, which drive movement without a real input
    // device; nothing in the UI reads it back.
    this.activeQuestScene = this.activeQuest;
  }

  /** Dispose and detach the active quest scene (no double-dispose). */
  clearStage() {
    this.releaseStageContent();
    this.activeQuestScene = null;
    this.stage.show(null);
  }

  /** Look up a bundle display name for a waifu id. */
  bundleName(waifuId: string): string {
    return BUNDLE_BY_ID[`bundle_${waifuId}`]?.name ?? 'Bundle';
  }

  /** Convenience: item icon canvas. */
  itemIcon(itemId: string, size = 48): HTMLCanvasElement {
    const def = BUNDLE_BY_ID[itemId]
      ? { icon: 'key' as const, color: BUNDLE_BY_ID[itemId].accent }
      : { icon: 'seal' as const, color: 0xffffff };
    const c = document.createElement('canvas');
    drawItemIcon(c, def.icon, def.color, size);
    return c;
  }

  start() {
    this.render();
  }
}

// ── bootstrap ──
export function boot() {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const uiRoot = document.getElementById('ui-root') as HTMLElement;
  const app = new App(canvas, uiRoot);
  (window as unknown as { app: App }).app = app;
  app.start();
  return app;
}
