import './ui/styles.css';
import './ui/icon-anim.css';
import './beta/beta.css';
import { boot } from './app';
import { requireAccess } from './beta/gate';
import { installErrorCapture, installFeedback } from './beta/feedback';

/**
 * Entry point. The closed-beta invite gate runs first; the game only boots for
 * a valid tester (or when the invite list is empty, i.e. local development).
 */
async function main() {
  installErrorCapture();
  const session = await requireAccess();
  const app = boot();

  // First visit: use the tester's chosen name as the in-game name.
  if (session && app.state.data.playerName === 'Commander' && session.handle !== 'Commander') {
    app.state.data.playerName = session.handle;
    app.state.save();
  }

  installFeedback({
    session,
    screen: () => app.screenId,
    summary: () => `${app.state.ownedWaifuList().length} waifus owned, outfit ${app.state.hero().outfit ?? 'custom'}`,
  });

  // Expose a few handles for debugging in the browser console.
  (window as unknown as { __game: unknown }).__game = {
    app,
    session,
    reset: () => {
      app.state.reset();
      app.setScreen('title');
    },
  };

  // Disable the browser context menu on the canvas so long-press does not
  // interrupt the touch joystick.
  document.getElementById('game-canvas')?.addEventListener('contextmenu', (e) => e.preventDefault());
}

void main();
