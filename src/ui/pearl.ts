/** Pearl the Persian, hand-authored SVG (viewBox 200x140). Animated by CSS classes in boutique.css. */

/** A fluffy circle: alternating bumps around (cx, cy). */
function fluff(cx: number, cy: number, r: number, lobes: number, amp: number, sy = 1): string {
  let d = '';
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r * sy;
    if (i === 0) {
      d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
      continue;
    }
    const am = ((i - 0.5) / lobes) * Math.PI * 2;
    const qx = cx + Math.cos(am) * (r + amp);
    const qy = cy + Math.sin(am) * (r + amp) * sy;
    d += ` Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + 'Z';
}

function pearls(): string {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.18 + (i / 8) * 0.64);
    const x = 80 + Math.cos(a) * 26;
    const y = 74 + Math.sin(a) * 18;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.6" fill="#fbfaf6" stroke="#9c9aa6" stroke-width="1"/><circle cx="${(x - 1.1).toFixed(1)}" cy="${(y - 1.2).toFixed(1)}" r="1" fill="#fff"/>`;
  }
  return s;
}

const INK = '#2a201c';
const FUR = '#fbf8f3';
const SHADE = '#ece4dc';

export const PEARL_SVG = `
<svg class="pearl" viewBox="0 0 200 140" aria-label="Pearl the shopkeeper">
  <g class="pl-all">
    <g class="pl-tail"><path d="M42 104 C18 98 14 70 30 58 C40 52 46 60 40 66 C32 74 36 92 54 98" fill="${FUR}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/></g>
    <path d="${fluff(80, 100, 40, 16, 4, 0.72)}" fill="${FUR}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <g class="pl-head">
      <path d="M50 40 L56 14 L72 32Z" fill="${FUR}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M110 40 L104 14 L88 32Z" fill="${FUR}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M56 32 L58 20 L66 30Z M104 32 L102 20 L94 30Z" fill="#f2b5b8"/>
      <path d="${fluff(80, 52, 32, 18, 3.5)}" fill="${FUR}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <ellipse cx="80" cy="62" rx="20" ry="13" fill="${SHADE}" opacity="0.6"/>
      <g class="pl-eyes">
        <circle cx="68" cy="52" r="8.5" fill="#e3964a" stroke="${INK}" stroke-width="2"/>
        <circle cx="92" cy="52" r="8.5" fill="#e3964a" stroke="${INK}" stroke-width="2"/>
        <g class="pl-pupils"><ellipse cx="68" cy="52.5" rx="4" ry="5.6" fill="${INK}"/><ellipse cx="92" cy="52.5" rx="4" ry="5.6" fill="${INK}"/>
        <circle cx="66" cy="49.5" r="1.8" fill="#fff"/><circle cx="90" cy="49.5" r="1.8" fill="#fff"/></g>
        <g class="pl-lids"><ellipse cx="68" cy="52" rx="9.5" ry="9.5" fill="${FUR}" stroke="${INK}" stroke-width="2"/><ellipse cx="92" cy="52" rx="9.5" ry="9.5" fill="${FUR}" stroke="${INK}" stroke-width="2"/></g>
      </g>
      <path d="M77 61 L83 61 L80 64.5Z" fill="#e8909a" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M74 67 Q77 70 80 66.5 Q83 70 86 67" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="60" cy="63" r="4.5" fill="#f6c9c4" opacity="0.8"/><circle cx="100" cy="63" r="4.5" fill="#f6c9c4" opacity="0.8"/>
      <path d="M58 60 L44 57 M58 64 L44 65 M102 60 L116 57 M102 64 L116 65" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>
    </g>
    ${pearls()}
    <g class="pl-paw"><ellipse cx="104" cy="100" rx="9" ry="7" fill="${FUR}" stroke="${INK}" stroke-width="2.2"/><path d="M100 103 L100 99 M104 104 L104 99 M108 103 L108 99" stroke="${INK}" stroke-width="1" stroke-linecap="round"/></g>
  </g>
  <g class="pl-register">
    <path d="M138 104 L142 76 L186 76 L190 104Z" fill="#d9a441" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
    <rect x="148" y="64" width="32" height="14" rx="2" fill="#f3e6c9" stroke="${INK}" stroke-width="2"/>
    <text x="164" y="75" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="9" fill="${INK}" class="pl-till">0.00</text>
    <circle cx="152" cy="88" r="3" fill="#f3e6c9" stroke="${INK}" stroke-width="1.4"/><circle cx="163" cy="88" r="3" fill="#f3e6c9" stroke="${INK}" stroke-width="1.4"/><circle cx="174" cy="88" r="3" fill="#f3e6c9" stroke="${INK}" stroke-width="1.4"/>
    <circle cx="152" cy="97" r="3" fill="#f3e6c9" stroke="${INK}" stroke-width="1.4"/><circle cx="163" cy="97" r="3" fill="#f3e6c9" stroke="${INK}" stroke-width="1.4"/><circle cx="174" cy="97" r="3" fill="#e89a96" stroke="${INK}" stroke-width="1.4"/>
  </g>
  <path d="M0 104 H200 V140 H0Z" fill="#f6c9c4" stroke="${INK}" stroke-width="2.4"/>
  <path d="M0 110 H200" stroke="#d9a441" stroke-width="3"/>
  <path d="M20 122 Q40 118 60 122 T100 122 T140 122 T180 122" fill="none" stroke="#e89a96" stroke-width="2"/>
</svg>`;
