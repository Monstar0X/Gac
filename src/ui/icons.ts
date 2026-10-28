/**
 * Hand-drawn 16x16 pixel-art icons.
 *
 * The UI previously leaned on OS colour emoji for navigation and buttons. Emoji
 * render differently on every platform, ignore the game's palette, and are
 * anti-aliased blobs next to the crisp pixel art everywhere else, so the nav
 * looked like a different game. These icons are authored as character grids
 * against the CSS palette and rasterised with nearest-neighbour scaling, which
 * keeps the whole interface on one visual footing.
 */

export type IconName =
  | 'home'
  | 'map'
  | 'star'
  | 'heart'
  | 'cart'
  | 'bag'
  | 'crown'
  | 'cap'
  | 'gift'
  | 'gear'
  | 'check'
  | 'play'
  | 'chat'
  | 'box'
  | 'frame'
  | 'lock'
  | 'gem'
  | 'flask'
  | 'compass'
  | 'plus'
  | 'dice'
  | 'x';

/** Palette keys used by the icon grids, matched to the CSS custom properties. */
const PALETTE: Record<string, string> = {
  k: '#0d1130', // outline            --wood-900
  w: '#634834', // wood               --wood-500
  W: '#7d5c43', // wood light         --wood-400
  c: '#f7ecd9', // cream              --cream
  C: '#d9c9ae', // cream dim          --cream-dim
  a: '#f2b45c', // amber              --amber
  A: '#c8873a', // amber deep         --amber-deep
  r: '#e88fa8', // rose               --rose
  h: '#ffc4d4', // rose highlight
  g: '#9fc48a', // sage               --sage
  G: '#6f9459', // sage deep
  y: '#ffd75e', // gold               --r5
  '.': '',
};

