import { el, clear, fmt, stars, hexColor } from './dom';
import { drawPortrait, drawItemIcon } from './portraits';
import { WAIFU_BY_ID } from '../data/waifus';
import { ITEM_BY_ID } from '../data/items';
import { BUNDLE_BY_ID, bundleItemDef } from '../game/gacha';
import type { ItemDef, Rarity, Waifu } from '../data/types';

/** Resolve an item definition, including runtime-registered bundles. */
export function resolveItem(itemId: string): ItemDef | undefined {
  if (ITEM_BY_ID[itemId]) return ITEM_BY_ID[itemId];
  const b = BUNDLE_BY_ID[itemId];
  return b ? bundleItemDef(b) : undefined;
}

export function waifuPortrait(waifuId: string, size = 128, bg: number | null = 0x2a2233): HTMLCanvasElement {
  const w = WAIFU_BY_ID[waifuId];
  const c = document.createElement('canvas');
  if (w) drawPortrait(c, w.spec, { size, background: bg, rarity: w.rarity });
  return c;
}

export function itemIcon(itemId: string, size = 48): HTMLCanvasElement {
  const def = resolveItem(itemId);
  const c = document.createElement('canvas');
  drawItemIcon(c, def?.icon ?? 'seal', def?.color ?? 0xffffff, size);
  return c;
}

/** A roster/gacha card for a waifu. */
export function waifuCard(
  waifu: Waifu,
  opts: {
    owned?: boolean;
    selected?: boolean;
    ribbon?: string;
    footer?: (Node | string | null)[];
    onClick?: () => void;
  } = {},
): HTMLElement {
  const card = el('div', {
    class: `card r${waifu.rarity}${opts.owned === false ? ' locked' : ''}${opts.selected ? ' selected' : ''}`,
  });
  if (opts.onClick) card.addEventListener('click', opts.onClick);

  const art = el('div', { class: 'card-art' }, [
    waifuPortrait(waifu.id, 118, 0x241c2c),
  ]);
  art.append(
    el('div', { class: `card-stars r${waifu.rarity}`, text: stars(waifu.rarity) }),
  );
  card.append(art);

  if (opts.ribbon) card.append(el('div', { class: 'ribbon-tag', text: opts.ribbon }));

  const body = el('div', { class: 'card-body' }, [
    el('div', { class: 'card-name', text: waifu.name }),
    el('div', { class: 'card-meta', text: waifu.series }),
  ]);
  if (opts.footer?.length) {
    body.append(el('div', { class: 'card-foot' }, opts.footer));
  }
  card.append(body);

  if (opts.owned === false) {
    card.append(el('div', { class: 'lock-tag', text: 'NOT RECRUITED' }));
  }
  return card;
}

/** A compact item tile with icon, name and optional count badge. */
export function itemTile(
  itemId: string,
  opts: {
    count?: number;
    selected?: boolean;
    disabled?: boolean;
    big?: boolean;
    onClick?: () => void;
    sub?: string | Node;
  } = {},
): HTMLElement {
  const def = resolveItem(itemId);
  const tile = el('div', {
    class: `tile${opts.selected ? ' selected' : ''}${opts.disabled ? ' disabled' : ''}${opts.big ? ' big' : ''}`,
  });
  if (opts.onClick && !opts.disabled) tile.addEventListener('click', opts.onClick);
  tile.append(itemIcon(itemId, opts.big ? 84 : 48));
  tile.append(el('div', { class: 'tile-name', text: def?.name ?? itemId }));
  if (opts.sub) {
    const sub = el('div', { class: 'card-meta' });
    if (typeof opts.sub === 'string') sub.textContent = opts.sub;
    else sub.append(opts.sub);
    tile.append(sub);
  }
  if (opts.count !== undefined) {
    tile.append(el('div', { class: 'tile-count', text: `×${opts.count}` }));
  }
  return tile;
}

export function rarityChip(r: Rarity): HTMLElement {
  return el('span', { class: `chip r${r}`, text: stars(r) });
}

export function tagPills(tags: string[]): HTMLElement {
  return el(
    'div',
    { class: 'tagrow' },
    tags.map((t) => el('span', { class: 'tag-pill', text: t })),
  );
}

export function coinIcon(): HTMLElement {
  return el('span', { class: 'ico coin' });
}

export function crystalIcon(): HTMLElement {
  return el('span', { class: 'ico crystal' });
}

export function priceTag(amount: number, currency: 'coins' | 'crystals' | 'royalTokens'): HTMLElement {
  const ico = currency === 'coins' ? 'coin' : currency === 'crystals' ? 'crystal' : 'token';
  return el('span', { class: 'price' }, [
    el('span', { class: `ico ${ico}` }),
    el('span', { text: amount.toLocaleString('en-US') }),
  ]);
}

/** A confirmation modal. Resolves true when confirmed. */
export function confirmModal(
  parent: HTMLElement,
  opts: { title: string; text: string; confirm?: string; cancel?: string },
): Promise<boolean> {
  return new Promise((resolve) => {
    const close = (v: boolean) => {
      modal.remove();
      resolve(v);
    };
    const box = el('div', { class: 'panel modal-box' }, [
      el('div', { class: 'modal-title', text: opts.title }),
      el('div', { class: 'modal-text', text: opts.text }),
      el('div', { class: 'modal-actions' }, [
        el('button', {
          class: 'btn ghost',
          text: opts.cancel ?? 'Cancel',
          onClick: () => close(false),
        }),
        el('button', {
          class: 'btn',
          text: opts.confirm ?? 'Confirm',
          onClick: () => close(true),
        }),
      ]),
    ]);
    const modal = el('div', { class: 'modal' }, [box]);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close(false);
    });
    parent.append(modal);
  });
}

export { el, clear, fmt, stars, hexColor };
