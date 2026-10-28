import { el, clear, fmt } from '../dom';
import { iconLabel } from '../icons';
import { waifuPortrait, itemIcon, resolveItem, priceTag } from '../components';
import { BUNDLES, BUNDLE_BY_ID, PITY, PULL_COST, rollMany, type Bundle } from '../../game/gacha';
import { WAIFU_BY_ID } from '../../data/waifus';
import { ITEM_BY_ID } from '../../data/items';
import type { AppContext } from '../../engine/app-stage';
import type { PullResult } from '../../data/types';

export function renderGacha(app: AppContext, root: HTMLElement) {
  let selectedId = BUNDLES[0].id;

  const body = el('div', { class: 'screen-body' });
  root.append(body);

  const draw = () => {
    clear(body);
    const selected = BUNDLE_BY_ID[selectedId] ?? BUNDLES[0];

    // ── header ──
    body.append(
      el('div', { class: 'screen-head' }, [
        el('div', { class: 'screen-title', text: 'LUCK ROYALE' }),
        el('div', {
          class: 'screen-sub',
          text: 'Every pull grants materials. The headline prize is a bundle that unlocks a quest world.',
        }),
      ]),
    );

    // ── bundle strip ──
    const strip = el('div', { class: 'bundle-strip' });
    for (const b of BUNDLES) {
      strip.append(bundleCard(app, b, b.id === selectedId, () => {
        selectedId = b.id;
        draw();
      }));
    }
    body.append(strip);

    // ── pull bar ──
    const pity = app.state.data.gacha.pityBundle;
    const pityLeft = Math.max(0, PITY.bundle - pity);
    const alreadyHave = app.state.hasItem(selected.itemId);

    const bar = el('div', { class: 'panel pull-bar' });

    const singleCost = PULL_COST.single;
    const tenCost = PULL_COST.ten;

    const costLabel = (n: number) => {
      const wrap = el('span', { style: 'opacity:.75' }, [document.createTextNode(`· ${n} `)]);
      wrap.append(el('span', { class: 'ico ico-inline crystal' }));
      return wrap;
    };

    const single = el('button', { class: 'btn' }, [document.createTextNode('Pull ×1 '), costLabel(singleCost)]);
    single.disabled = !app.state.canAfford('crystals', singleCost);
    single.addEventListener('click', () => doPull(app, selected, 1, draw));

    const ten = el('button', { class: 'btn rose' }, [document.createTextNode('Pull ×10 '), costLabel(tenCost)]);
    ten.disabled = !app.state.canAfford('crystals', tenCost);
    ten.addEventListener('click', () => doPull(app, selected, 10, draw));

    bar.append(single, ten);

    // top up button
    const topUp = el('button', { class: 'btn ghost small' }, [iconLabel('plus', 'Get crystals')]);
    topUp.addEventListener('click', () => {
      app.setScreen('store');
    });
    bar.append(topUp);

    body.append(bar);

    // ── pity + status ──
    const info = el('div', { class: 'rate-note' });
    info.append(
      el('div', {}, [
        el('span', { text: `Guaranteed bundle in ${pityLeft} pull${pityLeft === 1 ? '' : 's'}. ` }),
        el('span', {
          text: alreadyHave
            ? 'You already own this bundle — duplicates refund 150 crystals.'
            : 'Owning the bundle unlocks her quest world.',
          style: alreadyHave ? 'color:var(--sage)' : 'color:var(--amber-soft)',
        }),
      ]),
    );
    info.append(
      el('div', { style: 'margin-top:6px;opacity:.8', text:
        `Bundle rate ${(0.018 * 100).toFixed(1)}% · 5★ ${(5).toFixed(0)}% · 4★ 33% · guaranteed 4★ every ${PITY.fourStar} pulls.` }),
    );
    body.append(info);

    // ── what's inside this bundle ──
    body.append(buildPoolPreview(app, selected));
  };

  draw();
}

function bundleCard(app: AppContext, b: Bundle, selected: boolean, onClick: () => void): HTMLElement {
  const waifu = WAIFU_BY_ID[b.waifuId];
  const owned = app.state.hasItem(b.itemId);
  const questDone = app.state.data.waifus[b.waifuId]?.questComplete ?? false;
  const pity = app.state.data.gacha.pityBundle;

  const card = el('div', {
    class: `bundle-card${selected ? ' selected' : ''}${questDone ? ' locked-bundle' : ''}`,
  });
  card.addEventListener('click', onClick);

  const art = el('div', { class: 'bundle-art' }, [waifuPortrait(b.waifuId, 132, 0x241c2c)]);
  card.append(art);

  const info = el('div', { class: 'bundle-info' }, [
    el('div', { class: 'bundle-name', text: b.name.toUpperCase() }),
    el('div', { class: 'bundle-tag', text: b.tagline }),
  ]);

  // progress toward pity
  const prog = el('div', { class: 'bundle-progress' }, [
    el('i', { style: `width:${Math.min(100, (pity / PITY.bundle) * 100)}%` }),
  ]);
  info.append(prog);
  info.append(
    el('div', { class: 'bundle-pity' }, [
      el('span', { text: `${Math.max(0, PITY.bundle - pity)} to pity` }),
      el('span', {
        text: questDone ? '✓ Quest done' : owned ? '✓ Bundle owned' : '',
        style: 'color:var(--sage)',
      }),
    ]),
  );
  card.append(info);

  if (waifu) {
    card.append(
      el('div', { class: 'ribbon-tag', text: `${waifu.series.toUpperCase()}` }),
    );
  }
  return card;
}

