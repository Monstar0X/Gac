import { el, clear } from '../dom';
import { pixelIcon, iconLabel, type IconName } from '../icons';
import { waifuPortrait, itemTile, itemIcon, resolveItem, priceTag } from '../components';
import { WAIFUS, WAIFU_BY_ID } from '../../data/waifus';
import { COSMETICS, ITEM_BY_ID } from '../../data/items';
import { GameState } from '../../game/state';
import type { AppContext } from '../../engine/app-stage';
import type { CosmeticSlot, Waifu } from '../../data/types';

type Filter = 'all' | 'owned' | 'missing' | 'featured' | 'r5';

export function renderRoster(app: AppContext, root: HTMLElement) {
  let filter: Filter = 'all';
  const body = el('div', { class: 'screen-body' });
  root.append(body);

  const draw = () => {
    clear(body);
    body.append(
      el('div', { class: 'screen-head' }, [
        el('div', { class: 'screen-title', text: 'COLLECTION' }),
        el('div', {
          class: 'screen-sub',
          text: 'Tap a card to open her sheet: gifts, cosmetics and dialogue.',
        }),
      ]),
    );

    // filters
    const filters = el('div', { class: 'filters' });
    const opts: { id: Filter; label: string }[] = [
      { id: 'all', label: 'All' },
      { id: 'owned', label: 'Recruited' },
      { id: 'missing', label: 'Missing' },
      { id: 'featured', label: 'Quest waifus' },
      { id: 'r5', label: '5★' },
    ];
    for (const o of opts) {
      const b = el('button', { class: `tab${filter === o.id ? ' active' : ''}`, text: o.label });
      b.addEventListener('click', () => {
        filter = o.id;
        draw();
      });
      filters.append(b);
    }
    body.append(filters);

    let list = [...WAIFUS];
    if (filter === 'owned') list = list.filter((w) => app.state.ownsWaifu(w.id));
    if (filter === 'missing') list = list.filter((w) => !app.state.ownsWaifu(w.id));
    if (filter === 'featured') list = list.filter((w) => w.featured);
    if (filter === 'r5') list = list.filter((w) => w.rarity === 5);

    list.sort((a, b) => {
      const ao = app.state.ownsWaifu(a.id) ? 0 : 1;
      const bo = app.state.ownsWaifu(b.id) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      if (b.rarity !== a.rarity) return b.rarity - a.rarity;
      return a.name.localeCompare(b.name);
    });

    if (!list.length) {
      body.append(
        el('div', { class: 'empty' }, [
          el('span', { class: 'big' }, [pixelIcon('heart', 40)]),
          el('div', { text: 'Nobody here yet. Pull from the Luck Royale and finish a quest world.' }),
        ]),
      );
      return;
    }

    const grid = el('div', { class: 'grid' });
    for (const w of list) {
      const owned = app.state.ownsWaifu(w.id);
      const ownedState = app.state.data.waifus[w.id];
      const footer: (Node | string | null)[] = [];
      if (owned && ownedState) {
        footer.push(el('span', { class: 'chip', text: `LV ${ownedState.connection.level}` }));
        if (w.featured) {
          const chip = el('span', {
            class: 'chip',
            style: ownedState.questComplete ? 'border-color:var(--sage);color:var(--sage)' : '',
          });
          chip.append(
            ownedState.questComplete
              ? iconLabel('check', 'Quest', 13)
              : iconLabel('map', 'Quest', 13),
          );
          footer.push(chip);
        }
      } else if (w.featured) {
        footer.push(el('span', { class: 'chip', text: app.state.questUnlocked(w.id) ? 'Bundle owned' : 'Quest locked' }));
      } else {
        footer.push(el('span', { class: 'chip', text: 'From Royale' }));
      }

      grid.append(
        waifuCardNode(app, w, owned, footer, () => openSheet(app, w)),
      );
    }
    body.append(grid);
  };

  draw();
}

