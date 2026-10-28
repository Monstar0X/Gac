# Waifu Gacha 3D — Luck Royale

A cozy pixel-art waifu collection game. Pull a character's **bundle** from the
Luck Royale, step into a themed quest world, hunt down four of her keepsakes,
then meet her at the **prime location** to bring her home.

Built with TypeScript, Vite and three.js. Every frame is rendered at a low
internal resolution and nearest-neighbour upscaled with ordered dithering, so
the whole game — 3D worlds, menus and HUD — shares one chunky pixel look.

## Run it

```bash
npm install
npm run dev        # http://localhost:12000
```

Other scripts:

```bash
npm run build      # production bundle into dist/
npm run preview    # serve the production build
npm run typecheck  # tsc --noEmit
npm run test       # end-to-end smoke test (needs `npm run dev` running)
```

## The core loop

1. **Luck Royale** — spend crystals on single or ten-pulls. The headline prize
   is a **bundle** for one of the six featured waifus. Bundles are guaranteed
   by pity at 80 pulls, and a duplicate bundle converts into crystals instead
   of being a dead pull.
2. **Quests** — owning a bundle opens that character's world. Each world is a
   *theme*, not a retelling of the whole anime: the Districts Beyond the Wall,
   the Frozen Manor Grounds, the Klaxosaur Wasteland, and so on.
3. **Relics** — four character-specific keepsakes are hidden in the world. For
   Mikasa: her red muffler, a Survey Corps poster, vertical maneuvering gear
   and a corps badge.
4. **Prime location** — the one spot that represents her best (Wall Rose
   Watchtower for Mikasa). Talk to her there with all four relics in hand to
   recruit her and bank the quest reward.
5. **Connection** — gift her favourite materials, chat with her, and equip
   cosmetics. Each waifu has a connection level that unlocks more dialogue.

## Playing

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `W` `A` `S` `D` / arrows | on-screen joystick |
| Sprint | `Shift` | RUN button |
| Interact | `E` / `Enter` | TALK button |
| Orbit camera | drag | drag |
| Warp to objective | — | Warp button |

The **Warp to objective** button is the accessibility escape hatch: it jumps to
the nearest uncollected relic, then to the prime location once all four are
found, so a quest can always be finished without hunting pixel by pixel.

## Project layout

```
src/
  data/        static content — types, themes, waifus, items
  engine/      rendering — chibi sprites, isometric home, three.js quest layer
  game/        rules — gacha, save/inventory state, quest scene logic
  ui/          screens, components, styles and the canvas portraits
  beta/        closed-beta invite gate, feedback tab, build config
tools/         make-invites.mjs — generates tester invite codes
```

### Art direction (v0.2)

The look follows a reference set: **chibi pixel sprites** (huge head, glossy
highlighted eyes, tiny body) living in a **moonlit isometric diorama**.

- `engine/pixelkit.ts` — CPU raster toolkit: shaded shapes with hue-shifted
  4-tone ramps, ordered dither, selective outlines tinted from the colour they
  surround. Every sprite and room goes through it.
- `engine/chibi.ts`, `chibi-rig.ts`, `chibi-outfit.ts` — the single character
  renderer. Waifus, the MC, room residents and portraits all come from a
  `CharacterSpec`; there is no per-character art to maintain.
- `engine/hero-sprite.ts` — the MC's 24×28 overworld sprite (4 directions × 4
  walk frames), in the same style and wearing the equipped outfit.
- `engine/iso-kit.ts`, `iso-props.ts`, `iso-room.ts` — the home. Pixel-exact
  isometric boxes and wall decals, per-series furniture and signature pieces,
  dithered lamp glow, moonbeam, idle animation, hover and click on residents.
  Rooms are data-driven from `data/rooms.ts` (palette, decor flags, signature).
- three.js is now used **only** for the quest worlds.

### MC wardrobe

`data/outfits.ts` holds 19 costume definitions (plus the original *Custom Fit*
colour/gear pickers). Outfits are pure data (garment shape, legwear, headgear,
back item, emblem, hip weapon); `chibi-outfit.ts` draws every shape. To add a
costume, append an entry — no render code needed unless it introduces a new
garment shape. Outfits are homages to anime-protagonist archetypes and avoid
reproducing any one licensed design.

- `engine/pixel.ts` — renders to a small render target, then upscales with a
  nearest-neighbour shader that applies the sRGB encode, colour quantisation
  and dither in one pass. Keeping the encode explicit here is what stops the
  scene from being darkened by a double colour-space conversion.
- `engine/character.ts` / `props.ts` — everything in the world is built from
  boxes, so characters and props stay crisp on the pixel grid.
- `game/gacha.ts` — seeded RNG plus pity counters. `rollOnce` mutates only the
  gacha state; the caller applies results to the inventory so save persistence
  stays in one place.

Saves live in `localStorage` under `waifu-gacha-3d:save:v1`. Settings (pixel
chunkiness, player name) are part of the same save.

## Tests

`smoke.mjs` drives a real browser through the whole game — store purchase,
gacha pull and pity guarantee, a full quest run, gifting, cosmetics, bag,
settings and persistence across a reload — and fails on any console error.

## Fan project

All characters belong to their respective series and rights holders. This is a
non-commercial fan project built as a technical demo; no affiliation with or
endorsement by any rights holder is implied.

## Closed beta (10 testers)

The build is set up for a private playtest of up to ten people.

1. `node tools/make-invites.mjs` — writes ten invite codes to `INVITE-CODES.txt`
   (hand these out; never deploy that file) and their hashes to
   `src/beta/invites.generated.ts`. Re-running revokes every earlier code once
   the new build ships.
2. Edit `src/beta/config.ts` — version, build date and an optional
   `feedbackEmail`.
3. `npm run typecheck && npm run build`, then deploy `dist/`.

Testers enter their code once (remembered per browser), pick a display name,
and get a **FEEDBACK** tab that produces a report with build, tester slot,
screen, device and recent errors (copy, download, or email).

**Be honest about the gate:** it is a soft, client-side check that stops casual
link-sharing. Anyone who reads the bundle can bypass it. For real access control
put the site behind your host's auth (Cloudflare Access, Netlify password,
nginx basic auth). The page also ships `noindex` meta and a `robots.txt` that
disallows crawling. Set `INVITE_HASHES` to `[]` for an open local dev build.

`npm test` (smoke) reads the first code from `INVITE-CODES.txt`, or
`SMOKE_INVITE`.
