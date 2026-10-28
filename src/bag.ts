import { el, clear } from '../dom';
import { pixelIcon, iconLabel, type IconName } from '../icons';
import { itemTile, itemIcon, resolveItem, waifuCard, waifuPortrait } from '../components';
import { WAIFU_BY_ID, WAIFUS } from '../../data/waifus';
import { BUNDLE_BY_ID } from '../../game/gacha';
import type { AppContext } from '../../engine/app-stage';
import type { ItemKind } from '../../data/types';

type Filter = 'all' | ItemKind | 'waifu';

const KIND_LABEL: Record<ItemKind, string> = {
  material: 'Materials',
  poster: 'Posters',
  relic: 'Relics',
  cosmetic: 'Cosmetics',
  bundle: 'Bundles',
};

const KIND_ICON: Record<ItemKind, IconName> = {
  material: 'gift',
  poster: 'box',
  relic: 'star',
  cosmetic: 'heart',
  bundle: 'bag',
};

export function renderBag(app: AppContext, root: HTMLElement) {
  let filter: Filter = 'all';
  const body = el('div', { class: 'screen-body' });
  root.append(body);

  const draw = () => {
    clear(body);
    const owned = app.state.ownedItemIds();
    const ownedWaifus = app.state.ownedWaifuList().filter((o) => WAIFU_BY_ID[o.id]);

    body.append(
      el('div', { class: 'screen-head' }, [
        el('div', { class: 'screen-title', text: 'INVENTORY' }),
        el('div', {
          class: 'screen-sub',
          text: `${ownedWaifus.length} waifus · ${owned.length} item stacks. Bind materials to a waifu, equip cosmetics, and collect relics and posters.`,
        }),
      ]),
    );

    // ── filters ──
    const filters = el('div', { class: 'filters' });
    const kinds: Filter[] = ['all', 'waifu', 'material', 'cosmetic', 'poster', 'relic', 'bundle'];
    for (const k of kinds) {
      const count =
        k === 'all'
          ? owned.length + ownedWaifus.length
          : k === 'waifu'
            ? ownedWaifus.length
            : owned.filter((id) => resolveItem(id)?.kind === k).length;
      if (k !== 'all' && count === 0) continue;
      const label = k === 'all' ? 'All' : k === 'waifu' ? 'Waifus' : KIND_LABEL[k as ItemKind];
      const icon: IconName = k === 'all' ? 'box' : k === 'waifu' ? 'heart' : KIND_ICON[k as ItemKind];
      const b = el('button', { class: `tab${filter === k ? ' active' : ''}` });
      b.append(iconLabel(icon, `${label} (${count})`, 14));
      b.addEventListener('click', () => {
        filter = k;
        draw();
      });
      filters.append(b);
    }
    body.append(filters);

    // ── waifus in the collection ──
    if (filter === 'all' || filter === 'waifu') {
      if (!ownedWaifus.length) {
        if (filter === 'waifu') {
          body.append(
            el('div', { class: 'empty' }, [
              el('span', { class: 'big' }, [pixelIcon('heart', 40)]),
              el('div', { text: 'No waifus yet. Clear a quest or pull from the Luck Royale.' }),
            ]),
          );
        }
      } else {
        body.append(el('div', { class: 'sheet-section' }, [el('h4', { text: 'YOUR WAIFUS' })]));
        const grid = el('div', { class: 'tile-row' });
        for (const o of ownedWaifus) {
          const w = WAIFU_BY_ID[o.id];
          const mats = app.state.materialsOf(o.id).length;
          const bonus = Math.round(app.state.materialBonus(o.id) * 100);
          grid.append(
            waifuCard(w, {
              owned: true,
              footer: [
                el('span', { class: 'card-meta', text: `LV ${o.connection.level}` }),
                (() => {
                  const s = el('span', { class: 'card-meta' });
                  s.append(iconLabel('flask', mats ? `${mats}/3 · +${bonus}%` : 'none', 13));
                  return s;
                })(),
              ],
              onClick: () => {
                import('./roster').then(({ openSheet }) => openSheet(app, w));
              },
            }),
          );
        }
        body.append(grid);
      }
    }

    // ── item stacks ──
    if (filter !== 'waifu') {
      let list = owned;
      if (filter !== 'all') list = list.filter((id) => resolveItem(id)?.kind === filter);

      list.sort((a, b) => {
        const da = resolveItem(a);
        const db = resolveItem(b);
        const ra = da?.rarity ?? 3;
        const rb = db?.rarity ?? 3;
        if (rb !== ra) return rb - ra;
        return (da?.name ?? a).localeCompare(db?.name ?? b);
      });

      if (!list.length) {
        body.append(
          el('div', { class: 'empty' }, [
            el('span', { class: 'big' }, [pixelIcon('bag', 40)]),
            el('div', { text: 'Empty. Pull from the Luck Royale or visit the store.' }),
          ]),
        );
      } else {
        if (filter === 'all') {
          body.append(el('div', { class: 'sheet-section' }, [el('h4', { text: 'MATERIALS & GOODS' })]));
        }
        const grid = el('div', { class: 'tile-row' });
        for (const id of list) {
          const def = resolveItem(id);
          if (!def) continue;
          const tile = itemTile(id, {
            count: app.state.itemCount(id),
            onClick: () => openItemDetail(app, id, draw),
          });
          if (def.rarity === 5) tile.style.borderColor = 'var(--r5)';
          grid.append(tile);
        }
        body.append(grid);
      }
    }
  };

  draw();
}

