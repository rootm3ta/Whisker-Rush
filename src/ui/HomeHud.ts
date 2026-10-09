import { HOME, type HomeAction } from '../data/home';
import { ICON } from './Sheet';
import { layoutLabels, type LabelSlot, type Rect } from './labelLayout';
import './homeHud.css';

export interface HomeHudActions {
  run(): void;
  settings(): void;
  pass(): void;
  shop(): void;
  /** A hotspot label was tapped (same as tapping its object). */
  open(a: HomeAction): void;
}

const ORDER = HOME.hotspotOrder;

/**
 * Home overlay: currencies, settings gear, Paw Pass ribbon, title with the Best ribbon, big RUN paw,
 * and one tappable washi-tape label per hotspot with a hand-drawn leader line to its object.
 * Labels are laid out each frame without overlapping each other or the fixed UI.
 */
export class HomeHud {
  private readonly root: HTMLDivElement;
  private readonly coins: HTMLElement;
  private readonly bones: HTMLElement;
  private readonly mult: HTMLElement;
  private readonly best: HTMLElement;
  private readonly ribbon: HTMLElement;
  private readonly bubble: HTMLElement;
  private readonly tip: HTMLElement;
  private readonly labels = new Map<HomeAction, HTMLElement>();
  private readonly lines = new Map<HomeAction, SVGPathElement>();
  private readonly slots: LabelSlot[] = [];
  private readonly reserved: Rect[] = [];
  private readonly fixed: HTMLElement[];
  private readonly shown = new Float64Array(ORDER.length * 4);
  private bubbleT = 0;
  private tipT = 0;
  private measured = false;