function waifuCardNode(
  app: AppContext,
  w: Waifu,
  owned: boolean,
  footer: (Node | string | null)[],
  onClick: () => void,
): HTMLElement {
  const card = el('div', {
    class: `card r${w.rarity}${owned ? '' : ' locked'}`,
  });
  card.addEventListener('click', onClick);

  const art = el('div', { class: 'card-art' }, [waifuPortrait(w.id, 118, 0x241c2c)]);
  art.append(el('div', { class: `card-stars r${w.rarity}`, text: '★'.repeat(w.rarity) }));
  card.append(art);
  if (w.featured) card.append(el('div', { class: 'ribbon-tag', text: 'QUEST' }));

  const bodyEl = el('div', { class: 'card-body' }, [
    el('div', { class: 'card-name', text: w.name }),
    el('div', { class: 'card-meta', text: w.series }),
    el('div', { class: 'card-foot' }, footer),
  ]);
  card.append(bodyEl);
  if (!owned) card.append(el('div', { class: 'lock-tag', text: 'NOT RECRUITED' }));
  return card;
}

/** The waifu detail sheet: portrait, connection, gifts, cosmetics, dialogue. */
export function openSheet(app: AppContext, w: Waifu) {
  const owned = app.state.ownsWaifu(w.id);
  let tab: 'gifts' | 'cosmetics' | 'info' = owned ? 'gifts' : 'info';

  const backdrop = el('div', { class: 'sheet-backdrop' });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  const sheet = el('div', { class: 'panel sheet' });
  backdrop.append(sheet);
  (document.getElementById('ui-root') as HTMLElement).append(backdrop);

  const draw = () => {
    clear(sheet);

    // ── top: portrait + identity ──
    const top = el('div', { class: 'sheet-top' });
    const port = el('div', { class: 'sheet-portrait' }, [waifuPortrait(w.id, 150, 0x241c2c)]);
    top.append(port);

    const info = el('div', { class: 'sheet-info' });
    info.append(el('div', { class: 'sheet-name', text: w.name }));
    info.append(el('div', { class: 'sheet-series', text: `${w.series} · ${w.title}` }));
    info.append(el('div', { class: `card-stars r${w.rarity}`, text: '★'.repeat(w.rarity) }));
    info.append(el('div', { class: 'sheet-bio', text: w.bio }));

    const ownedState = app.state.data.waifus[w.id];

    if (ownedState) {
      // connection meter
      const need = GameState.xpForLevel(ownedState.connection.level);
      const pct = Math.min(100, (ownedState.connection.xp / need) * 100);
      const conn = el('div', { class: 'conn' });
      conn.append(
        el('div', { class: 'conn-head' }, [
          el('span', { text: `Connection Lv ${ownedState.connection.level}` }),
          el('span', { text: `${ownedState.connection.xp}/${need} XP` }),
        ]),
      );
      conn.append(el('div', { class: 'conn-bar' }, [el('i', { style: `width:${pct}%` })]));
      const filled = Math.min(5, Math.ceil(ownedState.connection.level / 4));
      conn.append(
        el(
          'div',
          { class: 'hearts', style: 'margin-top:6px' },
          Array.from({ length: 5 }, (_, i) => {
            const c = pixelIcon('heart', 16);
            if (i >= filled) c.style.opacity = '0.28';
            return c;
          }),
        ),
      );
      info.append(conn);

      // current quote at this level
      const idx = Math.min(w.dialogue.length - 1, Math.floor(ownedState.connection.level / 5));
      info.append(el('div', { class: 'sheet-quote', text: `"${w.dialogue[Math.max(0, idx)]}"` }));
    } else {
      const note = el('div', { class: 'locked-note' });
      note.append(
        pixelIcon('lock', 16),
        el('span', { text: w.featured ? ' Recruit her by completing her quest world.' : ' Pull her from the Luck Royale.' }),
      );
      info.append(note);
    }

    top.append(info);
    sheet.append(top);

    // ── tabs ──
    if (owned) {
      const tabs = el('div', { class: 'tabs', style: 'margin-top:14px' });
      for (const t of [
        { id: 'gifts' as const, label: 'Gifts', icon: 'gift' as IconName },
        { id: 'cosmetics' as const, label: 'Style', icon: 'heart' as IconName },
        { id: 'info' as const, label: 'Details', icon: 'box' as IconName },
      ]) {
        const b = el('button', { class: `tab${tab === t.id ? ' active' : ''}` });
        b.append(iconLabel(t.icon, t.label, 14));
        b.addEventListener('click', () => {
          tab = t.id;
          draw();
        });
        tabs.append(b);
      }
      sheet.append(tabs);
    }

    if (tab === 'gifts' && owned) sheet.append(giftSection(app, w, draw));
    if (tab === 'cosmetics' && owned) sheet.append(cosmeticSection(app, w, draw));
    if (tab === 'info') sheet.append(detailSection(app, w));

    // ── close ──
    const closeRow = el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap' });
    if (owned) {
      const talk = el('button', { class: 'btn rose' }, [iconLabel('chat', 'Talk')]);
      talk.addEventListener('click', () => {
        backdrop.remove();
        import('./dialogue').then(({ openDialogue }) => openDialogue(app, w.id));
      });
      closeRow.append(talk);
    }
    if (w.featured && app.state.questUnlocked(w.id) && !ownedState?.questComplete) {
      const quest = el('button', { class: 'btn sage' }, [iconLabel('map', 'Go to her world')]);
      quest.addEventListener('click', () => {
        backdrop.remove();
        app.pendingQuestWaifu = w.id;
        app.setScreen('world');
      });
      closeRow.append(quest);
    }
    const close = el('button', { class: 'btn ghost', text: 'Close' });
    close.addEventListener('click', () => backdrop.remove());
    closeRow.append(close);
    sheet.append(closeRow);
  };

  draw();
}

