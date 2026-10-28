# AGENTS.md

Pixel-art 3D waifu collection game. TypeScript + Vite + three.js, no UI
framework â€” the interface is plain DOM built with the helpers in `src/ui/dom.ts`.

## Commands

```bash
npm run dev        # vite on port 12000 (strictPort)
npm run typecheck  # tsc --noEmit â€” run this after every change
npm run build      # vite build
npm run test       # node smoke.mjs â€” requires `npm run dev` to be running
```

`npm run typecheck` and `npm run test` are the two gates. The smoke test fails
on any console error, so never leave the dev server logging errors.

## Architecture

Four layers, one direction of dependency: `data` -> `engine` -> `game` -> `ui`.

- `src/data/` â€” static content only (types, themes, waifus, items). Adding a
  waifu means adding her relics, cosmetics, dialogue and gift tags here.
- `src/engine/` â€” rendering. Home and portraits are 2D pixel art: `pixelkit.ts`
  (raster toolkit), `chibi*.ts` (the one character renderer), `iso-*.ts` (the
  isometric home diorama), `hero-sprite.ts` (MC overworld sprite). three.js is
  used only for quest worlds: `pixel.ts` owns the render pipeline,
  `character.ts`/`props.ts` build voxel boxes, `world.ts` assembles a themed
  world, `stage.ts` owns the canvas and render loop.
- `src/beta/` â€” closed-beta gate, feedback tab, config. Regenerate invites with
  `node tools/make-invites.mjs`; never commit `INVITE-CODES.txt`.
- `src/game/` â€” rules. `gacha.ts` is pure (seeded RNG + pity, no DOM),
  `state.ts` owns the save file and all mutation of it, `quest.ts` is the
  playable scene.
- `src/ui/` â€” screens and components. Screens receive an `AppContext`
  (`src/engine/app-stage.ts`) and never touch three.js directly.

`AppContext` is the seam between the app shell and the screens: `setScreen`,
`mountQuest`, `clearStage`, `home.setGuest`, `pendingQuestWaifu`, `toast`,
`sync`. Extend that interface rather than reaching into `App`.

## Things that will bite you

**Colour space in the pixel pipeline.** `engine/pixel.ts` renders the scene
into a render target and then upscales it with a custom shader. The render
target must stay linear (`NoColorSpace`) and the shader must perform the single
sRGB encode itself. Getting this wrong is not a subtle tint â€” the whole scene
renders roughly 7x too dark, and it looks like a lighting bug. If the game ever
goes dark, check the encode before touching a single light intensity.

**Light intensities are in physical units.** three.js r155+ uses physically
correct lighting by default, so point lights need values in the tens to
hundreds, not `0.5`-`2`. The cozy home room uses ~2.1 for the hemisphere light
and 28-70 for the lamps.

**HUD nodes before scene callbacks.** The quest world's HUD elements are
created *before* `new QuestScene(...)`, because the scene's callbacks
(`onCompass`, `onPromptChange`) fire from its first animation frame. Creating
the HUD after the scene throws a temporal-dead-zone error on the first frame.

**Warp distances must land inside the interaction radius.** Relics are picked
up within 3.4 units and the prime location is interacted with within 8. Warping
the player to exactly 5 units from a relic looks right and collects nothing.
`teleportToNearestRelic` uses 2.2 for this reason.

**The full-bleed world mode has no nav bar.** `setScreen('world')` renders only
the world HUD, so anything that navigates away from the quest world must call
`clearStage()` first or the player is stranded with no navigation.

## Conventions

- Two-space indent, single quotes, semicolons. Prettier-ish; match the file.
- No framework, no state library. DOM via `el()` from `ui/dom.ts`.
- Keep `game/gacha.ts` free of DOM and persistence â€” it is the easiest thing in
  the codebase to unit test.
- Screens are `render<Name>(app, root)` functions plus `open<Name>` modals.
- Comments explain *why*, not *what*. Do not narrate the diff.

## Currencies

Three wallets live on `GameState`: `coins`, `crystals`, and `royalTokens`.
`canAfford`/`spend` take the currency name, and `ShopEntry.currency` accepts all
three. Royal Tokens are the quest- and quiz-exclusive currency; their only sink
is the Store's Royal Exchange (`ROYAL_ITEMS` in `data/items.ts`). Do not price
anything in tokens that is not meant to be earned rather than bought.

`CURRENCY_BOOST` in `game/state.ts` multiplies the starting wallet, the daily
claim and the quest rewards. It is set high for playtesting; set it to `1` for
shipping. Existing saves pick up a boost change through the `boostApplied`
migration field, so raising the constant is safe.

## Rooms

`data/rooms.ts` holds one `RoomDef` per series. `roomForSeries` maps a waifu to
her room; `availableRooms(state)` returns the rooms the player can reach and
`roomGuests(state, roomId)` the waifus standing in one. Characters from the same
series share a room by design. A room without a `RoomDef` falls back to
`DEFAULT_ROOM`, so adding a series needs a `waifus.ts` entry, not a room.

## Materials and quiz

Materials can be *bound* to a waifu (max 3) via `equipMaterial`; binding raises
every gift's connection gain through `materialBonus`, with rarity-scaled
diminishing returns. Binding is the permanent investment; giving the same item
as a gift consumes it. `data/quiz.ts` holds the Royal Quiz questions, grouped by
series; `answerQuiz` pays only on a first correct answer, tracked in
`quiz.answered`.

## Verification