function buildPoolPreview(app: AppContext, b: Bundle): HTMLElement {
  const section = el('div', { class: 'shop-section' });
  section.append(
    el('div', { class: 'shop-head' }, [
      el('h3', { text: `INSIDE THE ${b.name.toUpperCase()}` }),
    ]),
  );

  const waifu = WAIFU_BY_ID[b.waifuId];
  const row = el('div', { class: 'shop-row' });

  // headline: the bundle itself
  row.append(poolEntry(app, b.itemId, 'Headline prize · unlocks the quest world'));

  // a few themed items
  const themed = b.poolItems
    .map((id) => ITEM_BY_ID[id])
    .filter((i) => i && i.waifuId === b.waifuId && i.kind !== 'bundle')
    .slice(0, 7);
  for (const t of themed) {
    row.append(poolEntry(app, t.id, t.desc));
  }

  // the waifu card
  if (waifu) {
    const card = el('div', { class: 'shop-item' });
    const top = el('div', { class: 'shop-item-top' }, [
      waifuPortrait(waifu.id, 56, 0x241c2c),
      el('div', {}, [
        el('div', { class: 'shop-item-name', text: waifu.name }),
        el('div', { class: 'card-meta', text: `★${waifu.rarity} · ${waifu.series}` }),
      ]),
    ]);
    card.append(top);
    card.append(
      el('div', { class: 'shop-item-desc', text: 'Recruit her by completing her quest world.' }),
    );
    card.append(
      el('div', { class: 'shop-item-foot' }, [
        el('span', {
          class: 'stock-pill',
          text: app.state.ownsWaifu(waifu.id) ? 'Recruited' : 'Quest reward',
        }),
      ]),
    );
    row.append(card);
  }

  section.append(row);
  return section;
}

function poolEntry(app: AppContext, itemId: string, desc: string): HTMLElement {
  const def = resolveItem(itemId);
  const owned = app.state.itemCount(itemId);
  const card = el('div', { class: 'shop-item' });
  card.append(
    el('div', { class: 'shop-item-top' }, [
      itemIcon(itemId, 56),
      el('div', {}, [
        el('div', { class: 'shop-item-name', text: def?.name ?? itemId }),
        el('div', { class: 'card-meta', text: def ? `★${def.rarity}` : '' }),
      ]),
    ]),
  );
  card.append(el('div', { class: 'shop-item-desc', text: desc }));
  card.append(
    el('div', { class: 'shop-item-foot' }, [
      el('span', { class: 'stock-pill', text: owned > 0 ? `Owned ×${owned}` : 'Not yet pulled' }),
    ]),
  );
  return card;
}

function doPull(app: AppContext, bundle: Bundle, count: number, redraw: () => void) {
  const cost = count === 1 ? PULL_COST.single : PULL_COST.ten;
  if (!app.state.spend('crystals', cost)) {
    app.toast('Not enough crystals.', 'bad');
    return;
  }

  const results = rollMany(bundle, count, app.state.data.gacha, app.state.gachaContext());
  for (const r of results) app.state.applyPull(r);
  app.state.data.stats.totalPulls += count;
  app.state.data.bundlePulls[bundle.id] = (app.state.data.bundlePulls[bundle.id] ?? 0) + count;
  app.sync();

  showReveal(app, results, redraw);
}

function showReveal(app: AppContext, results: PullResult[], onClose: () => void) {
  const overlay = el('div', { class: 'reveal' });
  const best = results.reduce((a, b) => (b.rarity > a.rarity ? b : a), results[0]);

  overlay.append(
    el('div', {
      class: 'reveal-title',
      text: best.rarity === 5 ? '★ A RARE FIND ★' : 'PULL RESULTS',
    }),
  );

  const grid = el('div', { class: 'reveal-grid' });
  results.forEach((r, i) => {
    const cell = el('div', { class: `reveal-cell r${r.rarity}` });
    cell.style.animationDelay = `${i * 0.06}s`;

    if (r.kind === 'waifu' && r.waifuId) {
      cell.append(waifuPortrait(r.waifuId, 96, 0x241c2c));
      cell.append(el('div', { class: 'cell-label', text: WAIFU_BY_ID[r.waifuId]?.name ?? '' }));
    } else if (r.itemId) {
      cell.append(itemIcon(r.itemId, 72));
      const def = resolveItem(r.itemId);
      cell.append(el('div', { class: 'cell-label', text: def?.name ?? '' }));
    }

    if (r.duplicate) {
      cell.append(el('div', { class: 'dupe-tag', text: 'DUPE' }));
    }
    grid.append(cell);
  });
  overlay.append(grid);

  // summary line
  const bundles = results.filter((r) => r.kind === 'bundle' && !r.duplicate);
  const waifus = results.filter((r) => r.kind === 'waifu' && !r.duplicate);
  const refunds = results.filter((r) => r.duplicate).reduce((a, r) => a + (r.refund ?? 0), 0);

  const parts: string[] = [];
  if (bundles.length) parts.push(`${bundles.length} bundle${bundles.length > 1 ? 's' : ''}!`);
  if (waifus.length) parts.push(`${waifus.length} new waifu${waifus.length > 1 ? 's' : ''}`);
  if (refunds) parts.push(`+${refunds} crystals refunded`);
  if (!parts.length) parts.push('Materials added to your bag.');

  overlay.append(el('div', { class: 'rate-note', text: parts.join(' · ') }));

  const close = el('button', { class: 'btn', text: 'Continue' });
  close.addEventListener('click', () => {
    overlay.remove();
    onClose();
    if (bundles.length) {
      app.toast('Bundle unlocked! Head to Quests to enter her world.', 'good');
    }
  });
  overlay.append(close);

  (document.getElementById('ui-root') as HTMLElement).append(overlay);
}

export { fmt };