function giftSection(app: AppContext, w: Waifu, redraw: () => void): HTMLElement {
  const sec = el('div', { class: 'sheet-section' });
  sec.append(el('h4', { text: 'GIVE A GIFT · RAISES CONNECTION' }));

  const bound = app.state.materialsOf(w.id);
  const bonusPct = Math.round(app.state.materialBonus(w.id) * 100);
  sec.append(
    el('div', {
      class: 'card-meta',
      style: 'margin-bottom:10px',
      text:
        `She loves: ${w.giftTags.join(', ')}. Matching gifts give double XP.` +
        (bound.length ? ` Bound materials add +${bonusPct}% to every gift.` : ''),
    }),
  );

  const owned = app.state.ownedItemIds();
  const materials = owned.filter((id) => resolveItem(id)?.kind === 'material');

  if (!materials.length) {
    sec.append(
      el('div', { class: 'empty', style: 'padding:20px', text: 'No materials in your bag. Pull from the Royale or visit the store.' }),
    );
    return sec;
  }

  const row = el('div', { class: 'tile-row' });
  for (const id of materials) {
    const def = resolveItem(id);
    if (!def) continue;
    const fav = def.tags.some((t) => w.giftTags.includes(t));
    const tile = itemTile(id, {
      count: app.state.itemCount(id),
      sub: fav
        ? el('span', { style: 'display:inline-flex;align-items:center;gap:3px' }, [
            pixelIcon('heart', 12),
            'loves it',
          ])
        : undefined,
      onClick: () => {
        const res = app.state.giveGift(w.id, id);
        if (res.xp > 0) {
          app.sync();
          app.toast(
            res.leveled
              ? `${w.name} reached connection Lv ${app.state.data.waifus[w.id].connection.level}!`
              : `${w.name} +${res.xp} connection${res.bonus ? ' (favourite!)' : ''}`,
            res.leveled ? 'good' : 'info',
          );
          redraw();
        }
      },
    });
    if (fav) tile.style.borderColor = 'var(--rose)';
    row.append(tile);
  }
  sec.append(row);

  // ── bound materials: permanent connection bonus ──
  sec.append(el('h4', { text: `BOUND MATERIALS (${bound.length}/3)` }));
  if (!bound.length) {
    sec.append(
      el('div', {
        class: 'card-meta',
        style: 'margin-bottom:10px',
        text: 'None bound. Bind a material from the Inventory to raise every connection gain.',
      }),
    );
  } else {
    const boundRow = el('div', { class: 'tile-row', style: 'margin-bottom:10px' });
    for (const id of bound) {
      const def = resolveItem(id);
      if (!def) continue;
      const tile = el('div', { class: 'tile selected', style: 'cursor:pointer' }, [
        itemIcon(id, 44),
        el('div', { class: 'tile-name', text: def.name }),
        el('div', { class: 'card-meta', style: 'color:var(--rose)', text: 'Tap to release' }),
      ]);
      tile.addEventListener('click', () => {
        if (app.state.unequipMaterial(w.id, id)) {
          app.sync();
          app.toast(`Released ${def.name}.`, 'info');
          redraw();
        }
      });
      boundRow.append(tile);
    }
    sec.append(boundRow);
    sec.append(
      el('div', { class: 'card-meta', style: 'color:var(--amber)', text: `Current gift bonus: +${bonusPct}%` }),
    );
  }

  return sec;
}