`npm run test` runs `smoke.mjs` (Playwright) against `APP_URL`, defaulting to
`http://localhost:12000/`. It covers the currency boost, per-series rooms and
guests, the welcome dismiss, overflow on every screen, material binding and its
persistence, quiz rewards and replay, the Royal Exchange, and the landscape
gate. Run it against the public URL too before calling a deploy good.

Playwright's browser binary lives in `~/.cache/ms-playwright`, which the sandbox
does not preserve across a restart. `smoke.mjs` therefore probes the managed
browser first and falls back to the distro Chromium at `/usr/bin/chromium`, so
it keeps working after a restart without reinstalling. If both are missing, run
`npx playwright install chromium`.

## Serving

`serve.sh` runs `vite preview` on ports 12000 and 12001 under a relaunch loop.
Port 12000 backs the `work-1-â€¦` public host and 12001 the `work-2-â€¦` host. A
plain background launch does not survive a sandbox restart, so use the
supervisor:

```
cd /workspace/project && ./serve.sh &
```

A sandbox restart kills the process and wipes `/tmp`, so the app 502s until
`serve.sh` is started again. Logs go to `preview.log`.

Each relaunch loop waits for a real HTTP response and then polls every 30s, so a
server that hangs (still accepting TCP but not answering) gets recycled rather
than sitting dead. The loop uses `node_modules/.bin/vite` directly instead of
`npx`, because killing the `npx` wrapper leaves the vite child alive and holding
the port.

`serve.sh` only survives a process crash, not a sandbox restart. After a restart
nothing re-arms it automatically — there is no cron or systemd in the sandbox —
so start it again by hand.

**The sandbox itself pauses when the conversation goes idle.** The runtime sets
`OH_RUNTIME_IDLE_TIMEOUT_SECONDS=1200`, so roughly 20 minutes after the last
agent/user activity the whole sandbox is paused and every process in it dies,
including `serve.sh` and both preview servers. This is enforced by the platform
outside the container, so nothing inside the sandbox can prevent it — no
in-container supervisor, keepalive or daemon survives. Observed twice: the
container rebooted at 06:34 and again at 07:20, each about 20 minutes after a
conversation went quiet. Any tester hitting a paused sandbox gets a 502 Bad
Gateway. For a long playtest window, either keep the conversation warm (a
message every ~15 minutes resets the timer) or serve the build from a host that
is not tied to this sandbox.

The playtest URLs are:

- port 12000 -> `https://work-1-ahijrnudmatlmrrm.prod-runtime.all-hands.dev/`
- port 12001 -> `https://work-2-ahijrnudmatlmrrm.prod-runtime.all-hands.dev/`

## Pixel icon system

`src/ui/icons.ts` owns every UI glyph. There is no emoji anywhere in the app:
`IconName` is a string union, `ICONS` maps each name to 16 hand-authored rows of
16 palette characters, and `pixelIcon(name, size)` renders one to a canvas with
`imageSmoothingEnabled = false`. `iconLabel(name, text)` pairs an icon with a
label for buttons. A test asserts no colour emoji survives in any screen.

Grids are validated on first draw (`validate()`): a row that is not exactly 16
characters, or a character missing from `PALETTE`, throws immediately. Hand-edited
grids drift silently otherwise, shifting every pixel after the bad row.

Palette keys are single characters, so the same key means the same colour across
all icons: `k` outline, `a` amber, `c` cyan, `w`/`W` wood, `r` rose, `g` green,
`?` muted, `.` transparent. Reuse an existing key rather than adding a shade.

To inspect a grid as ASCII, run `node _icon-ascii.mjs` (needs the preview server
up; it imports `/src/ui/icons.ts` through the dev server). It prints one block per
icon using a per-colour character, which is far easier to eyeball than a 16px
canvas. Keep its `names` list in sync with the `IconName` union.

### Icon animation

`src/ui/icon-anim.css` (imported after `styles.css` in `main.ts`) holds the motion
layer. Two rules matter when editing it:

- Every animation uses `steps()`, never an easing. Eased transforms interpolate
  sub-pixels and blur the drawn grids, so icons must snap between whole-pixel
  poses like sprite frames.
- Keyframes animate the standalone `translate`/`scale` properties, not
  `transform`. Button icons carry a baseline `transform: translateY(-1px)` for
  optical centring; animating `transform` would clobber it and pop the icon 1px.

`prefers-reduced-motion: reduce` turns all of it off, and the selectors there
must be as specific as the animated ones (`.ico.coin`, not `.ico`) or the
reduced-motion override silently loses.

## Currency marks

The round currency chips (`.ico.coin`, `.ico.crystal`, `.ico.shard`,
`.ico.token`) need the `ico` base class as well as the shape class, because the
gradient and clip-path rules are scoped `.ico.coin`. Writing `class="ico-inline
crystal"` produces a correctly sized but invisible span. `.ico-lg` and
`.ico-inline` only carry size, so they must be combined: `ico ico-inline crystal`.

## The emoji check

`smoke.mjs` fails the run if any rendered text contains a colour emoji, using
`\p{Extended_Pictographic}`. Do not go back to hand-written codepoint ranges —
they are subtly wrong in both directions. U+25B6 ▶ and U+2764 ❤ are pictographic
and render in colour, while U+2713 ✓ and U+2605 ★ sit inside the same dingbat
block but do not. The property gets this right and the ranges do not.

Two traps when editing that check: a regex with the `g` flag carries `lastIndex`
between `.test` calls, so a shared instance silently skips every other node; and
the nav-screen loop never visits the title screen, so it is scanned separately.

