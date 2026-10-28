import { el } from '../dom';
import { pixelIcon, iconLabel } from '../icons';
import { itemIcon, waifuPortrait } from '../components';
import { WAIFU_BY_ID } from '../../data/waifus';
import { THEMES } from '../../data/themes';
import { OverworldScene } from '../../engine/overworld';
import type { AppContext } from '../../engine/app-stage';
import type { Waifu } from '../../data/types';

/**
 * The full-bleed quest overworld mode. Mounts an `OverworldScene` on the shared
 * stage and renders the handheld HUD: relic checklist, compass, prompt, D-pad
 * and A/B action buttons.
 *
 * HUD nodes are created first, then the scene is mounted, so the scene's
 * callbacks can safely reference them from its very first frame.
 */
export function renderWorld(app: AppContext): HTMLElement {
  const waifuId = app.pendingQuestWaifu ?? Object.keys(app.state.data.waifus)[0] ?? 'mikasa';
  const waifu = WAIFU_BY_ID[waifuId];

  const root = el('div', { class: 'quest-hud' });

  if (!waifu || !waifu.quest || !app.state.questUnlocked(waifu.id)) {
    root.append(
      el('div', { class: 'empty' }, [
        el('span', { class: 'big' }, [pixelIcon('lock', 40)]),
        el('div', { text: 'That world is not unlocked yet. Pull the bundle first.' }),
      ]),
    );
    const back = el('button', {
      class: 'btn',
      text: '← Back to Quests',
      style: 'margin:20px auto;display:block',
    });
    back.addEventListener('click', () => app.setScreen('quests'));
    root.append(back);
    return root;
  }

  const theme = THEMES[waifu.theme ?? 'walls'];
  const quest = waifu.quest;

  // ── 1. HUD nodes, created before the scene so callbacks are always safe ──
  const promptEl = el('div', { class: 'prompt' });
  promptEl.style.display = 'none';

  const compassEl = el('div', { class: 'compass' });
  const needle = el('div', { class: 'needle' });
  const compassLabel = el('div', { class: 'compass-label' });
  compassEl.append(needle, compassLabel);

  const rows = new Map<string, HTMLElement>();
  const relicList = el('div', { class: 'relic-list', style: 'margin-top:9px' });
  for (const r of quest.relics) {
    const row = el('div', { class: 'relic-row' }, [itemIcon(r.id, 30), el('span', { text: r.name })]);
    relicList.append(row);
    rows.set(r.id, row);
  }

  const hint = el('div', { class: 'quest-hint' });

  const panel = el('div', { class: 'panel quest-panel' }, [
    el('div', { class: 'quest-world', text: theme.name.toUpperCase() }),
    el('div', { class: 'card-meta', text: `Prime: ${quest.primeName}` }),
    relicList,
    hint,
  ]);

  const refreshRelics = () => {
    const st = app.state.questState(waifu.id);
    let found = 0;
    for (const [id, row] of rows) {
      const has = st.relics.includes(id);
      if (has) found++;
      row.classList.toggle('found', has);
      const tick = row.querySelector('.tick');
      if (has && !tick) row.append(el('span', { class: 'tick', text: '✓' }));
      if (!has && tick) tick.remove();
    }
    const all = found === quest.relics.length;
    hint.textContent = all
      ? `All relics found! Head to ${quest.primeName}.`
      : `${found}/${quest.relics.length} relics found. ${quest.primeHint}`;
    hint.classList.toggle('done', all);
  };

  // ── 2. Mount the overworld scene ──
  const progress = app.state.questState(waifu.id);
  const scene = new OverworldScene({
    theme: waifu.theme ?? 'walls',
    seedKey: waifu.id,
    relicIds: quest.relics.map((r) => r.id),
    collectedRelicIds: progress.relics,
    hero: app.state.hero(),
    events: {
      onRelicPickup: (relicId) => {
        if (app.state.collectRelic(waifu.id, relicId)) {
          const def = quest.relics.find((r) => r.id === relicId);
          app.sync();
          app.toast(`Found: ${def?.name ?? relicId}`, 'relic');
          refreshRelics();
        }
      },
      onPrimeNear: (near) => {
        if (near) {
          promptEl.textContent = `Press A to talk to ${quest.primeName}`;
          promptEl.style.display = 'block';
        } else {
          promptEl.style.display = 'none';
        }
      },
      onPrimeInteract: () => onQuestComplete(app, waifu),
      onCompass: (bearing, label) => {
        if (bearing === null) {
          compassEl.style.display = 'none';
          return;
        }
        compassEl.style.display = 'block';
        needle.style.transform = `rotate(${bearing}rad)`;
        compassLabel.textContent = label;
      },
    },
  });
  scene.setViewSize(app.stage.pixel.targetWidth, app.stage.pixel.targetHeight);

  app.mountQuest(scene);
  app.stage.pixel.setLinearEncode(false);
  app.stage.pixel.setVignette(0.12);
  app.stage.show(scene);

  refreshRelics();

  // ── 3. Controls appended after the scene exists ──
  const warp = el('button', {
    class: 'btn ghost small',
    style: 'margin-top:9px',
  });
  warp.append(iconLabel('compass', 'Warp to objective'));
  warp.addEventListener('click', () => {
    const st = app.state.questState(waifu.id);
    const allFound = quest.relics.every((r) => st.relics.includes(r.id));
    if (allFound) {
      scene.warpToPrime();
      app.toast('Warped to the prime location.', 'info');
    } else if (scene.warpToNearestRelic()) {
      app.toast('Warped to the nearest relic.', 'info');
    } else {
      scene.warpToPrime();
      app.toast('All relics collected. Heading to the prime location.', 'info');
    }
  });
  panel.append(warp);

  const exitWorld = () => {
    app.stage.pixel.setLinearEncode(true);
    app.stage.pixel.setVignette(0.28);
    scene.dispose();
    app.clearStage();
    app.setScreen('quests');
  };

  const leave = el('button', {
    class: 'btn ghost small',
    text: '← Leave world',
    style: 'margin-top:6px',
  });
  leave.addEventListener('click', exitWorld);
  panel.append(leave);

  root.append(panel, compassEl, promptEl);

  // ── D-pad ──
  const dpad = el('div', { class: 'dpad' });
  const pressed = new Set<string>();
  const applyDirection = () => {
    const x = (pressed.has('right') ? 1 : 0) - (pressed.has('left') ? 1 : 0);
    const y = (pressed.has('down') ? 1 : 0) - (pressed.has('up') ? 1 : 0);
    scene.setDirection(x, y);
  };
  const dirButtons: { dir: string; label: string }[] = [
    { dir: 'up', label: '\u25b2' },
    { dir: 'left', label: '\u25c0' },
    { dir: 'right', label: '\u25b6' },
    { dir: 'down', label: '\u25bc' },
  ];
  for (const { dir, label } of dirButtons) {
    const b = el('button', { class: `dpad-btn ${dir}`, text: label });
    const down = (e: Event) => {
      e.preventDefault();
      pressed.add(dir);
      applyDirection();
    };
    const up = () => {
      pressed.delete(dir);
      applyDirection();
    };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    dpad.append(b);
  }
  root.append(dpad);

  // ── action buttons ──
  const controls = el('div', { class: 'quest-controls' });

  const talk = el('button', { class: 'ctrl-btn', text: 'A' });
  talk.addEventListener('click', () => scene.interact());
  controls.append(talk);

  let running = false;
  const run = el('button', { class: 'ctrl-btn', text: 'B' });
  run.addEventListener('click', () => {
    running = !running;
    scene.setRun(running);
    run.style.filter = running ? 'brightness(1.35)' : '';
  });
  controls.append(run);

  const exit = el('button', { class: 'ctrl-btn exit', text: 'EXIT' });
  exit.addEventListener('click', exitWorld);
  controls.append(exit);

  root.append(controls);

  return root;
}

