import { el, clear, fmt } from '../dom';
import { iconLabel, type IconName } from '../icons';
import { itemIcon, resolveItem, priceTag } from '../components';
import { SHOP, CURRENCY_PACKS, ITEMS, ITEM_BY_ID } from '../../data/items';
import { FEATURED_WAIFUS, WAIFU_BY_ID } from '../../data/waifus';
import { BUNDLES, BUNDLE_BY_ID } from '../../game/gacha';
import type { AppContext } from '../../engine/app-stage';

type Section = 'materials' | 'cosmetics' | 'bundles' | 'currency' | 'royal';

export function renderStore(app: AppContext, root: HTMLElement) {
  let section: Section = 'materials';
  const body = el('div', { class: 'screen-body' });
  root.append(body);

  const draw = () => {
    clear(body);
    body.append(
      el('div', { class: 'screen-head' }, [
        el('div', { class: 'screen-title', text: 'STORE' }),
        el('div', {
          class: 'screen-sub',
          text: 'Materials raise connection. Cosmetics change how she looks. Coins, crystals and Royal Tokens each buy their own stock.',
        }),
      ]),
    );

    // ── tabs ──
    const tabs = el('div', { class: 'filters' });
    const opts: { id: Section; label: string; icon: IconName }[] = [
      { id: 'materials', label: 'Materials', icon: 'gift' },
      { id: 'cosmetics', label: 'Cosmetics', icon: 'heart' },
      { id: 'bundles', label: 'Bundles', icon: 'star' },
      { id: 'currency', label: 'Crystals', icon: 'gear' },
      { id: 'royal', label: 'Royal', icon: 'crown' },
    ];
    for (const o of opts) {
      const b = el('button', { class: `tab${section === o.id ? ' active' : ''}` });
      b.append(iconLabel(o.icon, o.label, 14));
      b.addEventListener('click', () => {
        section = o.id;
        draw();
      });
      tabs.append(b);
    }
    body.append(tabs);

    if (section === 'materials') drawMaterials(app, body, draw);
    if (section === 'cosmetics') drawCosmetics(app, body, draw);
    if (section === 'bundles') drawBundles(app, body, draw);
    if (section === 'currency') drawCurrency(app, body, draw);
    if (section === 'royal') drawRoyal(app, body, draw);
  };

  draw();
}

function sectionHead(title: string, sub: string): HTMLElement {
  const h = el('div', { class: 'shop-head' });
  h.append(el('h3', { text: title }));
  h.append(el('span', { class: 'card-meta', text: sub }));
  return h;
}

function drawMaterials(app: AppContext, body: HTMLElement, redraw: () => void) {
  const sec = el('div', { class: 'shop-section' });
  sec.append(sectionHead('MATERIALS', 'Gift these to a waifu to raise her connection level.'));

  const row = el('div', { class: 'shop-row' });
  const entries = SHOP.filter((s) => resolveItem(s.itemId)?.kind === 'material');

  for (const e of entries) {
    const def = resolveItem(e.itemId);
    if (!def) continue;
    const stock = app.state.stockFor(e.itemId, e.stock);
    const soldOut = stock === 0;
    const canBuy = !soldOut && app.state.canAfford(e.currency, e.price);

    const card = el('div', { class: `shop-item${soldOut ? ' sold-out' : ''}` });
    card.append(
      el('div', { class: 'shop-item-top' }, [
        itemIcon(e.itemId, 56),
        el('div', {}, [
          el('div', { class: 'shop-item-name', text: def.name }),
          el('div', { class: 'card-meta', text: `${'★'.repeat(def.rarity)} · ${def.tags.join(', ')}` }),
        ]),
      ]),
    );
    card.append(el('div', { class: 'shop-item-desc', text: def.desc }));

    const foot = el('div', { class: 'shop-item-foot' });
    if (def.waifuId) {
      const w = WAIFU_BY_ID[def.waifuId];
      foot.append(el('span', { class: 'stock-pill', text: w ? `${w.name} themed` : 'Themed' }));
    }
    if (e.stock > 0) {
      foot.append(el('span', { class: 'stock-pill', text: `Stock ${stock}` }));
    }
    foot.append(priceTag(e.price, e.currency));

    const buy = el('button', {
      class: `btn tiny${canBuy ? '' : ' ghost'}`,
      text: soldOut ? 'Sold out' : 'Buy',
    });
    buy.disabled = !canBuy;
    buy.addEventListener('click', () => {
      if (!app.state.spend(e.currency, e.price)) {
        app.toast('Not enough coins.', 'bad');
        return;
      }
      app.state.addItem(e.itemId, 1);
      app.state.consumeStock(e.itemId, e.stock);
      app.sync();
      app.toast(`Bought ${def.name}.`, 'good');
      redraw();
    });
    foot.append(buy);
    card.append(foot);
    row.append(card);
  }

  sec.append(row);
  body.append(sec);
}