function openItemDetail(app: AppContext, itemId: string, refreshBag: () => void) {
  const def = resolveItem(itemId);
  if (!def) return;

  const backdrop = el('div', { class: 'sheet-backdrop' });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  const sheet = el('div', { class: 'panel sheet', style: 'max-width:520px' });
  const top = el('div', { class: 'sheet-top' });
  top.append(el('div', { class: 'sheet-portrait' }, [itemIcon(itemId, 130)]));

  const info = el('div', { class: 'sheet-info' });
  info.append(el('div', { class: 'sheet-name', text: def.name }));
  info.append(
    el('div', { class: 'sheet-series', text: `${'★'.repeat(def.rarity)} · ${def.kind}${def.slot ? ` · ${def.slot}` : ''}` }),
  );
  info.append(el('div', { class: 'sheet-bio', text: def.desc }));
  info.append(
    el('div', { class: 'card-meta', text: `Owned: ×${app.state.itemCount(itemId)}` }),
  );
  if (def.tags.length) {
    info.append(el('div', { class: 'card-meta', style: 'margin-top:6px', text: `Tags: ${def.tags.join(', ')}` }));
  }
  if (def.waifuId) {
    const w = WAIFU_BY_ID[def.waifuId];
    if (w) info.append(el('div', { class: 'card-meta', text: `Themed for: ${w.name} (${w.series})` }));
  }
  top.append(info);
  sheet.append(top);

  // ── contextual actions ──
  const actions = el('div', { class: 'dialogue-actions' });

  if (def.kind === 'material') {
    // ── bind to a waifu (permanent bonus) ──
    sheet.append(
      el('div', { class: 'sheet-section' }, [
        el('h4', { text: 'BIND TO A WAIFU' }),
        el('div', {
          class: 'card-meta',
          style: 'margin-bottom:8px',
          text: 'Bound materials raise every connection gain she receives. Up to three per waifu.',
        }),
      ]),
    );
    const bindOwners = app.state.ownedWaifuList().filter((o) => WAIFU_BY_ID[o.id]);
    if (!bindOwners.length) {
      sheet.append(el('div', { class: 'card-meta', text: 'You have no waifus yet.' }));
    } else {
      const bindRow = el('div', { class: 'tile-row' });
      for (const o of bindOwners) {
        const w = WAIFU_BY_ID[o.id];
        const bound = app.state.materialsOf(w.id).includes(itemId);
        const bonus = Math.round(app.state.materialBonus(w.id) * 100);
        const tile = el('div', { class: `tile${bound ? ' selected' : ''}` }, [
          el('div', { class: 'tile-name', text: w.name }),
          el('div', { class: 'card-meta', text: `${app.state.materialsOf(w.id).length}/3 bound · +${bonus}%` }),
          el('div', { class: 'card-meta', style: 'color:var(--rose)', text: bound ? 'Bound — tap to release' : 'Tap to bind' }),
        ]);
        if (bound) tile.style.borderColor = 'var(--rose)';
        tile.addEventListener('click', () => {
          if (bound) {
            app.state.unequipMaterial(w.id, itemId);
            app.toast(`${w.name} released ${def.name}.`, 'info');
          } else {
            const res = app.state.equipMaterial(w.id, itemId);
            if (!res.ok) {
              app.toast(res.reason ?? 'Could not bind.', 'bad');
              return;
            }
            app.toast(`${w.name} bound ${def.name}.`, 'good');
          }
          app.sync();
          backdrop.remove();
          refreshBag();
        });
        bindRow.append(tile);
      }
      sheet.append(bindRow);
    }

    // ── give as a gift (consumable XP) ──
    sheet.append(el('div', { class: 'sheet-section' }, [el('h4', { text: 'GIVE AS A GIFT' })]));
    const owners = app.state.ownedWaifuList().filter((o) => WAIFU_BY_ID[o.id]);
    if (!owners.length) {
      sheet.append(el('div', { class: 'card-meta', text: 'You have no waifus yet.' }));
    } else {
      const row = el('div', { class: 'tile-row' });
      for (const o of owners) {
        const w = WAIFU_BY_ID[o.id];
        const fav = def.tags.some((t) => w.giftTags.includes(t));
        const tile = el('div', { class: 'tile' }, [
          el('div', { class: 'tile-name', text: w.name }),
          el('div', { class: 'card-meta', text: `Lv ${o.connection.level}` }),
          fav ? el('div', { class: 'card-meta', style: 'color:var(--rose)' }, [
            iconLabel('heart', 'loves it', 12),
          ]) : null,
        ]);
        if (fav) tile.style.borderColor = 'var(--rose)';
        tile.addEventListener('click', () => {
          const res = app.state.giveGift(w.id, itemId);
          if (res.xp > 0) {
            app.sync();
            app.toast(
              res.leveled
                ? `${w.name} reached Lv ${app.state.data.waifus[w.id].connection.level}!`
                : `${w.name} +${res.xp} connection`,
              res.leveled ? 'good' : 'info',
            );
            backdrop.remove();
            refreshBag();
          }
        });
        row.append(tile);
      }
      sheet.append(row);
    }
  }

  if (def.kind === 'cosmetic' && def.slot) {
    sheet.append(el('div', { class: 'sheet-section' }, [el('h4', { text: 'EQUIP' })]));
    const candidates = app.state
      .ownedWaifuList()
      .filter((o) => !def.waifuId || def.waifuId === o.id)
      .filter((o) => WAIFU_BY_ID[o.id]);
    if (!candidates.length) {
      sheet.append(el('div', { class: 'card-meta', text: 'No eligible waifu owns this yet.' }));
    } else {
      const row = el('div', { class: 'tile-row' });
      for (const o of candidates) {
        const w = WAIFU_BY_ID[o.id];
        const equipped = o.equipped[def.slot] === itemId;
        const tile = el('div', { class: `tile${equipped ? ' selected' : ''}` }, [
          el('div', { class: 'tile-name', text: w.name }),
          el('div', { class: 'card-meta', text: equipped ? 'Equipped' : 'Tap to equip' }),
        ]);
        tile.addEventListener('click', () => {
          if (equipped) {
            app.state.unequip(w.id, def.slot!);
            app.toast(`${w.name} removed ${def.name}.`, 'info');
          } else {
            app.state.equip(w.id, itemId);
            app.toast(`${w.name} equipped ${def.name}.`, 'good');
          }
          app.sync();
          backdrop.remove();
          refreshBag();
        });
        row.append(tile);
      }
      sheet.append(row);
    }
  }

  if (def.kind === 'bundle') {
    const b = BUNDLE_BY_ID[itemId];
    if (b) {
      const w = WAIFU_BY_ID[b.waifuId];
      actions.append(
        el('button', {
          class: 'btn sage',
          onClick: () => {
            backdrop.remove();
            app.pendingQuestWaifu = b.waifuId;
            app.setScreen('world');
          },
        }, [iconLabel('map', `Enter ${w?.name ?? ''}'s world`)]),
      );
    }
  }

  if (def.kind === 'relic') {
    const owner = WAIFUS.find((w) => w.quest?.relics.some((r) => r.id === itemId));
    if (owner) {
      actions.append(
        el('button', {
          class: 'btn',
          onClick: () => {
            backdrop.remove();
            app.setScreen('roster');
          },
        }, [iconLabel('heart', `Show to ${owner.name}`)]),
      );
    }
  }

  const close = el('button', { class: 'btn ghost', text: 'Close' });
  close.addEventListener('click', () => backdrop.remove());
  actions.append(close);
  sheet.append(actions);

  backdrop.append(sheet);
  (document.getElementById('ui-root') as HTMLElement).append(backdrop);
}

export { clear };
