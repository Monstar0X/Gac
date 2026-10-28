import { el, clear, fmt } from '../dom';
import { pixelIcon, iconLabel, type IconName } from '../icons';
import { waifuPortrait } from '../components';
import { WAIFU_BY_ID } from '../../data/waifus';
import { QUIZ_QUESTIONS, quizForSeries, type QuizQuestion } from '../../data/quiz';
import type { AppContext } from '../../engine/app-stage';

/**
 * The Royal Quiz. Each series has its own set of questions; answering one
 * correctly for the first time pays Royal Tokens, the currency reserved for
 * quest and quiz rewards.
 *
 * Pick a series you own a waifu from, then answer its questions. Already-paid
 * questions can be replayed for no further reward.
 */
export function renderQuiz(app: AppContext, root: HTMLElement) {
  const body = el('div', { class: 'screen-body' });
  root.append(body);

  // Series the player can be quizzed on: those they own a waifu from, plus any
  // series that has authored questions and at least one known character.
  const ownedSeries = new Set(
    app.state
      .ownedWaifuList()
      .map((o) => WAIFU_BY_ID[o.id]?.series)
      .filter((s): s is string => !!s),
  );

  const allSeries = [...new Set(QUIZ_QUESTIONS.map((q) => q.series))];
  const playable = allSeries.filter((s) => quizForSeries(s).length > 0);
  const unlocked = playable.filter((s) => ownedSeries.has(s));

  const answeredCount = app.state.data.quiz.answered.length;
  const totalCount = QUIZ_QUESTIONS.length;

  const draw = () => {
    clear(body);

    body.append(
      el('div', { class: 'screen-head' }, [
        el('div', { class: 'screen-title', text: 'ROYAL QUIZ' }),
        el('div', {
          class: 'screen-sub',
          text: `${answeredCount}/${totalCount} answered · ${app.state.data.quiz.correct} correct. First-time correct answers pay Royal Tokens.`,
        }),
      ]),
    );

    // ── wallet ──
    const wallet = el('div', { class: 'filters' });
    const chip = (icon: IconName, label: string) => {
      const c = el('div', { class: 'tab' });
      c.append(iconLabel(icon, label, 14));
      return c;
    };
    wallet.append(
      chip('crown', `${fmt(app.state.royalTokens)} Royal Tokens`),
      chip('check', `${answeredCount} paid`),
      chip('box', `${app.state.data.quiz.wrong} missed`),
    );
    body.append(wallet);

    if (!unlocked.length) {
      body.append(
        el('div', { class: 'empty' }, [
          el('span', { class: 'big' }, [pixelIcon('crown', 40)]),
          el('div', { text: 'Recruit a waifu first. Quizzes unlock per series.' }),
        ]),
      );
      return;
    }

    // ── series list ──
    body.append(el('div', { class: 'sheet-section' }, [el('h4', { text: 'CHOOSE A SERIES' })]));
    const grid = el('div', { class: 'tile-row' });
    for (const series of unlocked) {
      const qs = quizForSeries(series);
      const done = qs.filter((q) => app.state.quizAnswered(q.id)).length;
      const resident = app.state
        .ownedWaifuList()
        .map((o) => WAIFU_BY_ID[o.id])
        .find((w) => w?.series === series);
      const tile = el('div', { class: 'tile', style: 'cursor:pointer;padding:10px' });
      if (resident) tile.append(waifuPortrait(resident.id, 96, 0x241c2c));
      tile.append(
        el('div', { class: 'tile-name', text: series }),
        el('div', { class: 'card-meta', text: `${done}/${qs.length} answered` }),
        el('div', {
          class: 'card-meta',
          style: 'color:var(--rose)',
          text: done === qs.length ? 'All paid ✓' : 'Tap to play',
        }),
      );
      tile.addEventListener('click', () => openSeries(app, series, draw));
      grid.append(tile);
    }
    body.append(grid);
  };

  draw();
}

/** A single series' question run. */
function openSeries(app: AppContext, series: string, refresh: () => void) {
  const backdrop = el('div', { class: 'sheet-backdrop' });
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      backdrop.remove();
      refresh();
    }
  });

  const sheet = el('div', { class: 'panel sheet', style: 'max-width:620px' });
  const qs = quizForSeries(series);

  let index = qs.findIndex((q) => !app.state.quizAnswered(q.id));
  if (index < 0) index = 0;

  const close = el('button', { class: 'btn ghost', text: 'Close' });
  close.addEventListener('click', () => {
    backdrop.remove();
    refresh();
  });

  const renderQuestion = () => {
    clear(sheet);
    const q: QuizQuestion | undefined = qs[index];
    if (!q) return;

    const head = el('div', { class: 'sheet-section' }, [
      el('h4', { text: `${series.toUpperCase()} — QUESTION ${index + 1}/${qs.length}` }),
    ]);
    sheet.append(head);

    const paid = app.state.quizAnswered(q.id);
    sheet.append(el('div', { class: 'sheet-bio', style: 'font-size:22px', text: q.prompt }));
    if (paid) {
      const answered = el('div', { class: 'card-meta', style: 'color:var(--sage)' });
      answered.append(iconLabel('check', 'Already answered correctly — replay for fun, no extra tokens.', 14));
      sheet.append(answered);
    } else {
      sheet.append(el('div', { class: 'card-meta', text: `Correct answer pays ${q.reward} Royal Tokens.` }));
    }

    const choices = el('div', { class: 'filters', style: 'margin-top:12px' });
    q.choices.forEach((label, i) => {
      const b = el('button', { class: 'tab', text: label, style: 'text-align:left' });
      b.addEventListener('click', () => {
        const correct = i === q.answer;
        const res = app.state.answerQuiz(q.id, correct, q.reward);
        app.sync();
        if (correct) {
          app.toast(
            res.paid ? `Correct! +${res.reward} Royal Tokens` : 'Correct — already paid.',
            res.paid ? 'good' : 'info',
          );
        } else {
          app.toast(`Not quite. ${q.choices[q.answer]} was correct.`, 'bad');
        }
        // Show the explanation, then move on.
        clear(sheet);
        sheet.append(
          el('div', { class: 'sheet-section' }, [el('h4', { text: correct ? 'CORRECT' : 'NOT QUITE' })]),
          el('div', { class: 'sheet-bio', style: 'font-size:22px', text: q.prompt }),
          el('div', {
            class: 'card-meta',
            style: `color:var(${correct ? '--sage' : '--rose'});font-size:20px`,
            text: `Answer: ${q.choices[q.answer]}`,
          }),
          el('div', { class: 'sheet-bio', text: q.explain }),
        );
        if (res.paid) {
          sheet.append(
            el('div', { class: 'card-meta', style: 'color:var(--amber)' }, [
              iconLabel('crown', `+${res.reward} Royal Tokens`, 14),
            ]),
          );
        }
        const next = el('button', {
          class: 'btn sage',
          text: index + 1 < qs.length ? 'Next question →' : 'Finish',
        });
        next.addEventListener('click', () => {
          if (index + 1 < qs.length) {
            index += 1;
            renderQuestion();
          } else {
            backdrop.remove();
            refresh();
          }
        });
        sheet.append(el('div', { class: 'dialogue-actions' }, [next, close]));
      });
      choices.append(b);
    });
    sheet.append(choices);
    sheet.append(el('div', { class: 'dialogue-actions' }, [close]));
  };

  renderQuestion();
  backdrop.append(sheet);
  (document.getElementById('ui-root') as HTMLElement).append(backdrop);
}