const ICONS: Record<IconName, string[]> = {
  home: [
    '................',
    '.......kk.......',
    '......kcck......',
    '.....kcccck.....',
    '....kcccccck....',
    '...kcccccccck...',
    '..kcccccccccck..',
    '..kkkkkkkkkkkk..',
    '..kaaaaaaaaaak..',
    '..kakkaaaakkak..',
    '..kakkaaaakkak..',
    '..kaaaaaaaaaak..',
    '..kaaaakkaaaak..',
    '..kaaaakkaaaak..',
    '..kkkkkkkkkkkk..',
    '................',
  ],
  map: [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..kccckcccccck..',
    '..kccckccaaack..',
    '..kccckccaccck..',
    '..kccckccaccck..',
    '..kccckccaaack..',
    '..kccckcccccck..',
    '..kccckcccccck..',
    '..kccckcccccck..',
    '..kccckcccccck..',
    '..kccckcccccck..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
  ],
  star: [
    '................',
    '.......kk.......',
    '.......yy.......',
    '......kyyk......',
    '......kyyk......',
    '.....kyyyyk.....',
    '.....kyyyyk.....',
    '.kkyyyyyyyyyykk.',
    '.kyyyyyyyyyyyyk.',
    '..kyyyyyyyyyyk..',
    '...kyyyyyyyyk...',
    '...kyyyyyyyyk...',
    '..kyyyk..kyyyk..',
    '..kyyk....kyyk..',
    '.kyk........kyk.',
    '................',
  ],
  heart: [
    '................',
    '...kk.....kk....',
    '..khhk...khhk...',
    '.khhrrk.krrrrk..',
    'khrrrrkhrrrrrk..',
    'krrrrrrrrrrrrrk.',
    'krrrrrrrrrrrrrk.',
    '.krrrrrrrrrrrk..',
    '..krrrrrrrrrk...',
    '...krrrrrrrk....',
    '....krrrrrk.....',
    '.....krrrk......',
    '......krk.......',
    '.......k........',
    '................',
    '................',
  ],
  cart: [
    '................',
    '................',
    '................',
    '........kkkk....',
    '.......kw..wk...',
    '...kkkkkkkkkk...',
    '..kWWWWWWWWWWk..',
    '..kWWWWWWWWWWk..',
    '..kkkkkkkkkkkk..',
    '....kk....kk....',
    '...kwwk..kwwk...',
    '...kkkk..kkkk...',
    '................',
    '................',
    '................',
    '................',
  ],
  bag: [
    '................',
    '................',
    '......kkkk......',
    '.....k....k.....',
    '....kkkkkkkk....',
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '....kkkkkkkk....',
    '....kwaaaawk....',
    '....kwaaaawk....',
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '....kkkkkkkk....',
    '................',
    '................',
  ],
  crown: [
    '................',
    '................',
    '..k..........k..',
    '..k..k....k..k..',
    '..k..k....k..k..',
    '..k..k....k..k..',
    '..k..kk..kk..k..',
    '..kkkkkkkkkkkk..',
    '..kyykyyyykyyk..',
    '..kyykyyyykyyk..',
    '..kkkkkkkkkkkk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
    '................',
    '................',
  ],
  cap: [
    '................',
    '................',
    '.....kkkkkk.....',
    '....kcckkcck....',
    '...kcccccccck...',
    '..kcccccccccck..',
    '..kcccccccccck..',
    '..kkkkkkkkkkkk..',
    '..kwwwwwwwwwwk..',
    '..kwwwwwwwwwwk..',
    '...kwwwwwwwwk...',
    '....kkkkkkkk....',
    '................',
    '................',
    '................',
    '................',
  ],
  gift: [
    '................',
    '................',
    '....kk...kk.....',
    '..krrk...krrk...',
    '..krrkkkkkrrk...',
    '..krrrrrrrrrk...',
    '..kkkkkkkkkkkk..',
    '..kaaaakkaaaak..',
    '..kaaaakkaaaak..',
    '..kaaaakkaaaak..',
    '..kaaaakkaaaak..',
    '..kaaaakkaaaak..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
  ],
  gear: [
    '................',
    '.....kkkk.......',
    '.....kwwk.......',
    '..kkkkwwkkkk....',
    '..kwwwwwwwwk....',
    '..kwwwwwwwwk....',
    '..kwwkkkkwwk....',
    '..kwwk..kwwk....',
    '..kwwkkkkwwk....',
    '..kwwwwwwwwk....',
    '..kkkkwwkkkk....',
    '.....kwwk.......',
    '.....kkkk.......',
    '................',
    '................',
    '................',
  ],
  check: [
    '................',
    '................',
    '.............kk.',
    '............kggk',
    '...........kggk.',
    '..........kggk..',
    '.kk......kggk...',
    '.kgk....kggk....',
    '..kgk..kggk.....',
    '...kgkkggk......',
    '....kgggk.......',
    '.....kkk........',
    '................',
    '................',
    '................',
    '................',
  ],
  play: [
    '................',
    '................',
    '......kk........',
    '......kgk.......',
    '......kggk......',
    '......kgggk.....',
    '......kggggk....',
    '......kgggggk...',
    '......kggggk....',
    '......kgggk.....',
    '......kggk......',
    '......kgk.......',
    '......kk........',
    '................',
    '................',
    '................',
  ],
  chat: [
    '................',
    '................',
    '..kkkkkkkkkk....',
    '..kcccccccck....',
    '..kckccckcck....',
    '..kcccccccck....',
    '..kckccckcck....',
    '..kcccccccck....',
    '..kckkkkkcck....',
    '..kcccccccck....',
    '..kkkkkkkkkk....',
    '.....kk.........',
    '....kk..........',
    '...kk...........',
    '..kk............',
    '................',
  ],
  box: [
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kWWWWWWWWWWWWk.',
    '.kkkkkkkkkkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kwwwwkAAkwwwwk.',
    '.kwwwwkAAkwwwwk.',
    '.kwwwwkAAkwwwwk.',
    '.kwwwwwwwwwwwwk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
    '................',
  ],
  frame: [
    '................',
    '................',
    '................',
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kwwwwwwwwwwwwk.',
    '.kwccccccccccwk.',
    '.kwcggggggggcwk.',
    '.kwcggggggggcwk.',
    '.kwccccccccccwk.',
    '.kwwwwwwwwwwwwk.',
    '.kkkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
    '................',
  ],
  lock: [
    '................',
    '................',
    '....kkkkkkkk....',
    '....kaaaaaak....',
    '....ka....ak....',
    '....ka....ak....',
    '..kkkkkkkkkkkk..',
    '..kyyyyyyyyyyk..',
    '..kyyyyAAyyyyk..',
    '..kyyyyAAyyyyk..',
    '..kyyyyyyyyyyk..',
    '..kyyyyyyyyyyk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
  ],
  gem: [
    '................',
    '................',
    '....kkkkkk......',
    '...kyyyyyyk.....',
    '..kyyyyyyyyk....',
    '.kyyyyyyyyyyk...',
    '.kyycyyyycyyk...',
    '..kyyyyyyyyk....',
    '...kyyyyyyk.....',
    '....kyyyyyk.....',
    '.....kyyyk......',
    '......kyk.......',
    '.......k........',
    '................',
    '................',
    '................',
  ],
  flask: [
    '................',
    '................',
    '.......kk.......',
    '......kcck......',
    '......kcck......',
    '......kcck......',
    '.....kkcckk.....',
    '.....kcccck.....',
    '....kcccccck....',
    '...kcccccccck...',
    '...kcggggggck...',
    '...kcgGggGgck...',
    '...kcggggggck...',
    '....kkkkkkkk....',
    '................',
    '................',
  ],
  compass: [
    '................',
    '.....kkkkkk.....',
    '...kkCCCCCCkk...',
    '..kCCCCCCCCCCk..',
    '..kCCCkkrrCCCk..',
    '..kCCkkkrrrCCk..',
    '.kCCCkkkkrrrCCk.',
    '.kCCCCkkkrrrCCk.',
    '.kCCCCCkkkrrCCk.',
    '.kCCCCCCkkkCCk..',
    '..kCCCCCkkCCCk..',
    '..kCCCCCCCCCk...',
    '...kkCCCCCCkk...',
    '.....kkkkkk.....',
    '................',
    '................',
  ],
  plus: [
    '................',
    '................',
    '.....kkkkk......',
    '.....kgggk......',
    '.....kgggk......',
    '...kkkgggkkk....',
    '...kgggggggk....',
    '...kgggggggk....',
    '...kgggggggk....',
    '...kkkgggkkk....',
    '.....kgggk......',
    '.....kgggk......',
    '.....kkkkk......',
    '................',
    '................',
    '................',
  ],
  dice: [
    '................',
    '................',
    '...kkkkkkkkk....',
    '...kccccccck....',
    '...kckccckck....',
    '...kccccccck....',
    '...kckccckck....',
    '...kccccccck....',
    '...kckccckck....',
    '...kccccccck....',
    '...kkkkkkkkk....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  x: [
    '................',
    '................',
    '..kk........kk..',
    '..kgk......kgk..',
    '...kgk....kgk...',
    '....kgk..kgk....',
    '.....kgkkgk.....',
    '......kggk......',
    '.....kgkkgk.....',
    '....kgk..kgk....',
    '...kgk....kgk...',
    '..kgk......kgk..',
    '..kk........kk..',
    '................',
    '................',
    '................',
  ],
};