function cosmeticSection(app: AppContext, w: Waifu, redraw: () => void): HTMLElement {
  const sec = el('div', { class: 'sheet-section' });
  sec.append(el('h4', { text: 'STYLE · EQUIP COSMETICS' }));

  const ownedState = app.state.data.waifus[w.id];
  const slots: CosmeticSlot[] = ['outfit', 'hair', 'accessory'];

  for (const slot of slots) {
    sec.append(
      el('div', { class: 'card-meta', style: 'margin:10px 0 6px;text-transform:uppercase;letter-spacing:.06em', text: slot }),
    );

    const ownedIds = app.state
      .ownedItemIds()
      .filter((id) => {
        const d = resolveItem(id);
        return d?.kind === 'cosmetic' && d.slot === slot && (!d.waifuId || d.waifuId === w.id);
      });

    const row = el('div', { class: 'tile-row' });

    // "none" option
    const noneTile = el('div', { class: `tile${!ownedState.equipped[slot] ? ' selected' : ''}` }, [
      el('div', { style: 'width:48px;height:48px;display:flex;align-items:center;justify-content:center;opacity:.5' }, [
        pixelIcon('frame', 32),
      ]),
      el('div', { class: 'tile-name', text: 'None' }),
    ]);
    noneTile.addEventListener('click', () => {
      app.state.unequip(w.id, slot);
      app.sync();
      redraw();
    });
    row.append(noneTile);

    for (const id of ownedIds) {
      const equipped = ownedState.equipped[slot] === id;
      const tile = itemTile(id, {
        selected: equipped,
        onClick: () => {
          if (equipped) {
            app.state.unequip(w.id, slot);
            app.toast(`${w.name} removed her ${slot}.`, 'info');
          } else if (app.state.equip(w.id, id)) {
            app.toast(`${w.name} equipped ${resolveItem(id)?.name}.`, 'good');
          }
          app.sync();
          redraw();
        },
      });
      row.append(tile);
    }
    sec.append(row);
  }

  // Shop hint for locked cosmetics
  const lockedCount = COSMETICS.filter(
    (c) => (!c.waifuId || c.waifuId === w.id) && !app.state.hasItem(c.id),
  ).length;
  if (lockedCount) {
    sec.append(
      el('div', {
        class: 'card-meta',
        style: 'margin-top:12px',
        text: `${lockedCount} more cosmetic${lockedCount > 1 ? 's' : ''} available in the store or from her bundle.`,
      }),
    );
  }
  return sec;
}

function detailSection(app: AppContext, w: Waifu): HTMLElement {
  const sec = el('div', { class: 'sheet-section' });
  sec.append(el('h4', { text: 'DETAILS' }));

  sec.append(
    el('div', { class: 'card-meta', text: `Series: ${w.series}` }),
    el('div', { class: 'card-meta', text: `Rarity: ${'★'.repeat(w.rarity)}` }),
    el('div', { class: 'card-meta', text: `Loves: ${w.giftTags.join(', ')}` }),
  );

  if (w.featured && w.quest) {
    sec.append(el('h4', { style: 'margin-top:16px', text: 'QUEST' }));
    sec.append(el('div', { class: 'card-meta', text: w.quest.title }));
    const st = app.state.questState(w.id);
    const list = el('div', { class: 'relic-list', style: 'margin-top:8px' });
    for (const r of w.quest.relics) {
      const has = st.relics.includes(r.id);
      const row = el('div', { class: `relic-row${has ? ' found' : ''}` }, [
        itemIcon(r.id, 30),
        el('span', { text: r.name }),
      ]);
      if (has) row.append(el('span', { class: 'tick', text: '✓' }));
      list.append(row);
    }
    sec.append(list);
  }

  // dialogue log
  sec.append(el('h4', { style: 'margin-top:16px', text: 'HER WORDS' }));
  const ownedState = app.state.data.waifus[w.id];
  const unlockedCount = ownedState ? Math.max(1, Math.min(w.dialogue.length, Math.floor(ownedState.connection.level / 5) + 1)) : 0;
  w.dialogue.forEach((line, i) => {
    const known = i < unlockedCount;
    sec.append(
      el('div', {
        class: 'sheet-quote',
        style: known ? '' : 'opacity:.35;filter:blur(3px);user-select:none',
        text: known ? `"${line}"` : 'Raise connection to unlock.',
      }),
    );
  });

  return sec;
}

export { priceTag, ITEM_BY_ID, WAIFU_BY_ID };
