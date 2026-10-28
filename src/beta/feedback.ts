import { BETA } from './config';
import type { Session } from './gate';
import { signOut } from './gate';

/**
 * Feedback tab, error capture and report builder.
 *
 * There is no backend in a static playtest, so reports are produced locally and
 * sent however the tester prefers: copied, downloaded, or mailed (when
 * `BETA.feedbackEmail` is set). Every report carries build, tester slot, screen,
 * device and the last few runtime errors, which is what makes a bug actionable.
 */

interface Ctx {
  session: Session | null;
  screen: () => string;
  summary: () => string;
}

const errors: string[] = [];

export function installErrorCapture() {
  const push = (msg: string) => {
    errors.push(`${new Date().toISOString().slice(11, 19)} ${msg}`.slice(0, 400));
    if (errors.length > 12) errors.shift();
  };
  window.addEventListener('error', (e) => push(`${e.message} @ ${e.filename?.split('/').pop()}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) => push(`unhandled: ${String((e.reason as Error)?.message ?? e.reason)}`));
}

function report(ctx: Ctx, kind: string, text: string): string {
  return [
    `Waifu Gacha ${BETA.channel} feedback`,
    `Type: ${kind}`,
    `Tester: ${ctx.session ? `${ctx.session.slot} (${ctx.session.handle})` : 'open build'}`,
    `Build: v${BETA.version} (${BETA.build})`,
    `Screen: ${ctx.screen()}`,
    `Save: ${ctx.summary()}`,
    `Viewport: ${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`,
    `Device: ${navigator.userAgent}`,
    `Recent errors: ${errors.length ? '\n  ' + errors.join('\n  ') : 'none'}`,
    '',
    text.trim() || '(no description)',
  ].join('\n');
}

export function installFeedback(ctx: Ctx) {
  const tab = document.createElement('button');
  tab.className = 'beta-tab';
  tab.textContent = 'FEEDBACK';
  tab.title = 'Report a bug or share an idea';
  document.body.append(tab);

  tab.addEventListener('click', () => {
    if (document.querySelector('.beta-modal')) return;
    const m = document.createElement('div');
    m.className = 'beta-modal';
    m.innerHTML = `
      <div class="beta-card wide">
        <div class="beta-kicker">${BETA.channel} · v${BETA.version}${ctx.session ? ' · ' + ctx.session.slot : ''}</div>
        <h2>Send feedback</h2>
        <div class="beta-kinds">
          <button data-k="Bug" class="chip active">Bug</button>
          <button data-k="Idea" class="chip">Idea</button>
          <button data-k="Art / look" class="chip">Art / look</button>
          <button data-k="Balance" class="chip">Balance</button>
        </div>
        <textarea placeholder="What happened? What did you expect? Steps to reproduce help a lot."></textarea>
        <div class="beta-status"></div>
        <div class="beta-row">
          <button class="btn" data-a="copy">Copy report</button>
          <button class="btn ghost" data-a="file">Download .txt</button>
          ${BETA.feedbackEmail ? '<button class="btn ghost" data-a="mail">Email</button>' : ''}
          <button class="btn ghost" data-a="close">Close</button>
          ${ctx.session ? '<button class="btn ghost" data-a="out">Sign out</button>' : ''}
        </div>
      </div>`;
    document.body.append(m);

    let kind = 'Bug';
    const ta = m.querySelector('textarea') as HTMLTextAreaElement;
    const status = m.querySelector('.beta-status') as HTMLElement;
    m.querySelectorAll<HTMLButtonElement>('[data-k]').forEach((b) =>
      b.addEventListener('click', () => {
        kind = b.dataset.k!;
        m.querySelectorAll('[data-k]').forEach((x) => x.classList.toggle('active', x === b));
      }),
    );
    m.addEventListener('click', async (e) => {
      const a = (e.target as HTMLElement).dataset?.a;
      if (!a) return;
      const body = report(ctx, kind, ta.value);
      if (a === 'close') m.remove();
      else if (a === 'out') signOut();
      else if (a === 'copy') {
        try {
          await navigator.clipboard.writeText(body);
          status.textContent = 'Copied. Paste it into your message to the team.';
        } catch {
          ta.value = body;
          ta.select();
          status.textContent = 'Select all and copy the text above.';
        }
      } else if (a === 'file') {
        const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `feedback-${ctx.session?.slot ?? 'open'}-${Date.now()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        status.textContent = 'Report downloaded.';
      } else if (a === 'mail') {
        location.href = `mailto:${BETA.feedbackEmail}?subject=${encodeURIComponent(`[${BETA.channel}] ${kind}`)}&body=${encodeURIComponent(body)}`;
      }
    });
  });
}
