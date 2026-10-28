import { el } from '../dom';
import { confirmModal } from '../components';
import type { AppContext } from '../../engine/app-stage';

export function openSettings(app: AppContext) {
  const backdrop = el('div', { class: 'modal' });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  const box = el('div', { class: 'panel modal-box', style: 'max-width:520px' });
  box.append(el('div', { class: 'modal-title', text: 'SETTINGS' }));

  // ── pixel scale ──
  box.append(el('div', { class: 'card-meta', style: 'margin-bottom:6px', text: 'Pixel chunkiness' }));
  const scales = el('div', { class: 'filters' });
  for (const s of [2, 3, 4, 5]) {
    const b = el('button', {
      class: `tab${app.state.data.settings.pixelScale === s ? ' active' : ''}`,
      text: s === 2 ? 'Fine' : s === 3 ? 'Cozy' : s === 4 ? 'Chunky' : 'Very chunky',
    });
    b.addEventListener('click', () => {
      app.state.data.settings.pixelScale = s;
      app.state.save();
      app.stage.setPixelScale(s);
      Array.from(scales.children).forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
    });
    scales.append(b);
  }
  box.append(scales);

  // ── player name ──
  box.append(el('div', { class: 'card-meta', style: 'margin:16px 0 6px', text: 'Your name' }));
  const nameInput = el('input', {
    class: 'btn ghost',
    style: 'width:100%;text-align:left;font-family:var(--font-body);font-size:20px',
    value: app.state.data.playerName,
  }) as HTMLInputElement;
  nameInput.addEventListener('input', () => {
    app.state.data.playerName = nameInput.value.slice(0, 20) || 'Commander';
    app.state.save();
  });
  box.append(nameInput);

  // ── stats ──
  box.append(el('div', { class: 'divider' }));
  const stats = app.state.data.stats;
  box.append(
    el('div', { class: 'card-meta', text: `Total pulls: ${stats.totalPulls}` }),
    el('div', { class: 'card-meta', text: `Quests completed: ${stats.questsCompleted}` }),
    el('div', { class: 'card-meta', text: `Relics found: ${stats.relicsFound}` }),
    el('div', { class: 'card-meta', text: `Waifus recruited: ${app.state.ownedWaifuList().length}` }),
  );

  // ── actions ──
  const actions = el('div', { class: 'modal-actions', style: 'margin-top:18px' });

  const reset = el('button', { class: 'btn ghost', text: '↺ Reset save' });
  reset.addEventListener('click', async () => {
    const ok = await confirmModal(document.getElementById('ui-root') as HTMLElement, {
      title: 'Reset everything?',
      text: 'All waifus, items, relics and progress will be erased.',
      confirm: 'Erase',
    });
    if (ok) {
      app.state.reset();
      app.sync();
      backdrop.remove();
      app.setScreen('title');
    }
  });
  actions.append(reset);

  const close = el('button', { class: 'btn', text: 'Done' });
  close.addEventListener('click', () => {
    backdrop.remove();
    app.refresh();
  });
  actions.append(close);

  box.append(actions);
  backdrop.append(box);
  (document.getElementById('ui-root') as HTMLElement).append(backdrop);
}
