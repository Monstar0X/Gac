import { BETA } from './config';
import { INVITE_HASHES } from './invites.generated';
import { normaliseCode, sha256Hex } from './sha256';

/**
 * Invite gate for the closed beta.
 *
 * Each of the (up to) ten invite codes maps to a tester slot, T01..T10. A valid
 * code is remembered in this browser, so testers enter it once. NOTE: this is a
 * soft gate in client-side code. It keeps a shared link from being casually
 * passed around, but it is not real access control; put the site behind your
 * host's authentication for that (see README, "Closed beta").
 */

export interface Session {
  slot: string;
  handle: string;
}

const KEY = 'wg3d:beta-session';
const SALT = 'wg3d-beta:';

function slotName(i: number): string {
  return `T${String(i + 1).padStart(2, '0')}`;
}

function indexOfCode(code: string): number {
  return INVITE_HASHES.indexOf(sha256Hex(SALT + normaliseCode(code)));
}

function stored(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { h: string; handle: string };
    const idx = INVITE_HASHES.indexOf(s.h);
    return idx >= 0 ? { slot: slotName(idx), handle: s.handle } : null;
  } catch {
    return null;
  }
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  location.reload();
}

/** Resolves with the tester session, or `null` when the gate is disabled. */
export function requireAccess(): Promise<Session | null> {
  if (INVITE_HASHES.length === 0) return Promise.resolve(null);
  const have = stored();
  if (have) return Promise.resolve(have);

  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'beta-gate';
    wrap.innerHTML = `
      <div class="beta-moon"></div>
      <form class="beta-card" autocomplete="off">
        <div class="beta-kicker">${BETA.channel} · v${BETA.version}</div>
        <h1>WAIFU GACHA</h1>
        <p>This build is a private playtest for invited testers. Enter your invite code to come in.</p>
        <label>INVITE CODE<input name="code" placeholder="LUCK-XXXX-XXXX" spellcheck="false" autocapitalize="characters" /></label>
        <label>NAME (shown in-game)<input name="handle" maxlength="16" placeholder="Commander" /></label>
        <div class="beta-error" role="alert"></div>
        <button class="btn" type="submit">Enter</button>
        <small>No code? Ask whoever invited you. Please do not share this link.</small>
      </form>`;
    document.body.append(wrap);

    const form = wrap.querySelector('form') as HTMLFormElement;
    const err = wrap.querySelector('.beta-error') as HTMLElement;
    let fails = 0;
    let lockedUntil = 0;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now < lockedUntil) {
        err.textContent = `Too many tries. Wait ${Math.ceil((lockedUntil - now) / 1000)}s.`;
        return;
      }
      const data = new FormData(form);
      const code = String(data.get('code') ?? '');
      const handle = String(data.get('handle') ?? '').trim().slice(0, 16) || 'Commander';
      const idx = indexOfCode(code);
      if (idx < 0) {
        fails++;
        err.textContent = 'That code is not valid.';
        if (fails >= 5) {
          lockedUntil = now + 30_000;
          fails = 0;
        }
        return;
      }
      try {
        localStorage.setItem(KEY, JSON.stringify({ h: INVITE_HASHES[idx], handle }));
      } catch {
        /* private mode: the gate simply asks again next visit */
      }
      wrap.remove();
      resolve({ slot: slotName(idx), handle });
    });
    (form.elements.namedItem('code') as HTMLInputElement).focus();
  });
}
