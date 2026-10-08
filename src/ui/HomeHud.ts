import { HOME, type HomeAction } from '../data/home';
import { ICON } from './Sheet';
import './homeHud.css';

export interface HomeHudActions {
  run(): void;
  settings(): void;
  pass(): void;
  shop(): void;
}

/** Home overlay: currencies, settings gear, Paw Pass ribbon, big RUN paw, object labels and Miso's bubble. */
export class HomeHud {
  private readonly root: HTMLDivElement;
  private readonly coins: HTMLElement;
  private readonly bones: HTMLElement;
  private readonly mult: HTMLElement;
  private readonly best: HTMLElement;
  private readonly ribbon: HTMLElement;
  private readonly bubble: HTMLElement;
  private readonly labels = new Map<HomeAction, HTMLElement>();
  private bubbleT = 0;
  private readonly labelShown = new Map<HomeAction, number>();

  constructor(host: HTMLElement, actions: HomeHudActions) {
    const root = document.createElement('div');
    root.className = 'wr-home';
    root.hidden = true;
    const labels = (Object.keys(HOME.labels) as HomeAction[]).map((a) => `<span class="wr-label" data-a="${a}">${HOME.labels[a]}<i></i></span>`).join('');
    root.innerHTML = `
      <div class="wr-topbar">
        <span class="wr-pill">${ICON.coin}<b class="wr-c">0</b></span>
        <span class="wr-pill">${ICON.bone}<b class="wr-b">0</b></span>
        <span class="wr-pill wr-mult">x1</span>
        <button class="wr-shop" aria-label="Shop">Shop</button>
        <button class="wr-gear" aria-label="Settings">${ICON.gear}</button>
      </div>
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
    root.querySelectorAll<HTMLElement>('.wr-label').forEach((el) => this.labels.set(el.dataset.a as HomeAction, el));
    const stop = (e: Event) => e.stopPropagation();
    root.querySelector('.wr-shop')!.addEventListener('click', (e) => {
      e.stopPropagation();
      actions.shop();
    });
    for (const sel of ['.wr-runpaw', '.wr-gear', '.wr-ribbon', '.wr-shop']) {
      const el = root.querySelector(sel)!;
      el.addEventListener('pointerdown', stop);
      el.addEventListener('pointerup', stop);
    }
    root.querySelector('.wr-runpaw')!.addEventListener('click', (e) => {
      e.stopPropagation();
      actions.run();
    });
    root.querySelector('.wr-gear')!.addEventListener('click', (e) => {
      e.stopPropagation();
      actions.settings();
    });
    this.ribbon.addEventListener('click', (e) => {
      e.stopPropagation();
      actions.pass();
    });
  }

  set visible(v: boolean) {
    this.root.hidden = !v;
  }

  setStats(coins: number, bones: number, multiplier: number, best: number, passTier: number): void {
    this.coins.textContent = String(coins);
    this.bones.textContent = String(bones);
    this.mult.textContent = `x${multiplier}`;
    this.best.textContent = best > 0 ? `Best ${best}` : '';
    this.ribbon.querySelector('b')!.textContent = String(passTier);
  }

  /** While a sheet is open the title, RUN paw and labels step aside. */
  setCovered(on: boolean): void {
    this.root.classList.toggle('wr-covered', on);
  }

  /** Red dot on a label (something to claim). */
  setDot(action: HomeAction | 'pass', on: boolean): void {
    if (action === 'pass') this.ribbon.classList.toggle('wr-dot', on);
    else this.labels.get(action)?.classList.toggle('wr-dot', on);
  }

  /** Calls attention to one object (e.g. "Free hat!" on the Wardrobe). */
  setHighlight(action: HomeAction | null, text = ''): void {
    for (const [a, el] of this.labels) {
      el.classList.toggle('wr-hl', a === action);
      el.firstChild!.textContent = a === action && text ? text : HOME.labels[a];
    }
  }

  placeLabel(action: HomeAction, x: number, y: number, visible: boolean): void {
    const key = (Math.round(x) * 4096 + Math.round(y)) * 2 + (visible ? 1 : 0);
    if (this.labelShown.get(action) === key) return;
    this.labelShown.set(action, key);
    const el = this.labels.get(action)!;
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) rotate(${action.length % 2 ? -3 : 3}deg)`;
    el.style.opacity = visible ? '1' : '0';
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
  }
}
