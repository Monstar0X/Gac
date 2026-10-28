import { el, clear } from '../dom';
import { iconLabel } from '../icons';
import { waifuPortrait, resolveItem } from '../components';
import { WAIFU_BY_ID } from '../../data/waifus';
import { GameState } from '../../game/state';
import type { AppContext } from '../../engine/app-stage';

/**
 * A cozy chat modal. Lines unlock as connection level rises; talking costs
 * nothing and gives a small connection tick once per visit.
 */
export function openDialogue(app: AppContext, waifuId: string) {
  const w = WAIFU_BY_ID[waifuId];
  if (!w) return;
  const owned = app.state.data.waifus[waifuId];
  if (!owned) return;

  const backdrop = el('div', { class: 'dialogue' });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  const box = el('div', { class: 'panel dialogue-box' });
  backdrop.append(box);
  (document.getElementById('ui-root') as HTMLElement).append(backdrop);

  let lineIndex = Math.min(
    w.dialogue.length - 1,
    Math.floor(owned.connection.level / 5),
  );

  const draw = () => {
    clear(box);
    const port = el('div', { class: 'dialogue-portrait' }, [waifuPortrait(w.id, 140, 0x241c2c)]);
    box.append(port);

    const content = el('div', { class: 'dialogue-content' });
    content.append(el('div', { class: 'dialogue-name', text: `${w.name.toUpperCase()} · CONNECTION LV ${owned.connection.level}` }));
    content.append(el('div', { class: 'dialogue-text', text: `"${w.dialogue[lineIndex]}"` }));

    const actions = el('div', { class: 'dialogue-actions' });

    const next = el('button', { class: 'btn' }, [iconLabel('chat', 'More ▸')]);
    next.addEventListener('click', () => {
      lineIndex = (lineIndex + 1) % w.dialogue.length;
      draw();
    });
    actions.append(next);

    // Gift shortcut: jump to her sheet's gift tab when materials are in stock.
    const hasGift = app
      .state
      .ownedItemIds()
      .some((id) => resolveItem(id)?.kind === 'material');
    if (hasGift) {
      const gift = el('button', { class: 'btn rose' }, [iconLabel('gift', 'Give a gift')]);
      gift.addEventListener('click', () => {
        backdrop.remove();
        import('./roster').then(({ openSheet }) => openSheet(app, w));
      });
      actions.append(gift);
    }

    // Connection meter inline
    const need = GameState.xpForLevel(owned.connection.level);
    const pct = Math.min(100, (owned.connection.xp / need) * 100);
    const meter = el('div', { style: 'margin-top:10px' }, [
      el('div', { class: 'conn-head' }, [
        el('span', { text: 'Connection' }),
        el('span', { text: `${owned.connection.xp}/${need}` }),
      ]),
      el('div', { class: 'conn-bar' }, [el('i', { style: `width:${pct}%` })]),
    ]);
    content.append(meter);

    const close = el('button', { class: 'btn ghost', text: 'Close' });
    close.addEventListener('click', () => backdrop.remove());
    actions.append(close);
    content.append(actions);

    box.append(content);
  };

  draw();

  // A small connection tick for spending time together.
  const tick = 12;
  owned.connection.xp += tick;
  let guard = 0;
  while (owned.connection.xp >= GameState.xpForLevel(owned.connection.level) && guard++ < 50) {
    owned.connection.xp -= GameState.xpForLevel(owned.connection.level);
    owned.connection.level += 1;
    app.toast(`${w.name} feels closer to you. Lv ${owned.connection.level}!`, 'good');
  }
  app.sync();
}

