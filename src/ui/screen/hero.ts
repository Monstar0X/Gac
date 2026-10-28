import { el, clear } from '../dom';
import { iconLabel } from '../icons';
import type { AppContext } from '../../engine/app-stage';
import { SPRITE_H, SPRITE_W, drawHeroSprite } from '../../engine/hero-sprite';
import { chibiBitmap, type ChibiSpec } from '../../engine/chibi';
import { CUSTOM_OUTFIT_ID, OUTFITS, type OutfitDef } from '../../data/outfits';
import {
  HERO_BACKS,
  HERO_BUILDS,
  HERO_COLORS,
  HERO_EYES,
  HERO_HAIRS,
  HERO_HAIR_STYLES,
  HERO_HEADGEAR,
  HERO_PRESETS,
  DEFAULT_HERO,
  HERO_SKINS,
  heroOutfit,
  heroToSpec,
  type HeroAppearance,
} from '../../data/player';

/**
 * The hero customization screen.
 *
 * Presets are a starting point, not a lock: every feature has its own picker,
 * so a player can take the Shonen Lead's hair, the Court Knight's cloak and any
 * palette they like and end up with something nobody else has.
 */

/** Big front-facing chibi of the hero in their current costume. */
function bigPreview(hero: HeroAppearance, scale: number): HTMLCanvasElement {
  const bmp = chibiBitmap({ spec: heroToSpec(hero) as ChibiSpec, outfit: heroOutfit(hero), expression: 'smile' });
  const c = document.createElement('canvas');
  c.width = bmp.w * scale;
  c.height = bmp.h * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bmp.canvas(), 0, 0, c.width, c.height);
  return c;
}

/** The overworld sprite in all four directions, so back-of-cloak details are visible too. */
function walkRow(hero: HeroAppearance, scale: number): HTMLCanvasElement {
  const dirs = ['down', 'left', 'right', 'up'] as const;
  const c = document.createElement('canvas');
  c.width = SPRITE_W * scale * dirs.length;
  c.height = SPRITE_H * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  dirs.forEach((dir, i) => {
    ctx.save();
    ctx.scale(scale, scale);
    drawHeroSprite(ctx, hero, dir, 0, i * SPRITE_W, 0);
    ctx.restore();
  });
  return c;
}

function walkOne(hero: HeroAppearance): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const k = 2;
  c.width = SPRITE_W * k;
  c.height = SPRITE_H * k;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.scale(k, k);
  drawHeroSprite(ctx, hero, 'down', 0);
  return c;
}

/** A small head-and-shoulders thumbnail of an outfit on the current hero. */
function outfitThumb(hero: HeroAppearance, outfit: OutfitDef | null): HTMLCanvasElement {
  const worn = outfit ? { ...hero, outfit: outfit.id } : hero;
  const bmp = chibiBitmap({ spec: heroToSpec(worn) as ChibiSpec, outfit: heroOutfit(worn), expression: 'neutral' });
  const c = document.createElement('canvas');
  const s = 2;
  c.width = 44 * s;
  c.height = 54 * s;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bmp.canvas(), 2, 3, 44, 54, 0, 0, c.width, c.height);
  return c;
}

/** A row of colour swatches bound to one appearance field. */
function colorRow(
  label: string,
  colors: number[],
  current: number,
  onPick: (color: number) => void,
): HTMLElement {
  const row = el('div', { class: 'hero-field' }, [el('div', { class: 'hero-label', text: label })]);
  const grid = el('div', { class: 'swatch-grid' });
  for (const color of colors) {
    const sw = el('button', {
      class: `swatch${color === current ? ' active' : ''}`,
      style: `background:#${color.toString(16).padStart(6, '0')}`,
      title: `#${color.toString(16).padStart(6, '0')}`,
    });
    sw.addEventListener('click', () => onPick(color));
    grid.append(sw);
  }
  row.append(grid);
  return row;
}

/** A row of text option chips bound to one appearance field. */
function optionRow<T extends string>(
  label: string,
  options: { id: T; label: string }[],
  current: T,
  onPick: (id: T) => void,
): HTMLElement {
  const row = el('div', { class: 'hero-field' }, [el('div', { class: 'hero-label', text: label })]);
  const chips = el('div', { class: 'chip-row' });
  for (const opt of options) {
    const chip = el('button', {
      class: `chip${opt.id === current ? ' active' : ''}`,
      text: opt.label,
    });
    chip.addEventListener('click', () => onPick(opt.id));
    chips.append(chip);
  }
  row.append(chips);
  return row;
}

type HeroTab = 'wardrobe' | 'look';