function onQuestComplete(app: AppContext, waifu: Waifu) {
  const { alreadyOwned } = app.state.completeQuest(waifu.id);
  app.state.save();

  const overlay = el('div', { class: 'reveal' });
  overlay.append(
    el('div', {
      class: 'reveal-title',
      text: alreadyOwned ? 'MEMORIES REKINDLED' : '★ WAIFU RECRUITED ★',
    }),
  );

  const wrap = el('div', {
    style: 'display:flex;gap:20px;align-items:center;flex-wrap:wrap;justify-content:center',
  });
  wrap.append(waifuPortrait(waifu.id, 168, 0x2a2030));

  const right = el('div', { style: 'max-width:360px;text-align:left' });
  right.append(el('div', { class: 'sheet-name', text: waifu.name }));
  right.append(el('div', { class: 'sheet-series', text: `${waifu.series} · ★${waifu.rarity}` }));
  right.append(el('div', { class: 'sheet-quote', text: `"${waifu.quest?.primeLine ?? '...'}"` }));
  const rewardLine = el('div', { class: 'card-meta' });
  if (alreadyOwned) {
    rewardLine.textContent = 'She was already home. Your connection deepened.';
  } else {
    rewardLine.append(
      document.createTextNode('Quest reward: +'),
      el('span', { class: 'ico ico-inline crystal' }),
      document.createTextNode(`${waifu.quest!.reward.crystals} · +`),
      el('span', { class: 'ico ico-inline coin' }),
      document.createTextNode(`${waifu.quest!.reward.coins}`),
    );
  }
  right.append(rewardLine);
  wrap.append(right);
  overlay.append(wrap);

  const btns = el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap;justify-content:center' });

  const talk = el('button', { class: 'btn rose' }, [iconLabel('chat', `Talk to ${waifu.name}`)]);
  talk.addEventListener('click', () => {
    overlay.remove();
    // Leave the quest world first, otherwise the full-bleed world HUD stays
    // mounted and the dialogue modal has no navigation behind it.
    app.stage.pixel.setLinearEncode(true);
    app.stage.pixel.setVignette(0.28);
    app.clearStage();
    app.setScreen('home');
    import('./dialogue').then(({ openDialogue }) => openDialogue(app, waifu.id));
  });
  btns.append(talk);

  const home = el('button', { class: 'btn' }, [iconLabel('home', 'Return home')]);
  home.addEventListener('click', () => {
    overlay.remove();
    app.stage.pixel.setLinearEncode(true);
    app.stage.pixel.setVignette(0.28);
    app.clearStage();
    app.setScreen('home');
  });
  btns.append(home);

  const again = el('button', { class: 'btn ghost', text: '← Back to quests' });
  again.addEventListener('click', () => {
    overlay.remove();
    app.stage.pixel.setLinearEncode(true);
    app.stage.pixel.setVignette(0.28);
    app.clearStage();
    app.setScreen('quests');
  });
  btns.append(again);

  overlay.append(btns);
  (document.getElementById('ui-root') as HTMLElement).append(overlay);
}