function drawCosmetics(app: AppContext, body: HTMLElement, redraw: () => void) {
  const sec = el('div', { class: 'shop-section' });
  sec.append(sectionHead('COSMETICS', 'Equip these on a waifu to change her look.'));

  const row = el('div', { class: 'shop-row' });
  const entries = SHOP.filter((s) => resolveItem(s.itemId)?.kind === 'cosmetic');

  for (const e of entries) {
    const def = resolveItem(e.itemId);
    if (!def) continue;
    const owned = app.state.hasItem(e.itemId);
    const stock = app.state.stockFor(e.itemId, e.stock);
    const soldOut = !owned && stock === 0;
    const canBuy = !owned && !soldOut && app.state.canAfford(e.currency, e.price);

    const card = el('div', { class: `shop-item${soldOut ? ' sold-out' : ''}` });
    card.append(
      el('div', { class: 'shop-item-top' }, [
        itemIcon(e.itemId, 56),
        el('div', {}, [
          el('div', { class: 'shop-item-name', text: def.name }),
          el('div', { class: 'card-meta', text: `${def.slot ?? 'style'}${def.waifuId ? ` · ${WAIFU_BY_ID[def.waifuId]?.name}` : ''}` }),
        ]),
      ]),
    );
    card.append(el('div', { class: 'shop-item-desc', text: def.desc }));

    const foot = el('div', { class: 'shop-item-foot' });
    foot.append(
      el('span', {
        class: 'stock-pill',
        text: owned ? '✓ Owned' : soldOut ? 'Sold out' : 'In stock',
        style: owned ? 'color:var(--sage);border-color:var(--sage)' : '',
      }),
    );
    if (!owned) foot.append(priceTag(e.price, e.currency));

    const buy = el('button', {
      class: `btn tiny${canBuy ? '' : ' ghost'}`,
      text: owned ? 'Owned' : 'Buy',
    });
    buy.disabled = !canBuy;
    buy.addEventListener('click', () => {
      if (!app.state.spend(e.currency, e.price)) {
        app.toast('Not enough coins.', 'bad');
        return;
      }
      app.state.addItem(e.itemId, 1);
      app.state.consumeStock(e.itemId, e.stock);
      app.sync();
      app.toast(`Bought ${def.name}.`, 'good');
      redraw();
    });
    foot.append(buy);
    card.append(foot);
    row.append(card);
  }

  sec.append(row);
  body.append(sec);
}

function drawBundles(app: AppContext, body: HTMLElement, redraw: () => void) {
  const sec = el('div', { class: 'shop-section' });
  sec.append(
    sectionHead('BUNDLES', 'Bundles unlock quest worlds. Pull them from the Luck Royale — not sold here.'),
  );

  const row = el('div', { class: 'shop-row' });
  for (const b of BUNDLES) {
    const w = WAIFU_BY_ID[b.waifuId];
    const owned = app.state.hasItem(b.itemId);
    const card = el('div', { class: 'shop-item' });
    card.append(
      el('div', { class: 'shop-item-top' }, [
        itemIcon(b.itemId, 56),
        el('div', {}, [
          el('div', { class: 'shop-item-name', text: b.name }),
          el('div', { class: 'card-meta', text: b.series }),
        ]),
      ]),
    );
    card.append(el('div', { class: 'shop-item-desc', text: b.tagline }));
    const foot = el('div', { class: 'shop-item-foot' });
    foot.append(
      el('span', {
        class: 'stock-pill',
        text: owned ? '✓ Owned' : 'Royale only',
        style: owned ? 'color:var(--sage);border-color:var(--sage)' : '',
      }),
    );
    if (!owned) {
      const go = el('button', { class: 'btn tiny', text: 'Pull' });
      go.addEventListener('click', () => app.setScreen('gacha'));
      foot.append(go);
    } else if (w && app.state.questUnlocked(w.id)) {
      const go = el('button', { class: 'btn tiny sage', text: 'Quest' });
      go.addEventListener('click', () => {
        app.pendingQuestWaifu = w.id;
        app.setScreen('world');
      });
      foot.append(go);
    }
    card.append(foot);
    row.append(card);
  }
  sec.append(row);
  body.append(sec);
  void redraw;
}