export function renderHero(app: AppContext, root: HTMLElement) {
  let tab: HeroTab = 'wardrobe';
  const render = () => {
    clear(root);
    const hero = app.state.hero();

    root.append(
      el('div', { class: 'screen-head' }, [
        el('div', { class: 'screen-title', text: 'HERO' }),
        el('div', {
          class: 'screen-sub',
          text: 'Dress your protagonist in a costume inspired by classic anime leads, or build your own look.',
        }),
      ]),
    );

    const body = el('div', { class: 'hero-layout' });

    // ── left: live preview ──
    const outfit = heroOutfit(hero);
    const left = el('div', { class: 'hero-preview' });
    const stage = el('div', { class: 'hero-stage' });
    stage.append(bigPreview(hero, 5));
    left.append(stage);
    left.append(el('div', { class: 'outfit-name', text: outfit.name }));
    left.append(el('div', { class: 'outfit-vibe', text: outfit.vibe }));
    left.append(el('div', { class: 'card-meta', text: outfit.blurb }));
    const walk = el('div', { class: 'hero-walk' });
    walk.append(walkRow(hero, 3));
    left.append(walk);
    left.append(el('div', { class: 'card-meta', text: 'Quest-world sprite: front, left, right, back.' }));
    body.append(left);

    // ── right: per-feature pickers ──
    const right = el('div', { class: 'hero-controls' });
    const tabs = el('div', { class: 'hero-tabs' });
    for (const [id, label] of [['wardrobe', 'WARDROBE'], ['look', 'APPEARANCE']] as [HeroTab, string][]) {
      const t = el('button', { class: `hero-tab${tab === id ? ' active' : ''}`, text: label });
      t.dataset.tab = id;
      t.addEventListener('click', () => {
        tab = id;
        render();
      });
      tabs.append(t);
    }
    right.append(tabs);

    if (tab === 'wardrobe') {
      right.append(el('div', { class: 'hero-label', text: `OUTFITS · ${OUTFITS.length + 1}` }));
      const grid = el('div', { class: 'outfit-grid' });
      const entries: (OutfitDef | null)[] = [null, ...OUTFITS];
      for (const o of entries) {
        const id = o ? o.id : CUSTOM_OUTFIT_ID;
        const active = (hero.outfit ?? CUSTOM_OUTFIT_ID) === id;
        const card = el('button', { class: `outfit-card${active ? ' active' : ''}${o ? ` r${o.rarity}` : ''}` });
        card.dataset.outfit = id;
        card.append(outfitThumb(hero, o));
        card.append(el('span', { class: 'outfit-card-name', text: o ? o.name : 'Custom Fit' }));
        card.append(el('span', { class: 'outfit-card-vibe', text: o ? o.vibe : 'Your colours' }));
        if (o) card.append(el('span', { class: 'outfit-stars', text: '★'.repeat(o.rarity) }));
        card.addEventListener('click', () => {
          app.state.setHero({ outfit: id });
          app.sync();
          app.toast(o ? `Equipped: ${o.name}` : 'Custom Fit equipped', 'good');
          app.refresh();
        });
        grid.append(card);
      }
      right.append(grid);

      const acts = el('div', { class: 'hero-actions' });
      if (outfit.hair) {
        const match = el('button', { class: 'btn' }, [iconLabel('star', 'Match hair & eyes to outfit')]);
        match.addEventListener('click', () => {
          const h = outfit.hair!;
          app.state.setHero({ hairStyle: h.style, hair: h.color, eye: h.eye });
          app.sync();
          app.toast('Hair and eyes matched.', 'good');
          app.refresh();
        });
        acts.append(match);
      }
      const home = el('button', { class: 'btn ghost' }, [iconLabel('home', 'See it at home')]);
      home.addEventListener('click', () => app.setScreen('home'));
      acts.append(home);
      right.append(acts);
      body.append(right);
      root.append(body);
      return;
    }

    if (hero.outfit !== CUSTOM_OUTFIT_ID) {
      const note = el('div', { class: 'hero-note' }, [
        el('span', { text: `${outfit.name} has its own colours. ` }),
      ]);
      const toCustom = el('button', { class: 'chip', text: 'Switch to Custom Fit to recolour' });
      toCustom.addEventListener('click', () => {
        app.state.setHero({ outfit: CUSTOM_OUTFIT_ID });
        app.refresh();
      });
      note.append(toCustom);
      right.append(note);
    }

    right.append(
      optionRow(
        'HAIR STYLE',
        HERO_HAIR_STYLES,
        hero.hairStyle,
        (id) => {
          app.state.setHero({ hairStyle: id });
          render();
        },
      ),
    );

    right.append(
      colorRow('HAIR COLOUR', HERO_HAIRS, hero.hair, (c) => {
        app.state.setHero({ hair: c });
        render();
      }),
    );

    right.append(
      colorRow('SKIN TONE', HERO_SKINS, hero.skin, (c) => {
        app.state.setHero({ skin: c });
        render();
      }),
    );

    right.append(
      colorRow('EYE COLOUR', HERO_EYES, hero.eye, (c) => {
        app.state.setHero({ eye: c });
        render();
      }),
    );

    const custom = hero.outfit === CUSTOM_OUTFIT_ID;
    if (custom) right.append(
      colorRow('OUTFIT TOP', HERO_COLORS, hero.top, (c) => {
        app.state.setHero({ top: c });
        render();
      }),
    );

    if (custom) right.append(
      colorRow('OUTFIT BOTTOM', HERO_COLORS, hero.bottom, (c) => {
        app.state.setHero({ bottom: c });
        render();
      }),
    );

    if (custom) right.append(
      colorRow('ACCENT', HERO_COLORS, hero.accent, (c) => {
        app.state.setHero({ accent: c });
        render();
      }),
    );

    if (custom) right.append(
      optionRow(
        'HEADGEAR',
        HERO_HEADGEAR,
        hero.headgear,
        (id) => {
          app.state.setHero({ headgear: id });
          render();
        },
      ),
    );

    if (custom) right.append(
      optionRow(
        'BACK ITEM',
        HERO_BACKS,
        hero.back,
        (id) => {
          app.state.setHero({ back: id });
          render();
        },
      ),
    );

    // Archetypes are quick starting points for the custom fit.
    const presetBox = el('div', { class: 'hero-field' }, [el('div', { class: 'hero-label', text: 'QUICK LOOKS (custom fit)' })]);
    const presetGrid = el('div', { class: 'preset-grid' });
    for (const preset of HERO_PRESETS) {
      const card = el('button', { class: 'preset-card' });
      const full = { ...preset.appearance, outfit: CUSTOM_OUTFIT_ID };
      card.append(walkOne(full));
      card.append(el('span', { class: 'preset-name', text: preset.name }));
      card.title = preset.blurb;
      card.addEventListener('click', () => {
        app.state.setHeroAppearance({ ...full });
        app.sync();
        app.toast(`Quick look applied: ${preset.name}`, 'good');
        render();
      });
      presetGrid.append(card);
    }
    presetBox.append(presetGrid);
    right.append(presetBox);

    // Build is a numeric field, so it gets its own small row.
    const buildRow = el('div', { class: 'hero-field' }, [
      el('div', { class: 'hero-label', text: 'BUILD' }),
    ]);
    const buildChips = el('div', { class: 'chip-row' });
    for (const b of HERO_BUILDS) {
      const chip = el('button', {
        class: `chip${Math.abs(b.value - hero.build) < 0.01 ? ' active' : ''}`,
        text: b.label,
      });
      chip.addEventListener('click', () => {
        app.state.setHero({ build: b.value });
        render();
      });
      buildChips.append(chip);
    }
    buildRow.append(buildChips);
    right.append(buildRow);

    // ── actions ──
    const actions = el('div', { class: 'hero-actions' });

    const randomize = el('button', { class: 'btn rose' }, [iconLabel('dice', 'Randomize everything')]);
    randomize.addEventListener('click', () => {
      const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
      app.state.setHeroAppearance({
        skin: pick(HERO_SKINS),
        hair: pick(HERO_HAIRS),
        hairStyle: pick(HERO_HAIR_STYLES).id,
        eye: pick(HERO_EYES),
        top: pick(HERO_COLORS),
        bottom: pick(HERO_COLORS),
        accent: pick(HERO_COLORS),
        headgear: pick(HERO_HEADGEAR).id,
        back: pick(HERO_BACKS).id,
        build: pick(HERO_BUILDS).value,
        outfit: pick([CUSTOM_OUTFIT_ID, ...OUTFITS.map((o) => o.id)]),
      });
      app.toast('Rolled a brand new look.', 'good');
      render();
    });
    actions.append(randomize);

    const reset = el('button', { class: 'btn ghost', text: '↺ Reset to default' });
    reset.addEventListener('click', () => {
      app.state.setHeroAppearance({ ...DEFAULT_HERO });
      app.toast('Hero reset.', 'info');
      render();
    });
    actions.append(reset);

    const view = el('button', { class: 'btn ghost' }, [iconLabel('map', 'Try in a quest world')]);
    view.addEventListener('click', () => {
      const owned = app.state.ownedWaifuList().map((o) => o.id);
      const featured = owned.find((id) => app.state.questUnlocked(id));
      if (featured) {
        app.pendingQuestWaifu = featured;
        app.setScreen('world');
      } else {
        app.toast('Finish a quest world first to walk around as your hero.', 'info');
      }
    });
    actions.append(view);

    right.append(actions);
    body.append(right);
    root.append(body);
  };

  render();
}
