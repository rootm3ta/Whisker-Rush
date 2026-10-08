import { COMBO } from '../data/scoring';
import { HUD as H } from '../data/ui';
import type { Score } from '../gameplay/Score';
import type { Satchel } from '../meta/Satchel';
import './hud.css';

const COIN_SVG = `<svg viewBox="0 0 24 24" class="wr-ico"><circle cx="12" cy="12" r="9.2" fill="#f5c542" stroke="#2a201c" stroke-width="2"/><path d="M8.6 14.6c.8 1.3 2.1 1.9 3.5 1.9 1.7 0 2.9-.9 2.9-2.2 0-2.9-6-1.6-6-4.6 0-1.2 1.2-2.2 2.9-2.2 1.2 0 2.3.5 3 1.4M12 5.8v1.6M12 16.5v1.7" fill="none" stroke="#2a201c" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const BAG_SVG = `<svg viewBox="0 0 24 24" class="wr-ico"><path d="M5.2 9.1c-.4 4.3-.2 8.6.6 11.2 3.9 1 8.4 1 12.4 0 .8-2.7 1-6.9.6-11.2-4.6-.9-9-.9-13.6 0z" fill="#c8915a" stroke="#2a201c" stroke-width="2" stroke-linejoin="round"/><path d="M8.6 9c.1-3 1.4-5 3.4-5s3.3 2 3.4 5" fill="none" stroke="#2a201c" stroke-width="2" stroke-linecap="round"/><path d="M8 13.2c2.6.7 5.4.7 8 0" fill="none" stroke="#2a201c" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const PAW_SVG = `<svg viewBox="0 0 24 24" class="wr-paw"><ellipse cx="12" cy="15.5" rx="5" ry="4.2"/><circle cx="6" cy="10" r="2.2"/><circle cx="9.6" cy="6.4" r="2.2"/><circle cx="14.4" cy="6.4" r="2.2"/><circle cx="18" cy="10" r="2.2"/></svg>`;

/** In-run HUD: score, coins, combo paw meter, satchel count and stamp callouts. DOM writes only on change. */
export class Hud {
  private readonly root: HTMLDivElement;
  private readonly scoreEl: HTMLElement;
  private readonly coinsEl: HTMLElement;
  private readonly satchelEl: HTMLElement;
  private readonly comboEl: HTMLElement;
  private readonly comboFill: HTMLElement;
  private readonly comboWrap: HTMLElement;
  private readonly stampEl: HTMLElement;
  private shown = { score: -1, coins: -1, satchel: -1, cap: -1, combo: -1 };
  private stampTimer = 0;
  private tauntTimer = 0;
  private readonly rushEl: HTMLElement;
  private readonly tauntEl: HTMLElement;

  constructor(host: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'wr-hud-root';
    root.hidden = true;
    root.innerHTML = `
      <div class="wr-tag wr-score"><span class="wr-score-v">0</span></div>
      <div class="wr-tag wr-coins">${COIN_SVG}<span class="wr-coins-v">0</span></div>
      <div class="wr-tag wr-satchel">${BAG_SVG}<span class="wr-satchel-v">0/12</span></div>
      <div class="wr-combo">${PAW_SVG}<div class="wr-combo-bar"><div class="wr-combo-fill"></div></div><span class="wr-combo-v">x1.0</span></div>
      <div class="wr-stamp"></div>
      <div class="wr-rush"></div>
      <div class="wr-taunt"></div>`;
    host.appendChild(root);
    this.root = root;
    this.scoreEl = root.querySelector('.wr-score-v')!;
    this.coinsEl = root.querySelector('.wr-coins-v')!;
    this.satchelEl = root.querySelector('.wr-satchel-v')!;
    this.comboEl = root.querySelector('.wr-combo-v')!;
    this.comboFill = root.querySelector('.wr-combo-fill')!;
    this.comboWrap = root.querySelector('.wr-combo')!;
    this.stampEl = root.querySelector('.wr-stamp')!;
    this.rushEl = root.querySelector('.wr-rush')!;
    this.tauntEl = root.querySelector('.wr-taunt')!;
  }

  /** Red edge glow during Pack Rush. */
  setRush(on: boolean): void {
    this.rushEl.classList.toggle('wr-rush-on', on);
  }

  taunt(text: string): void {
    this.tauntEl.textContent = text;
    this.tauntEl.classList.add('wr-taunt-on');
    this.tauntTimer = H.tauntMs;
  }

  set visible(v: boolean) {
    this.root.hidden = !v;
  }

  update(score: Score, satchel: Satchel, dtMs: number): void {
    const sh = this.shown;
    const pts = Math.floor(score.points);
    if (pts !== sh.score) {
      sh.score = pts;
      this.scoreEl.textContent = String(pts);
    }
    if (score.coins !== sh.coins) {
      sh.coins = score.coins;
      this.coinsEl.textContent = String(score.coins);
    }
    if (satchel.count !== sh.satchel || satchel.capacity !== sh.cap) {
      sh.satchel = satchel.count;
      sh.cap = satchel.capacity;
      this.satchelEl.textContent = `${satchel.count}/${satchel.capacity}`;
      this.satchelEl.parentElement!.classList.toggle('wr-full', satchel.full);
    }
    const combo10 = Math.round(score.combo * 10);
    if (combo10 !== sh.combo) {
      sh.combo = combo10;
      this.comboEl.textContent = `x${(combo10 / 10).toFixed(1)}`;
      this.comboFill.style.transform = `scaleX(${score.comboFill})`;
      this.comboWrap.classList.toggle('wr-max', score.combo >= COMBO.max - 1e-3);
    }
    if (this.tauntTimer > 0) {
      this.tauntTimer -= dtMs;
      if (this.tauntTimer <= 0) this.tauntEl.classList.remove('wr-taunt-on');
    }
    if (this.stampTimer > 0) {
      this.stampTimer -= dtMs;
      if (this.stampTimer <= 0) this.stampEl.classList.remove('wr-stamp-on');
    }
  }

  stamp(text: string, color: string): void {
    const el = this.stampEl;
    el.textContent = text;
    el.style.color = color;
    el.style.borderColor = color;
    el.classList.remove('wr-stamp-on');
    void el.offsetWidth;
    el.classList.add('wr-stamp-on');
    this.stampTimer = H.stampMs;
  }

  reset(): void {
    this.shown = { score: -1, coins: -1, satchel: -1, cap: -1, combo: -1 };
    this.stampTimer = 0;
    this.tauntTimer = 0;
    this.stampEl.classList.remove('wr-stamp-on');
    this.tauntEl.classList.remove('wr-taunt-on');
    this.setRush(false);
  }
}
