import { el } from '../dom';
import { iconLabel } from '../icons';
import { confirmModal } from '../components';
import type { AppContext } from '../../engine/app-stage';
import { BETA } from '../../beta/config';

export function renderTitle(app: AppContext): HTMLElement {
  const hasSave = Object.keys(app.state.data.waifus).length > 0;

  const startBtn = el('button', { class: 'btn' }, [
    iconLabel('play', hasSave ? 'Continue' : 'Begin'),
  ]);
  startBtn.addEventListener('click', () => {
    app.setScreen('home');
  });

  const actions = el('div', { class: 'title-actions' }, [startBtn]);

  if (hasSave) {
    const reset = el('button', { class: 'btn ghost', text: '↺ New Game' });
    reset.addEventListener('click', async () => {
      const ok = await confirmModal(document.getElementById('ui-root') as HTMLElement, {
        title: 'Start over?',
        text: 'This erases every waifu, item and quest you have collected. It cannot be undone.',
        confirm: 'Erase save',
      });
      if (ok) {
        app.state.reset();
        app.sync();
        app.toast('A fresh start. Welcome home.', 'good');
        app.refresh();
      }
    });
    actions.append(reset);
  }

  return el('div', { class: 'title-screen' }, [
    el('div', { class: 'beta-badge', text: `${BETA.channel} · v${BETA.version} · ${BETA.build}` }),
    el('div', { class: 'title-logo', text: 'WAIFU GACHA' }),
    el('div', {
      class: 'title-logo',
      text: '3D · LUCK ROYALE',
      style: 'font-size:clamp(10px,2.6vw,17px);color:var(--cream-dim);text-shadow:3px 3px 0 rgba(0,0,0,.6)',
    }),
    el('div', {
      class: 'title-sub',
      text: 'Pull a bundle from the Luck Royale, travel to her world, gather her keepsakes, and meet her where she belongs.',
    }),
    actions,
    el('div', {
      class: 'title-sub',
      style: 'font-size:17px;opacity:.7;max-width:520px',
      text: 'A cozy pixel-art fan project. All characters belong to their original creators.',
    }),
  ]);
}