  constructor(host: HTMLElement, actions: HomeHudActions) {
    const root = document.createElement('div');
    root.className = 'wr-home';
    root.hidden = true;
    const labels = ORDER.map((a) => `<button class="wr-label" data-a="${a}"><span>${HOME.labels[a]}</span></button>`).join('');
    root.innerHTML = `
      <svg class="wr-leaders" aria-hidden="true">${ORDER.map((a) => `<path data-a="${a}"/>`).join('')}</svg>
      <div class="wr-topbar">
        <span class="wr-pill">${ICON.coin}<b class="wr-c">0</b></span>
        <span class="wr-pill">${ICON.bone}<b class="wr-b">0</b></span>
        <button class="wr-pill wr-mult" aria-label="Score multiplier">x1</button>
        <button class="wr-shop" aria-label="Shop">${ICON.purse}<span>Shop</span></button>
        <button class="wr-gear" aria-label="Settings">${ICON.gear}</button>
      </div>
      <div class="wr-tip" role="status">${HOME.multTip}</div>
      <button class="wr-ribbon">Paw Pass <b>0</b></button>
      <p class="wr-title">Whisker Rush</p>
      <p class="wr-best"></p>
      <div class="wr-labels">${labels}</div>
      <div class="wr-miso-bubble"></div>
      <button class="wr-runpaw" aria-label="Run">${ICON.paw}<span>RUN</span></button>`;
    host.appendChild(root);
    this.root = root;
    this.coins = root.querySelector('.wr-c')!;
    this.bones = root.querySelector('.wr-b')!;
    this.mult = root.querySelector('.wr-mult')!;
    this.best = root.querySelector('.wr-best')!;
    this.ribbon = root.querySelector('.wr-ribbon')!;
    this.bubble = root.querySelector('.wr-miso-bubble')!;
    this.tip = root.querySelector('.wr-tip')!;
    root.querySelectorAll<HTMLElement>('.wr-label').forEach((el) => this.labels.set(el.dataset.a as HomeAction, el));
    root.querySelectorAll<SVGPathElement>('.wr-leaders path').forEach((el) => this.lines.set(el.dataset.a as HomeAction, el));
    for (let i = 0; i < ORDER.length; i++) this.slots.push({ ax: 0, ay: 0, w: 0, h: 0, lead: HOME.hotspot.lead, visible: false, x: 0, y: 0, cand: -1 });
    this.fixed = ['.wr-topbar', '.wr-ribbon', '.wr-title', '.wr-best', '.wr-runpaw'].map((s) => root.querySelector<HTMLElement>(s)!);
    // One extra rect for the living window, updated every frame.
    for (let i = 0; i <= this.fixed.length; i++) this.reserved.push({ x: 0, y: 0, w: 0, h: 0 });

    const on = (sel: string, fn: (e: Event) => void) => {
      const el = root.querySelector(sel)!;
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('pointerup', (e) => e.stopPropagation());
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        fn(e);
      });
    };
    on('.wr-shop', () => actions.shop());
    on('.wr-runpaw', () => actions.run());
    on('.wr-gear', () => actions.settings());
    on('.wr-ribbon', () => actions.pass());
    on('.wr-mult', () => {
      this.tip.classList.add('on');
      this.tipT = 3;
    });
    on('.wr-labels', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('.wr-label');
      if (b) actions.open(b.dataset.a as HomeAction);
    });
    window.addEventListener('resize', () => (this.measured = false));
    void document.fonts?.ready.then(() => (this.measured = false));
  }

  set visible(v: boolean) {
    this.root.hidden = !v;
    if (v) this.measured = false;
  }

  setStats(coins: number, bones: number, multiplier: number, best: number, passTier: number): void {
    this.coins.textContent = String(coins);
    this.bones.textContent = String(bones);
    this.mult.textContent = `x${multiplier}`;
    this.best.textContent = best > 0 ? `Best ${best}` : '';
    this.best.hidden = best <= 0;
    this.ribbon.querySelector('b')!.textContent = String(passTier);
    this.measured = false;
  }

  /** While a sheet is open the title, RUN paw and labels step aside. */
  setCovered(on: boolean): void {
    if (this.root.classList.contains('wr-covered') !== on) this.root.classList.toggle('wr-covered', on);
  }

  /** Red dot on a label corner (something to claim). */
  setDot(action: HomeAction | 'pass', on: boolean): void {
    if (action === 'pass') this.ribbon.classList.toggle('wr-dot', on);
    else this.labels.get(action)?.classList.toggle('wr-dot', on);
  }

  /** True if this hotspot has a dot or highlight (drives its brighter glow). */
  hasNews(action: HomeAction): boolean {
    const el = this.labels.get(action);
    return !!el && (el.classList.contains('wr-dot') || el.classList.contains('wr-hl'));
  }

  /** Calls attention to one object (e.g. "Free hat!" on the Wardrobe). */
  setHighlight(action: HomeAction | null, text = ''): void {
    for (const [a, el] of this.labels) {
      el.classList.toggle('wr-hl', a === action);
      el.firstElementChild!.textContent = a === action && text ? text : HOME.labels[a];
    }
    this.measured = false;
  }

  /** Records where a hotspot's object is on screen this frame (px). Call flushLabels() after all. */
  placeLabel(action: HomeAction, x: number, y: number, visible: boolean): void {
    const s = this.slots[ORDER.indexOf(action)];
    s.ax = x;
    s.ay = y;
    s.visible = visible;
  }

  private measure(): void {
    this.measured = true;
    for (let i = 0; i < ORDER.length; i++) {
      const el = this.labels.get(ORDER[i])!;
      this.slots[i].w = el.offsetWidth;
      this.slots[i].h = el.offsetHeight;
      this.slots[i].cand = -1;
    }
    for (let i = 0; i < this.fixed.length; i++) {
      const el = this.fixed[i];
      const r = el.getBoundingClientRect();
      const o = this.reserved[i];
      // Hidden or empty elements reserve nothing.
      const empty = el.hidden || r.width === 0;
      o.x = r.left;
      o.y = r.top;
      o.w = empty ? 0 : r.width;
      o.h = empty ? 0 : r.height;
    }
  }

  /** Keeps labels off the living window (screen px). */
  setWindowRect(x: number, y: number, w: number, h: number): void {
    const r = this.reserved[this.fixed.length];
    r.x = x;
    r.y = y;
    r.w = w;
    r.h = h;
  }

  /** Solves label positions and writes them (only when they moved by a pixel or more). */
  flushLabels(vw: number, vh: number): void {
    if (this.root.hidden) return;
    if (!this.measured) this.measure();
    layoutLabels(this.slots, this.reserved, vw, vh, 4);
    for (let i = 0; i < ORDER.length; i++) {
      const s = this.slots[i];
      const x = Math.round(s.x);
      const y = Math.round(s.y);
      const k = i * 4;
      const vis = s.visible ? 1 : 0;
      if (this.shown[k] === x && this.shown[k + 1] === y && this.shown[k + 2] === vis && this.shown[k + 3] === Math.round(s.ax + s.ay * 4096)) continue;
      this.shown[k] = x;
      this.shown[k + 1] = y;
      this.shown[k + 2] = vis;
      this.shown[k + 3] = Math.round(s.ax + s.ay * 4096);
      const a = ORDER[i];
      const el = this.labels.get(a)!;
      el.style.transform = `translate(${x}px, ${y}px) rotate(${i % 2 ? -2.5 : 2.5}deg)`;
      el.style.opacity = vis ? '1' : '0';
      el.style.pointerEvents = vis ? 'auto' : 'none';
      // Leader: a slightly bowed ink line from the label's bottom centre to the object.
      const lx = x + s.w / 2;
      const ly = y + s.h;
      const mx = (lx + s.ax) / 2 + (i % 2 ? 6 : -6);
      const my = (ly + s.ay) / 2;
      const line = this.lines.get(a)!;
      line.setAttribute('d', vis ? `M${lx} ${ly} Q${mx} ${my} ${Math.round(s.ax)} ${Math.round(s.ay)}` : '');
    }
  }

  /** Screen rect of a label (for the tour spotlight), or null if hidden. */
  labelRect(action: HomeAction): Rect | null {
    const s = this.slots[ORDER.indexOf(action)];
    return s.visible ? s : null;
  }

  say(text: string, x: number, y: number): void {
    this.bubble.textContent = text;
    this.bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    this.bubble.classList.add('on');
    this.bubbleT = 1.4;
  }

  update(dt: number): void {
    if (this.bubbleT > 0) {
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) this.bubble.classList.remove('on');
    }
    if (this.tipT > 0) {
      this.tipT -= dt;
      if (this.tipT <= 0) this.tip.classList.remove('on');
    }
  }
}
