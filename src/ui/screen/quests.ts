import { el, clear } from '../dom';
import { pixelIcon, iconLabel } from '../icons';
import { waifuPortrait, itemIcon, resolveItem } from '../components';
import { FEATURED_WAIFUS } from '../../data/waifus';
import { THEMES } from '../../data/themes';
import type { AppContext } from '../../engine/app-stage';

/**
 * Quest select. Featured waifus are listed with their themed world. A quest is
 * playable once the matching bundle has been pulled from the Luck Royale.
 */
export function renderQuests(app: AppContext, root: HTMLElement) {
  const body = el('div', { class: 'screen-body' });
  root.append(body);

  body.append(
    el('div', { class: 'screen-head' }, [
      el('div', { class: 'screen-title', text: 'QUEST WORLDS' }),
      el('div', {
        class: 'screen-sub',
        text: 'Each featured waifu hides four keepsakes in her world. Find them all, then meet her at the prime location.',
      }),
    ]),
  );

  // ── stats ──
  const stats = el('div', { class: 'stat-grid' });
  const owned = app.state.ownedWaifuList().length;
  const unlocked = FEATURED_WAIFUS.filter((w) => app.state.questUnlocked(w.id)).length;
  const done = FEATURED_WAIFUS.filter((w) => app.state.data.waifus[w.id]?.questComplete).length;
  stats.append(
    stat(String(owned), 'Waifus'),
    stat(`${unlocked}/${FEATURED_WAIFUS.length}`, 'Worlds open'),
    stat(String(done), 'Quests done'),
    stat(String(app.state.data.stats.relicsFound), 'Relics found'),
  );
  body.append(stats);

  const list = el('div', { style: 'display:flex;flex-direction:column;gap:14px;max-width:1000px;margin:0 auto' });

  for (const w of FEATURED_WAIFUS) {
    list.append(questCard(app, w.id));
  }

  body.append(list);
}

function stat(v: string, k: string): HTMLElement {
  return el('div', { class: 'stat' }, [
    el('span', { class: 'v', text: v }),
    el('span', { class: 'k', text: k }),
  ]);
}

function questCard(app: AppContext, waifuId: string): HTMLElement {
  const w = FEATURED_WAIFUS.find((x) => x.id === waifuId)!;
  const quest = w.quest!;
  const unlocked = app.state.questUnlocked(waifuId);
  const ownedState = app.state.data.waifus[waifuId];
  const complete = ownedState?.questComplete ?? false;
  const progress = app.state.questState(waifuId);
  const found = progress.relics.filter((r) => quest.relics.some((q) => q.id === r)).length;

  const card = el('div', { class: `quest-card${complete ? ' done' : ''}` });

  const art = el('div', { class: 'quest-card-art' }, [waifuPortrait(waifuId, 120, 0x241c2c)]);
  card.append(art);

  const info = el('div', { class: 'quest-card-info' });
  info.append(el('div', { class: 'quest-card-title', text: quest.title.toUpperCase() }));
  info.append(el('div', { class: 'quest-card-series', text: `${w.name} · ${w.series}` }));
  info.append(el('div', { class: 'quest-card-intro', text: quest.intro }));

  // relic checklist
  const relics = el('div', { class: 'relic-list', style: 'max-width:420px;margin-bottom:10px' });
  for (const r of quest.relics) {
    const has = progress.relics.includes(r.id);
    const row = el('div', { class: `relic-row${has ? ' found' : ''}` });
    row.append(itemIcon(r.id, 32));
    row.append(el('span', { text: r.name }));
    if (has) row.append(el('span', { class: 'tick', text: '✓' }));
    relics.append(row);
  }
  info.append(relics);

  // world + prime hint
  const theme = THEMES[w.theme ?? 'walls'];
  info.append(
    el('div', {
      class: 'card-meta',
      text: `World: ${theme.name} · Prime location: ${quest.primeName}`,
    }),
  );

  // actions
  const actions = el('div', { class: 'quest-card-actions', style: 'margin-top:12px' });

  if (!unlocked) {
    const locked = el('div', { class: 'locked-note' }, [
      el('span', {}, [pixelIcon('lock', 16)]),
      el('span', { text: `Pull her bundle from the Luck Royale to open this world.` }),
    ]);
    actions.append(locked);
    const go = el('button', { class: 'btn' }, [iconLabel('star', 'Go to Luck Royale')]);
    go.addEventListener('click', () => app.setScreen('gacha'));
    actions.append(go);
  } else if (complete) {
    const done = el('span', { class: 'chip', style: 'border-color:var(--sage);color:var(--sage)', text: `✓ Recruited · ${found}/4 relics` });
    actions.append(done);
    const revisit = el('button', { class: 'btn ghost' }, [iconLabel('map', 'Visit her world')]);
    revisit.addEventListener('click', () => openWorld(app, waifuId));
    actions.append(revisit);
    const talk = el('button', { class: 'btn sage' }, [iconLabel('chat', `Talk to ${w.name}`)]);
    talk.addEventListener('click', () => {
      import('./dialogue').then(({ openDialogue }) => openDialogue(app, waifuId));
    });
    actions.append(talk);
  } else {
    const label = found > 0 ? `Resume quest · ${found}/4 found` : 'Begin quest';
    const go = el('button', { class: 'btn rose' }, [iconLabel('play', label)]);
    go.addEventListener('click', () => openWorld(app, waifuId));
    actions.append(go);
  }

  info.append(actions);
  card.append(info);
  return card;
}

function openWorld(app: AppContext, waifuId: string) {
  app.pendingQuestWaifu = waifuId;
  app.setScreen('world');
}

export { clear, resolveItem };
