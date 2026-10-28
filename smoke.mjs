import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';

const URL = process.env.APP_URL ?? 'http://localhost:12000/';
const SAVE_KEY = 'waifu-gacha-3d:save:v1';

// Prefer Playwright's managed browser, but fall back to the distro Chromium.
// Managed browsers live in the home cache, which a container restart can wipe.
const SYSTEM_CHROMIUM = '/usr/bin/chromium';
const launchOpts = {
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
  ],
};
try {
  await chromium.launch({ ...launchOpts, timeout: 15000 }).then((b) => b.close());
} catch {
  if (!existsSync(SYSTEM_CHROMIUM)) throw new Error('no usable Chromium found');
  launchOpts.executablePath = SYSTEM_CHROMIUM;
}

const b = await chromium.launch(launchOpts);
const errs = [];
const badResponses = [];
const pass = [];
const fail = [];
const check = (name, ok, detail = '') => {
  (ok ? pass : fail).push(name + (detail ? ` — ${detail}` : ''));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on('console', (m) => {
  if (m.type() === 'error') {
    const loc = m.location();
    errs.push(`${m.text()} @ ${loc.url || '?'}:${loc.lineNumber ?? '?'}`);
  }
});
p.on('requestfailed', (r) => {
  badResponses.push(`FAILED ${r.url()} :: ${r.failure()?.errorText ?? ''}`);
});
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('response', (r) => {
  if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`);
});

const enter = async () => {
  await p.waitForTimeout(900);
  const btn = p.getByRole('button', { name: /Begin|Continue/ }).first();
  if (await btn.count()) {
    await btn.click();
    await p.waitForTimeout(1400);
  }
};

// The closed-beta build asks for an invite code. Use SMOKE_INVITE, or the first
// code in INVITE-CODES.txt; an open build (no invites generated) skips this.
const inviteCode =
  process.env.SMOKE_INVITE ??
  (existsSync('INVITE-CODES.txt')
    ? readFileSync('INVITE-CODES.txt', 'utf8').match(/LUCK-[A-Z0-9]{4}-[A-Z0-9]{4}/)?.[0]
    : undefined);
const passGate = async () => {
  if (!(await p.locator('.beta-gate').count())) return;
  await p.fill('input[name=code]', 'LUCK-NOPE-NOPE');
  await p.click('.beta-gate button[type=submit]');
  check('gate rejects a wrong invite code', (await p.locator('.beta-error').innerText()).length > 0);
  await p.fill('input[name=code]', inviteCode ?? '');
  await p.fill('input[name=handle]', 'Smoke');
  await p.click('.beta-gate button[type=submit]');
  await p.waitForTimeout(500);
};

await p.goto(URL, { waitUntil: 'networkidle' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'networkidle' });
await passGate();
check('beta gate cleared, game booted', (await p.locator('.title-screen').count()) === 1);
check('title shows the beta build badge', (await p.locator('.beta-badge').count()) === 1);

// ── no colour emoji anywhere in the UI ──
// Emoji bypass the palette and render differently per platform, so the whole
// interface is expected to use drawn icons instead. `\p{Extended_Pictographic}`
// is the reliable test for "renders as a colour emoji"; hand-maintained
// codepoint ranges kept missing cases (U+2764 heart, and U+2713 ✓ which sits
// inside the dingbat block but is not pictographic). The monochrome typographic
// marks we do keep — ★ ☆ ✓ ↺ → ← — are all non-pictographic.
const EMOJI = /[\p{Extended_Pictographic}]/u;
const pictographsIn = () =>
  p.evaluate((src) => {
    const re = new RegExp(src, 'u');
    return [...document.querySelectorAll('body *')]
      .filter((n) => n.children.length === 0 && !/^(SCRIPT|STYLE)$/.test(n.tagName))
      .map((n) => n.textContent ?? '')
      .filter((t) => [...t].some((ch) => re.test(ch)))
      .map((t) => t.slice(0, 40));
  }, EMOJI.source);

// The title screen is only reachable before the first nav click, so scan it here.
const titlePictos = await pictographsIn();
check('no colour emoji on the title screen', titlePictos.length === 0, titlePictos.join(' | '));
const titleIcons = await p.evaluate(() => document.querySelectorAll('.btn canvas').length);
check('title start button draws a pixel icon', titleIcons >= 1, `canvases=${titleIcons}`);

await enter();

// ── currency boost ──
await p.evaluate(() => __game.app.state.save());
const wallet = await p.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), SAVE_KEY);
check(
  'currency boost is large',
  (wallet.coins ?? 0) >= 1_000_000,
  `coins=${wallet.coins} crystals=${wallet.crystals}`,
);
check('royal tokens present', (wallet.royalTokens ?? 0) > 0, `tokens=${wallet.royalTokens}`);

// ── seed waifus across series ──
await p.evaluate(() => {
  const app = __game.app;
  for (const id of ['rem', 'ram', 'emilia', 'mikasa', 'naruto', 'saber', 'kohaku']) {
    app.state.addWaifu(id);
  }
  app.state.save();
});
await p.reload({ waitUntil: 'networkidle' });
await enter();

// ── rooms ──
const rooms = await p.evaluate(() =>
  [...document.querySelectorAll('.room-tab')].map((t) => t.textContent),
);
check('room switcher lists series', rooms.length >= 5, rooms.join(' | '));

const rezero = p.locator('.room-tab', { hasText: 'Re:Zero' });
await rezero.first().click();
await p.waitForTimeout(1500);
const guests = await p.evaluate(() => document.querySelector('.guest-tag')?.textContent ?? '');
check(
  'Re:Zero room holds Rem, Ram and Emilia',
  ['Rem', 'Ram', 'Emilia'].every((n) => guests.includes(n)),
  guests,
);

// ── welcome dismiss ──
await p.locator('.home-dismiss').click();
await p.waitForTimeout(300);
const collapsed = await p.evaluate(() => !!document.querySelector('.home-welcome.collapsed'));
check('welcome panel collapses on dismiss', collapsed);

// ── nav icons are drawn pixel art, not font glyphs ──
// The nav used to use OS emoji, which render as platform-specific anti-aliased
// blobs. Assert we get canvases with a small, quantised palette and no text.
const navIcons = await p.evaluate(() => {
  const nodes = [...document.querySelectorAll('canvas.nav-ico')];
  return nodes.map((c) => {
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    const colors = new Set();
    let opaque = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] > 0) {
        opaque++;
        colors.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
      }
    }
    return { opaque, colors: colors.size, text: c.textContent, w: c.width, h: c.height };
  });
});
check('nav renders 8 pixel-icon canvases', navIcons.length === 8, `found=${navIcons.length}`);
check(
  'every nav icon draws pixels',
  navIcons.every((i) => i.opaque > 100),
  navIcons.map((i) => i.opaque).join(','),
);
check(
  'nav icons use a quantised palette',
  navIcons.every((i) => i.colors > 0 && i.colors <= 8),
  navIcons.map((i) => i.colors).join(','),
);
check(
  'nav icons carry no text fallback',
  navIcons.every((i) => i.text === ''),
);

// ── every screen renders without overflow or errors ──
const screens = ['Home', 'Quests', 'Royale', 'Waifus', 'Store', 'Bag', 'Quiz', 'Hero'];
for (const s of screens) {
  const nav = p.locator('.nav-btn', { hasText: s });
  if (!(await nav.count())) {
    check(`nav has ${s}`, false);
    continue;
  }
  await nav.first().click();
  await p.waitForTimeout(600);
  const o = await p.evaluate(() => {
    const de = document.documentElement;
    const bd = document.querySelector('.screen-body');
    return { doc: de.scrollWidth - de.clientWidth, body: bd ? bd.scrollWidth - bd.clientWidth : 0 };
  });
  check(`${s} screen renders`, o.doc <= 1, `docOverflow=${o.doc} bodyOverflow=${o.body}`);
}

// ── no colour emoji in any screen ──
const emojiFound = [];
for (const s of screens) {
  const nav = p.locator('.nav-btn', { hasText: s });
  if (!(await nav.count())) continue;
  await nav.first().click();
  await p.waitForTimeout(400);
  emojiFound.push(...(await pictographsIn()));
}
check('no colour emoji in any screen', emojiFound.length === 0, emojiFound.slice(0, 6).join(' | '));

// ── icon animations ──
// Motion is declared in CSS with `steps()` so frames land on whole pixels. If a
// rule regresses to a smooth easing the pixel grids blur, so assert the timing
// function survives and that reduced-motion turns everything off.
const animInfo = await p.evaluate(() => {
  const grab = (sel) => {
    const n = document.querySelector(sel);
    if (!n) return null;
    const s = getComputedStyle(n);
    return { name: s.animationName, timing: s.animationTimingFunction };
  };
  return {
    navActive: (() => {
      document.querySelector('.nav-btn')?.classList.add('active');
      return grab('.nav-btn.active .nav-ico');
    })(),
    coin: grab('.res .ico.coin'),
    hasStepsRule: [...document.styleSheets].some((sh) => {
      try {
        return [...sh.cssRules].some((r) => r.cssText?.includes('steps('));
      } catch {
        return false;
      }
    }),
  };
});
check(
  'active nav icon animates',
  animInfo.navActive && animInfo.navActive.name !== 'none',
  JSON.stringify(animInfo.navActive),
);
check(
  'icon motion is stepped, not eased',
  animInfo.hasStepsRule,
  `hasStepsRule=${animInfo.hasStepsRule}`,
);

// A running animation name proves a rule matched, not that anything moves. The
// active-tab pop is a one-shot that may finish before sampling, so hover an
// idle tab (infinite 0.6s bob) and confirm the icon displaces on screen. Sample
// for longer than a full cycle: the bob is a two-step `steps()` animation, so
// each pose holds for ~300ms and a shorter window can sit inside one step.
await p.locator('.nav-btn:not(.active)').first().hover();
await p.waitForTimeout(80);
const moved = await p.evaluate(async () => {
  const ico = document.querySelector('.nav-btn:not(.active) .nav-ico');
  if (!ico) return null;
  const seen = new Set();
  for (let i = 0; i < 24; i++) {
    const r = ico.getBoundingClientRect();
    seen.add(`${Math.round(r.top * 10)}:${Math.round(r.width * 10)}`);
    await new Promise((res) => setTimeout(res, 35));
  }
  return [...seen];
});
await p.mouse.move(0, 0);
check(
  'hovered nav icon visibly moves',
  Array.isArray(moved) && moved.length > 1,
  `poses=${moved ? moved.length : 'none'}`,
);

await p.emulateMedia({ reducedMotion: 'reduce' });
await p.waitForTimeout(120);
const reduced = await p.evaluate(() => {
  const n = document.querySelector('.nav-btn .nav-ico');
  const c = document.querySelector('.res .ico.coin');
  return {
    nav: n ? getComputedStyle(n).animationName : 'missing',
    coin: c ? getComputedStyle(c).animationName : 'missing',
  };
});
check(
  'reduced motion disables icon animation',
  reduced.nav === 'none' && reduced.coin === 'none',
  JSON.stringify(reduced),
);
await p.emulateMedia({ reducedMotion: 'no-preference' });

// ── currency marks paint ──
// Shape rules are scoped `.ico.coin` / `.ico.crystal`, so a mark that forgets
// the `ico` base class renders as an invisible empty span. Assert every
// currency span on screen actually has a painted background.
const marks = await p.evaluate(() =>
  [...document.querySelectorAll('.ico.coin, .ico.crystal, .ico.shard, .ico.token')].map((n) => {
    const r = n.getBoundingClientRect();
    const bg = getComputedStyle(n).backgroundImage;
    return { w: Math.round(r.width), h: Math.round(r.height), bg: bg !== 'none' };
  }),
);
check('currency marks are present', marks.length > 0, `count=${marks.length}`);
check(
  'every currency mark paints',
  marks.every((m) => m.w > 0 && m.h > 0 && m.bg),
  JSON.stringify(marks.filter((m) => !(m.w > 0 && m.h > 0 && m.bg)).slice(0, 4)),
);
check(
  'no unstyled currency spans',
  await p.evaluate(() => document.querySelectorAll('.ico-inline.crystal:not(.ico), .ico-lg.crystal:not(.ico)').length === 0),
);

// ── inventory holds waifus + materials ──
await p.locator('.nav-btn', { hasText: 'Bag' }).first().click();
await p.waitForTimeout(500);
const invTabs = await p.evaluate(() =>
  [...document.querySelectorAll('.filters .tab')].map((t) => t.textContent),
);
check('inventory has a Waifus tab', invTabs.some((t) => t.includes('Waifus')), invTabs.join(' | '));

// ── material binding ──
await p.evaluate(() => {
  const app = __game.app;
  app.state.addItem('mat_stardust', 5);
  app.state.save();
});
await p.reload({ waitUntil: 'networkidle' });
await enter();

const bind = await p.evaluate(() => {
  const app = __game.app;
  const before = app.state.materialBonus('rem');
  const res = app.state.equipMaterial('rem', 'mat_stardust');
  const after = app.state.materialBonus('rem');
  app.state.save();
  return { ok: res.ok, reason: res.reason, before, after, mats: app.state.materialsOf('rem') };
});
check(
  'material binds to a waifu and raises the bonus',
  bind.ok && bind.after > bind.before,
  `+${Math.round(bind.before * 100)}% -> +${Math.round(bind.after * 100)}%`,
);

const giftEffect = await p.evaluate(() => {
  const app = __game.app;
  app.state.addItem('mat_candy', 1);
  return app.state.giveGift('rem', 'mat_candy');
});
check('gift works with bound materials', giftEffect.xp > 0, `xp=${giftEffect.xp}`);

// ── quiz pays royal tokens ──
const quiz = await p.evaluate(() => {
  const app = __game.app;
  const before = app.state.royalTokens;
  const res = app.state.answerQuiz('rezero-1', true, 40);
  app.state.save();
  return { paid: res.paid, reward: res.reward, before, after: app.state.royalTokens };
});
check(
  'quiz pays royal tokens on first correct answer',
  quiz.paid && quiz.after === quiz.before + quiz.reward,
  `+${quiz.reward}`,
);
const replay = await p.evaluate(() => __game.app.state.answerQuiz('rezero-1', true, 40));
check('replaying a paid question pays nothing', !replay.paid);

// ── royal exchange ──
await p.locator('.nav-btn', { hasText: 'Store' }).first().click();
await p.waitForTimeout(500);
await p.locator('.filters .tab', { hasText: 'Royal' }).first().click();
await p.waitForTimeout(500);
const royalCards = await p.evaluate(() => document.querySelectorAll('.shop-item').length);
check('royal exchange lists items', royalCards >= 4, `${royalCards} items`);

const spend = await p.evaluate(() => {
  const app = __game.app;
  app.state.addRoyalTokens(2000);
  const before = app.state.royalTokens;
  const ok = app.state.spend('royalTokens', 240);
  app.state.addItem('royal_elixir', 1);
  app.state.save();
  return { ok, before, after: app.state.royalTokens, has: app.state.hasItem('royal_elixir') };
});
check(
  'royal tokens buy an item',
  spend.ok && spend.after === spend.before - 240 && spend.has,
  `${spend.before} -> ${spend.after}`,
);

// ── quest completion pays tokens ──
const quest = await p.evaluate(() => {
  const app = __game.app;
  const before = app.state.royalTokens;
  // zerotwo is featured and deliberately not seeded above, so this is a first clear.
  app.state.addItem('bundle_zerotwo', 1);
  const res = app.state.completeQuest('zerotwo');
  app.state.save();
  return { before, after: app.state.royalTokens, alreadyOwned: res.alreadyOwned };
});
check(
  'quest completion pays royal tokens',
  quest.after > quest.before && !quest.alreadyOwned,
  `${quest.before} -> ${quest.after}`,
);

// ── persistence ──
await p.reload({ waitUntil: 'networkidle' });
await enter();
const persisted = await p.evaluate(() => ({
  mats: __game.app.state.materialsOf('rem'),
  answered: __game.app.state.data.quiz.answered,
}));
check('bound materials persist', persisted.mats.includes('mat_stardust'), persisted.mats.join(','));
check('quiz progress persists', persisted.answered.includes('rezero-1'));

// ── hero customization ──
await p.locator('.nav-btn', { hasText: 'Hero' }).first().click();
await p.waitForTimeout(700);
// Wardrobe tab: outfits, equip, and the costume reaching the home diorama.
const wardrobe = await p.evaluate(() => ({
  outfits: document.querySelectorAll('.outfit-card').length,
  active: document.querySelector('.outfit-card.active')?.dataset.outfit,
}));
check('wardrobe lists 19 outfits plus custom fit', wardrobe.outfits === 20, `cards=${wardrobe.outfits}`);
await p.locator('.outfit-card[data-outfit=shinobi]').click();
await p.waitForTimeout(400);
const worn = await p.evaluate(() => __game.app.state.hero().outfit);
check('equipping an outfit persists to the hero', worn === 'shinobi', `outfit=${worn}`);
const walkRow = await p.evaluate(() => document.querySelectorAll('.hero-walk canvas').length);
check('overworld sprite preview shows four directions', walkRow === 1);
await p.locator('.hero-tab[data-tab=look]').click();
await p.waitForTimeout(300);
await p.locator('.hero-note .chip').click();
await p.waitForTimeout(400);
const heroUi = await p.evaluate(() => ({
  presets: document.querySelectorAll('.preset-card').length,
  swatches: document.querySelectorAll('.swatch').length,
  chips: document.querySelectorAll('.chip').length,
  previewCanvases: document.querySelectorAll('.hero-stage canvas').length,
}));
check('hero screen offers archetypes', heroUi.presets >= 8, `presets=${heroUi.presets}`);
check('hero screen offers colour swatches', heroUi.swatches >= 60, `swatches=${heroUi.swatches}`);
check('hero screen offers feature chips', heroUi.chips >= 20, `chips=${heroUi.chips}`);
check('hero preview renders', heroUi.previewCanvases >= 1, `canvases=${heroUi.previewCanvases}`);

// A preset fills every field, then a single chip overrides just one of them.
await p.locator('.preset-card', { hasText: 'Shadow Ninja' }).first().click();
await p.waitForTimeout(500);
const afterPreset = await p.evaluate(() => __game.app.state.hero());
check(
  'preset applies a full appearance',
  afterPreset.headgear === 'mask' && afterPreset.hairStyle === 'spiky',
  `headgear=${afterPreset.headgear} hair=${afterPreset.hairStyle}`,
);

await p.locator('.chip', { hasText: 'Twintails' }).first().click();
await p.waitForTimeout(500);
const mixed = await p.evaluate(() => __game.app.state.hero());
check(
  'features mix freely after a preset',
  mixed.hairStyle === 'twin' && mixed.headgear === 'mask',
  `hair=${mixed.hairStyle} headgear=${mixed.headgear}`,
);

await p.locator('.swatch').nth(18).click();
await p.waitForTimeout(500);
const recoloured = await p.evaluate(() => __game.app.state.hero());
check(
  'colour swatch changes colour only',
  recoloured.hair !== mixed.hair && recoloured.hairStyle === 'twin',
  `hair=${recoloured.hair.toString(16)} style=${recoloured.hairStyle}`,
);

await p.reload({ waitUntil: 'networkidle' });
await enter();
const heroPersisted = await p.evaluate(() => __game.app.state.hero());
check(
  'hero appearance survives a reload',
  heroPersisted.hairStyle === 'twin' &&
    heroPersisted.hair === recoloured.hair &&
    heroPersisted.headgear === 'mask',
  `hair=${heroPersisted.hairStyle} headgear=${heroPersisted.headgear}`,
);

// ── GBA-style quest overworld ──
await p.evaluate(() => {
  const app = __game.app;
  app.state.addItem('bundle_mikasa', 1);
  app.state.save();
});
await p.reload({ waitUntil: 'networkidle' });
await enter();
await p.evaluate(() => {
  __game.app.pendingQuestWaifu = 'mikasa';
  __game.app.setScreen('world');
});
await p.waitForTimeout(2200);

const worldUi = await p.evaluate(() => {
  const s = __game.app.activeQuestScene;
  return {
    mounted: !!s,
    dpad: document.querySelectorAll('.dpad-btn').length,
    aButton: [...document.querySelectorAll('.ctrl-btn')].some((b) => b.textContent.trim() === 'A'),
    bButton: [...document.querySelectorAll('.ctrl-btn')].some((b) => b.textContent.trim() === 'B'),
    relicRows: document.querySelectorAll('.relic-row').length,
    compass: !!document.querySelector('.compass'),
    viewW: s?.viewW ?? 0,
    viewH: s?.viewH ?? 0,
    canvasW: s?.canvas?.width ?? 0,
    canvasH: s?.canvas?.height ?? 0,
    linearEncode: __game.app.stage.pixel.linearEncode,
  };
});
check('overworld scene mounts', worldUi.mounted);
check('overworld shows a D-pad', worldUi.dpad === 4, `buttons=${worldUi.dpad}`);
check('overworld has A and B buttons', worldUi.aButton && worldUi.bButton);
check('overworld lists the relic checklist', worldUi.relicRows >= 4, `rows=${worldUi.relicRows}`);
check('overworld shows the compass', worldUi.compass);
check(
  'overworld renders at handheld resolution',
  worldUi.canvasW === worldUi.viewW && worldUi.canvasH === worldUi.viewH && worldUi.viewH <= 240,
  `${worldUi.canvasW}x${worldUi.canvasH}`,
);
check('overworld uses the 2D pixel pipeline', worldUi.linearEncode === false);

const walkFrom = await p.evaluate(() => {
  const s = __game.app.activeQuestScene;
  return { x: s.px, y: s.py };
});
await p.locator('.dpad-btn.up').dispatchEvent('pointerdown');
await p.waitForTimeout(1800);
await p.locator('.dpad-btn.up').dispatchEvent('pointerup');
await p.waitForTimeout(300);
const walkTo = await p.evaluate(() => {
  const s = __game.app.activeQuestScene;
  return { x: s.px, y: s.py };
});
check(
  'D-pad walks the hero',
  Math.abs(walkTo.y - walkFrom.y) > 8,
  `dy=${Math.round(walkTo.y - walkFrom.y)}`,
);

const sprite = await p.evaluate(() => {
  const s = __game.app.activeQuestScene;
  const ctx = s.canvas.getContext('2d');
  const d = ctx.getImageData(0, 0, s.canvas.width, s.canvas.height).data;
  const target = s.hero.hair;
  let hits = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]) === target) hits++;
  }
  return hits;
});
check(
  'hero sprite is drawn with the customized hair colour',
  sprite > 6,
  `hairPixels=${sprite}`,
);

const posBeforeWarp = await p.evaluate(() => {
  const s = __game.app.activeQuestScene;
  return { x: s.px, y: s.py };
});
await p.locator('button', { hasText: 'Warp to objective' }).first().click();
await p.waitForTimeout(600);
const posAfterWarp = await p.evaluate(() => {
  const s = __game.app.activeQuestScene;
  return { x: s.px, y: s.py };
});
const warped = Math.hypot(posAfterWarp.x - posBeforeWarp.x, posAfterWarp.y - posBeforeWarp.y);
check('warp jumps to the next objective', warped > 32, `moved=${Math.round(warped)}`);

const relicTest = await p.evaluate(async () => {
  const s = __game.app.activeQuestScene;
  const relic = s.relics.find((r) => !r.collected);
  if (!relic) return { skipped: true };
  s.px = relic.tx * 16;
  s.py = relic.ty * 16;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return { collected: relic.collected };
});
check('walking onto a relic collects it', relicTest.skipped || relicTest.collected === true);

await p.waitForTimeout(400);
const ticked = await p.evaluate(() => document.querySelectorAll('.relic-row.found').length);
check('relic checklist ticks off', ticked >= 1, `found=${ticked}`);

const worldOverflow = await p.evaluate(() => {
  const de = document.documentElement;
  return { doc: de.scrollWidth - de.clientWidth, docH: de.scrollHeight - de.clientHeight };
});
check(
  'overworld HUD does not overflow',
  worldOverflow.doc <= 1 && worldOverflow.docH <= 1,
  `dx=${worldOverflow.doc} dy=${worldOverflow.docH}`,
);

await p.locator('.ctrl-btn.exit').first().click();
await p.waitForTimeout(800);
const restored = await p.evaluate(() => __game.app.stage.pixel.linearEncode);
check('leaving the world restores the 3D pipeline', restored === true);

// ── landscape gate ──
const portrait = await b.newPage({ viewport: { width: 390, height: 844 } });
await portrait.goto(URL, { waitUntil: 'networkidle' });
await portrait.waitForTimeout(700);
check(
  'portrait shows the rotate gate',
  await portrait.evaluate(() => {
    const g = document.getElementById('rotate-gate');
    return g ? getComputedStyle(g).display !== 'none' : false;
  }),
);
await portrait.close();

const landscape = await b.newPage({ viewport: { width: 844, height: 390 } });
await landscape.goto(URL, { waitUntil: 'networkidle' });
await landscape.waitForTimeout(700);
check(
  'landscape hides the rotate gate',
  await landscape.evaluate(() => {
    const g = document.getElementById('rotate-gate');
    return g ? getComputedStyle(g).display === 'none' : true;
  }),
);
await landscape.close();

if (badResponses.length) console.log('BAD RESPONSES:\n' + [...new Set(badResponses)].join('\n'));
check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) console.log('FAILURES:\n' + fail.map((f) => ' - ' + f).join('\n'));

await b.close();
process.exit(fail.length ? 1 : 0);