const GRID = 16;

/**
 * Grids are hand-authored, so a stray short row would silently shift every pixel
 * after it. Validate once per icon on first draw rather than shipping a
 * half-drawn glyph.
 */
const validated = new Set<IconName>();

function validate(name: IconName, rows: string[]): void {
  if (validated.has(name)) return;
  if (rows.length !== GRID) {
    throw new Error(`icon "${name}" has ${rows.length} rows, expected ${GRID}`);
  }
  rows.forEach((row, y) => {
    if (row.length !== GRID) {
      throw new Error(`icon "${name}" row ${y} has ${row.length} cells, expected ${GRID}`);
    }
    for (const ch of row) {
      if (!(ch in PALETTE)) {
        throw new Error(`icon "${name}" row ${y} uses unknown palette key "${ch}"`);
      }
    }
  });
  validated.add(name);
}

export function drawPixelIcon(canvas: HTMLCanvasElement, name: IconName, size = 24): void {
  const rows = ICONS[name];
  validate(name, rows);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.max(1, Math.round((size * dpr) / GRID));
  const px0 = scale * GRID;

  canvas.width = px0;
  canvas.height = px0;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, px0, px0);

  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < GRID; x++) {
      const color = PALETTE[row[x] ?? '.'];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
}

/** A ready-to-append `<canvas>` icon. */
export function pixelIcon(name: IconName, size = 24, className = ''): HTMLCanvasElement {
  const c = document.createElement('canvas');
  if (className) c.className = className;
  c.setAttribute('role', 'presentation');
  c.setAttribute('aria-hidden', 'true');
  drawPixelIcon(c, name, size);
  return c;
}

/** Pairs an icon with button text so labels line up without emoji. */
export function iconLabel(name: IconName, label: string, size = 18): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'icon-label';
  span.append(pixelIcon(name, size, 'btn-ico'), document.createTextNode(label));
  return span;
}