function drawCurrency(app: AppContext, body: HTMLElement, redraw: () => void) {
  const sec = el('div', { class: 'shop-section' });
  sec.append(sectionHead('CRYSTALS & COINS', 'Free supplies. Claim them to keep pulling.'));

  const row = el('div', { class: 'shop-row' });
  for (const p of CURRENCY_PACKS) {
    const card = el('div', { class: 'shop-item' });
    card.append(
      el('div', { class: 'shop-item-top' }, [
        el('div', { class: `ico ico-lg ${p.crystals ? 'crystal' : 'coin'}` }),
        el('div', {}, [
          el('div', { class: 'shop-item-name', text: p.label }),
          el('div', {
            class: 'card-meta',
            text: [p.coins ? `+${fmt(p.coins)} coins` : '', p.crystals ? `+${fmt(p.crystals)} crystals` : '']
              .filter(Boolean)
              .join(' · '),
          }),
        ]),
      ]),
    );
    card.append(el('div', { class: 'shop-item-desc', text: 'Free supply drop. Available once per day.' }));

    const claimedToday = !app.state.canClaimDaily();
    const buy = el('button', {
      class: `btn tiny${claimedToday ? ' ghost' : ' sage'}`,
      text: claimedToday ? 'Claimed today' : 'Claim',
    });
    buy.disabled = claimedToday;
    buy.addEventListener('click', () => {
      const got = app.state.claimDaily();
      if (got) {
        app.sync();
        app.toast(`Claimed +${got.coins} coins · +${got.crystals} crystals`, 'good');
        redraw();
      }
    });
    const foot = el('div', { class: 'shop-item-foot' });
    foot.append(buy);
    card.append(foot);
    row.append(card);
  }
  sec.append(row);
  body.append(sec);
}

function drawRoyal(app: AppContext, body: HTMLElement, redraw: () => void) {
  const sec = el('div', { class: 'shop-section' });
  sec.append(
    sectionHead(
      'ROYAL EXCHANGE',
      'Paid for with Royal Tokens, earned from quests and the Royal Quiz.',
    ),
  );

  const balance = el('div', { class: 'filters' });
  const balChip = el('div', { class: 'tab' });
  balChip.append(iconLabel('crown', `${fmt(app.state.royalTokens)} Royal Tokens`, 14));
  balance.append(balChip);
  sec.append(balance);

  const row = el('div', { class: 'shop-row' });
  const entries = SHOP.filter((s) => s.currency === 'royalTokens');

  for (const e of entries) {
    const def = resolveItem(e.itemId);
    if (!def) continue;
    const owned = def.kind === 'cosmetic' && app.state.hasItem(e.itemId);
    const canBuy = !owned && app.state.canAfford('royalTokens', e.price);

    const card = el('div', { class: 'shop-item' });
    card.append(
      el('div', { class: 'shop-item-top' }, [
        itemIcon(e.itemId, 56),
        el('div', {}, [
          el('div', { class: 'shop-item-name', text: def.name }),
          el('div', { class: 'card-meta', text: def.kind === 'cosmetic' ? `${def.slot ?? 'style'} · any waifu` : 'material · strongest gift' }),
        ]),
      ]),
    );
    card.append(el('div', { class: 'shop-item-desc', text: def.desc }));

    const foot = el('div', { class: 'shop-item-foot' });
    foot.append(
      el('span', {
        class: 'stock-pill',
        text: owned ? '✓ Owned' : 'Available',
        style: owned ? 'color:var(--sage);border-color:var(--sage)' : '',
      }),
    );
    foot.append(priceTag(e.price, 'royalTokens'));

    const buy = el('button', {
      class: `btn tiny${canBuy ? '' : ' ghost'}`,
      text: owned ? 'Owned' : 'Redeem',
    });
    buy.disabled = !canBuy;
    buy.addEventListener('click', () => {
      if (!app.state.spend('royalTokens', e.price)) {
        app.toast('Not enough Royal Tokens. Try the quiz.', 'bad');
        return;
      }
      app.state.addItem(e.itemId, 1);
      app.sync();
      app.toast(`Redeemed ${def.name}.`, 'good');
      redraw();
    });
    foot.append(buy);
    card.append(foot);
    row.append(card);
  }

  sec.append(row);
  body.append(sec);
}

export { ITEMS, ITEM_BY_ID, BUNDLE_BY_ID, FEATURED_WAIFUS };

