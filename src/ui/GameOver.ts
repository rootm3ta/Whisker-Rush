import { LOOT_ITEMS, RARITIES } from '../data/pickups';
import { UI_TEXT } from '../data/ui';
import { hex } from '../render/Sky';
import type { ReviveOption } from '../gameplay/Revive';
import './gameOver.css';

export interface GameOverData {
  caught: boolean;
  score: number;
  distance: number;
  best: number;
  newBest: boolean;
  coins: number;
  loot: number[];
  revives: number;
  revive: ReviveOption;
  fishBones: number;
}

export interface GameOverActions {
  revive(): void;
  share(): void;
  continue(): void;
}

const T = UI_TEXT.gameOver;
const BONE_SVG = `<svg viewBox="0 0 24 24" class="wr-ico"><path d="M3 12h15M6 8v8M9 7v10M12 8v8M15 9v6" stroke="#2a201c" stroke-width="2" stroke-linecap="round"/><path d="M18 12l4-3v6z" fill="#e6f2f7" stroke="#2a201c" stroke-width="1.8" stroke-linejoin="round"/></svg>`;

/** Sketchbook Game Over card: score card, loot chips, revive, share and continue. */
export class GameOver {
  private readonly root: HTMLDivElement;
  private readonly el: Record<string, HTMLElement> = {};
  private toastTimer = 0;
  private countRaf = 0;
  /** Called on each count-up tick (sound). */
  onTick: (() => void) | null = null;

  constructor(host: HTMLElement, private readonly actions: GameOverActions) {
    const root = document.createElement('div');
    root.className = 'wr-go';
    root.hidden = true;
    root.innerHTML = `
      <div class="wr-go-card">
        <h1 class="wr-go-title"></h1>
        <div class="wr-go-score"><span class="wr-go-label">${T.score}</span><span class="wr-go-score-v"></span><span class="wr-go-best-stamp">${T.newBest}</span></div>
        <dl class="wr-go-stats">
          <div><dt>${T.distance}</dt><dd class="wr-go-dist"></dd></div>
          <div><dt>${T.best}</dt><dd class="wr-go-best"></dd></div>
          <div><dt>${T.coins}</dt><dd class="wr-go-coins"></dd></div>
          <div><dt>${T.revives}</dt><dd class="wr-go-revives"></dd></div>
        </dl>
        <p class="wr-go-label">${T.loot}</p>
        <div class="wr-go-loot"></div>
        <button class="wr-btn wr-btn-main wr-go-revive"></button>
        <div class="wr-go-row">
          <button class="wr-btn wr-go-share">${T.share}</button>
          <button class="wr-btn wr-go-continue">${T.continue}</button>
        </div>
        <p class="wr-go-toast"></p>
      </div>`;
    host.appendChild(root);
    this.root = root;
    root.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
    for (const ev of ['pointerdown', 'pointerup'] as const) root.addEventListener(ev, (e) => e.stopPropagation());
    for (const k of ['title', 'score-v', 'best-stamp', 'dist', 'best', 'coins', 'revives', 'loot', 'revive', 'share', 'continue', 'toast']) {
      this.el[k] = root.querySelector(`.wr-go-${k}`)!;
    }
    this.el.revive.addEventListener('click', () => actions.revive());
    this.el.share.addEventListener('click', () => actions.share());
    this.el.continue.addEventListener('click', () => actions.continue());
    window.addEventListener('keydown', this.key);
  }

  get visible(): boolean {
    return !this.root.hidden;
  }

  show(d: GameOverData): void {
    const e = this.el;
    e.title.textContent = d.caught ? T.caught : T.crash;
    this.countUp(e['score-v'], Math.floor(d.score));
    e['best-stamp'].hidden = !d.newBest;
    e.dist.textContent = `${Math.floor(d.distance)} m`;
    e.best.textContent = String(Math.floor(d.best));
    e.coins.textContent = String(d.coins);
    e.revives.textContent = String(d.revives);
    e.loot.innerHTML = '';
    if (d.loot.length === 0) {
      e.loot.textContent = T.noLoot;
    } else {
      const counts = new Map<number, number>();
      for (const i of d.loot) counts.set(i, (counts.get(i) ?? 0) + 1);
      for (const [i, n] of counts) {
        const item = LOOT_ITEMS[i];
        const chip = document.createElement('span');
        chip.className = 'wr-chip';
        chip.style.borderColor = hex(RARITIES[item.rarity].color);
        chip.textContent = n > 1 ? `${item.name} x${n}` : item.name;
        e.loot.appendChild(chip);
      }
    }
    const btn = e.revive as HTMLButtonElement;
    if (d.revive.kind === 'ad') {
      btn.textContent = T.reviveAd;
      btn.disabled = false;
    } else {
      btn.innerHTML = `${T.reviveBones} ${d.revive.cost} ${BONE_SVG} <small>(${d.fishBones})</small>`;
      btn.disabled = d.fishBones < d.revive.cost;
    }
    e.toast.textContent = '';
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
    cancelAnimationFrame(this.countRaf);
  }

  /** Numbers count up with ticks instead of appearing. */
  private countUp(el: HTMLElement, target: number): void {
    cancelAnimationFrame(this.countRaf);
    const t0 = performance.now();
    const dur = Math.min(1400, 400 + target / 4);
    let lastTick = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(target * e));
      if (now - lastTick > 70 && k < 1) {
        lastTick = now;
        this.onTick?.();
      }
      if (k < 1) this.countRaf = requestAnimationFrame(step);
    };
    this.countRaf = requestAnimationFrame(step);
  }

  toast(text: string): void {
    const t = this.el.toast;
    t.textContent = text;
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (t.textContent = ''), 1800);
  }

  private readonly key = (ev: KeyboardEvent): void => {
    if (!this.visible) return;
    if (ev.code === 'Enter') this.actions.continue();
    else if (ev.code === 'KeyR' && !(this.el.revive as HTMLButtonElement).disabled) this.actions.revive();
  };
}
