/** Hand-drawn SVG art for Pearl's boutique (no emoji, no raster files). */
const INK = '#2a201c';

/** A small fish bone, drawn at (x, y) with rotation. */
function bone(x: number, y: number, r = 0, s = 1): string {
  return `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-9 0 H9 M-5 -4 V4 M-1 -4.5 V4.5 M3 -4 V4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none"/><path d="M9 0 L14 -4 L14 4Z" fill="#fbf6ec" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><circle cx="-10" cy="0" r="2.4" fill="#fbf6ec" stroke="${INK}" stroke-width="1.4"/></g>`;
}

export const ART = {
  gift: `<svg viewBox="0 0 64 64" class="bq-art"><rect x="10" y="26" width="44" height="30" rx="3" fill="#f6c9c4" stroke="${INK}" stroke-width="2.4"/><rect x="7" y="18" width="50" height="11" rx="3" fill="#e89a96" stroke="${INK}" stroke-width="2.4"/><path d="M32 18 V56" stroke="#d9a441" stroke-width="6"/><path d="M32 18 V56" stroke="${INK}" stroke-width="1" opacity=".4"/><path d="M32 18 C24 6 12 10 18 17 C21 20 28 19 32 18 C36 19 43 20 46 17 C52 10 40 6 32 18Z" fill="#d9a441" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/></svg>`,
  pouch: `<svg viewBox="0 0 80 80" class="bq-art"><path d="M22 34 C14 46 14 66 26 70 H54 C66 66 66 46 58 34Z" fill="#c8a46e" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M24 34 Q40 26 56 34" fill="none" stroke="#d9a441" stroke-width="4"/><path d="M28 30 Q40 18 52 30" fill="#a87a4a" stroke="${INK}" stroke-width="2"/>${bone(36, 24, -20, 0.9)}${bone(46, 22, 25, 0.8)}<circle cx="40" cy="52" r="7" fill="#f3e6c9" stroke="${INK}" stroke-width="1.6"/><path d="M36 52 H44" stroke="${INK}" stroke-width="1.4"/></svg>`,
  bucket: `<svg viewBox="0 0 80 80" class="bq-art"><path d="M18 34 L24 72 H56 L62 34Z" fill="#9fc3d6" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M18 34 Q40 6 62 34" fill="none" stroke="${INK}" stroke-width="2"/><path d="M21 48 H59" stroke="#6f9ab2" stroke-width="3"/>${bone(28, 30, -30)}${bone(42, 26, 10)}${bone(54, 31, 40)}${bone(36, 34, -5, 0.9)}</svg>`,
  crate: `<svg viewBox="0 0 80 80" class="bq-art"><path d="M10 40 H70 V72 H10Z" fill="#c8874a" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M10 50 H70 M10 61 H70" stroke="#a8693a" stroke-width="2"/><path d="M10 40 L22 30 H58 L70 40" fill="#e0a868" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>${bone(20, 30, -40)}${bone(33, 24, -10)}${bone(46, 22, 20)}${bone(58, 28, 50)}${bone(28, 34, 15, 0.9)}${bone(52, 34, -20, 0.9)}${bone(40, 14, 5, 0.9)}${bone(70, 46, 80, 0.8)}<path d="M66 18 l2 -5 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2Z" fill="#f2c14e" stroke="${INK}" stroke-width="1"/></svg>`,
  coinStack: `<svg viewBox="0 0 80 80" class="bq-art"><g stroke="${INK}" stroke-width="2.2">${[0, 1, 2, 3, 4]
    .map((i) => `<ellipse cx="40" cy="${62 - i * 8}" rx="22" ry="8" fill="#f5c542"/>`)
    .join('')}</g><text x="40" y="34" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="14" fill="${INK}">x2</text></svg>`,
  noAds: `<svg viewBox="0 0 40 40" class="bq-art"><rect x="6" y="10" width="28" height="20" rx="3" fill="#fbf6ec" stroke="${INK}" stroke-width="2.2"/><path d="M6 34 L34 6" stroke="#c25a6a" stroke-width="3.4" stroke-linecap="round"/></svg>`,
  pass: `<svg viewBox="0 0 40 40" class="bq-art"><path d="M8 6 H32 V34 L20 27 L8 34Z" fill="#a45fd6" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><circle cx="20" cy="16" r="5" fill="#fbf6ec" stroke="${INK}" stroke-width="1.6"/></svg>`,
};

/** Glass tip jar filled to `fill` (0..1) with fish bones. */
export function jarSvg(fill: number): string {
  const top = 30;
  const bottom = 92;
  const h = (bottom - top) * Math.max(0, Math.min(1, fill));
  const y = bottom - h;
  let bones = '';
  const rows = Math.floor(h / 9);
  for (let r = 0; r < rows; r++) for (let c = 0; c < 3; c++) bones += bone(26 + c * 15 + (r % 2) * 5, bottom - 6 - r * 9, ((r * 3 + c) % 5) * 30 - 60, 0.75);
  return `<svg viewBox="0 0 90 100" class="bq-jar-svg"><defs><clipPath id="bq-jar-clip"><path d="M20 30 Q14 34 14 44 V86 Q14 94 24 94 H66 Q76 94 76 86 V44 Q76 34 70 30Z"/></clipPath></defs>
    <g clip-path="url(#bq-jar-clip)"><rect x="10" y="${y}" width="70" height="${h + 4}" fill="#f3e6c9"/>${bones}</g>
    <path d="M20 30 Q14 34 14 44 V86 Q14 94 24 94 H66 Q76 94 76 86 V44 Q76 34 70 30Z" fill="rgba(200,230,240,0.25)" stroke="${INK}" stroke-width="2.4"/>
    <rect x="22" y="18" width="46" height="12" rx="3" fill="#d9a441" stroke="${INK}" stroke-width="2.2"/>
    <path d="M22 44 Q20 60 22 76" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7" fill="none"/>
    <rect x="30" y="52" width="30" height="16" rx="2" fill="#fbf6ec" stroke="${INK}" stroke-width="1.6"/><text x="45" y="64" text-anchor="middle" font-family="Fredoka" font-weight="700" font-size="9" fill="${INK}">TIPS</text></svg>`;
}
