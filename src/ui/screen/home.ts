import { el, clear } from '../dom';
import { waifuPortrait } from '../components';
import { pixelIcon, iconLabel } from '../icons';
import { FEATURED_WAIFUS, WAIFU_BY_ID } from '../../data/waifus';
import { availableRooms, roomGuests } from '../../engine/app-stage';
import type { AppContext } from '../../engine/app-stage';

/**
 * The cozy home screen: the active series room renders in 3D behind this
 * overlay. The overlay carries the room switcher, a compact welcome card and
 * quick actions.
 */
export function renderHome(app: AppContext, root: HTMLElement) {
  root.style.background = 'none';

  const rooms = availableRooms(app.state);
  const activeId = rooms.some((r) => r.id === app.home.roomId) ? app.home.roomId : rooms[0].id;
  const activeRoom = rooms.find((r) => r.id === activeId)!;
  const guests = roomGuests(app.state, activeId);

  // ── room switcher (only useful once more than one room is reachable) ──
  if (rooms.length > 1) {
    const bar = el('div', { class: 'room-bar' });
    for (const r of rooms) {
      const btn = el('button', {
        class: `room-tab${r.id === activeId ? ' active' : ''}`,
        title: r.blurb,
        text: r.series || 'Your room',
      });
      btn.addEventListener('click', () => app.showRoom(r.id));
      bar.append(btn);
    }
    root.append(bar);
  }

  // ── nameplate for the residents ──
  if (guests.length) {
    const names = guests
      .map((w) => `${w.name} · LV ${app.state.data.waifus[w.id]?.connection.level ?? 1}`)
      .join('   ');
    root.append(el('div', { class: 'home-guest' }, [el('div', { class: 'guest-tag', text: names })]));
  }

  // ── welcome panel ──
  const overlay = el('div', { class: 'home-overlay' });
  const panel = el('div', { class: 'panel home-welcome' });

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? 'Still awake?' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const head = el('div', { class: 'home-head' }, [
    el('div', { class: 'home-hello', text: `${greeting}, ${app.state.data.playerName}` }),
  ]);

  // Dismiss collapses the panel to just the title bar for this session.
  const dismiss = el('button', { class: 'home-dismiss', title: 'Hide the welcome note' }, [
    pixelIcon('x', 14),
  ]);
  head.append(dismiss);
  panel.append(head);

  const body = el('div', { class: 'home-body' });
  panel.append(body);

  const ownedCount = app.state.ownedWaifuList().length;
  const line = guests.length
    ? `${activeRoom.name} — ${guests.map((g) => g.name).join(', ')} ${
        guests.length === 1 ? 'is' : 'are'
      } here. ${ownedCount} in your collection.`
    : 'The room is quiet. Pull a bundle from the Luck Royale to bring someone home.';
  body.append(el('div', { class: 'home-line', text: line }));

  dismiss.addEventListener('click', () => {
    body.remove();
    dismiss.remove();
    panel.classList.add('collapsed');
  });

  // ── quick actions ──
  const actions = el('div', { class: 'home-actions' });

  const nextQuest = FEATURED_WAIFUS.find(
    (w) => app.state.questUnlocked(w.id) && !app.state.data.waifus[w.id]?.questComplete,
  );
  if (nextQuest) {
    const b = el('button', { class: 'btn rose' }, [
      iconLabel('map', `Continue ${nextQuest.name}'s quest`),
    ]);
    b.addEventListener('click', () => app.setScreen('quests'));
    actions.append(b);
  } else {
    const b = el('button', { class: 'btn' }, [iconLabel('star', 'Go to Luck Royale')]);
    b.addEventListener('click', () => app.setScreen('gacha'));
    actions.append(b);
  }

  if (guests.length) {
    const b = el('button', { class: 'btn ghost' }, [iconLabel('chat', `Talk to ${guests[0].name}`)]);
    b.addEventListener('click', () => {
      import('./dialogue').then(({ openDialogue }) => openDialogue(app, guests[0].id));
    });
    actions.append(b);
  }

  const roster = el('button', { class: 'btn ghost' }, [iconLabel('heart', 'Collection')]);
  roster.addEventListener('click', () => app.setScreen('roster'));
  actions.append(roster);

  const bag = el('button', { class: 'btn ghost' }, [iconLabel('bag', 'Inventory')]);
  bag.addEventListener('click', () => app.setScreen('bag'));
  actions.append(bag);

  if (app.state.canClaimDaily()) {
    const daily = el('button', { class: 'btn sage' }, [iconLabel('gift', 'Claim daily gift')]);
    daily.addEventListener('click', () => {
      const got = app.state.claimDaily();
      if (got) {
        app.sync();
        app.toast(`+${got.coins} coins · +${got.crystals} crystals`, 'good');
        app.refresh();
      }
    });
    actions.append(daily);
  }

  body.append(actions);

  // ── resident portrait strip ──
  if (guests.length) {
    const strip = el('div', {
      class: 'home-actions',
      style: 'margin-top:12px;gap:8px;align-items:center',
    });
    strip.append(el('span', { class: 'card-meta', text: 'In this room:' }));
    for (const w of guests) {
      const o = app.state.data.waifus[w.id];
      const thumb = el('div', {
        class: 'tile',
        style: 'padding:4px;cursor:pointer',
        title: `${w.name} · LV ${o?.connection.level ?? 1}`,
      });
      thumb.append(waifuPortrait(w.id, 52, 0x241c2c));
      thumb.addEventListener('click', () => {
        import('./roster').then(({ openSheet }) => openSheet(app, w));
      });
      strip.append(thumb);
    }
    body.append(strip);
  }

  overlay.append(panel);
  root.append(overlay);
}

export { clear };
