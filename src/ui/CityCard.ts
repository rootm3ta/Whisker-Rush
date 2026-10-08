import { CITIES, type CityId } from '../data/cities';
import { esc, overlays } from './Sheet';
import './cityCard.css';

/**
 * Travel loading card (a city illustration with its name and mood, shown briefly when you fly to a
 * city) and the postcard comic panel unlocked by five postcard fragments.
 */
export class CityCard {
  private readonly el: HTMLDivElement;
  private timer = 0;

  constructor(host: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'wr-citycard';
    this.el.hidden = true;
    for (const ev of ['pointerdown', 'pointerup', 'click'] as const) this.el.addEventListener(ev, (e) => e.stopPropagation());
    this.el.addEventListener('click', () => this.hide());
    host.appendChild(this.el);
  }

  /** Shows the city's travel card for a moment (tap to dismiss early). */
  travel(id: CityId): void {
    const c = CITIES[id];
    if (!c.card) return;
    this.el.innerHTML = `<div class="wr-cc-card"><div class="wr-cc-art">${c.card}</div><div class="wr-cc-stamp">Now arriving</div><h2>${esc(c.name)}</h2><p>${esc(c.map.mood)}</p></div>`;
    this.open(2200);
  }

  /** The postcard comic panel for a city (five fragments found). */
  postcard(id: CityId): void {
    const pc = CITIES[id].postcard;
    if (!pc) return;
    this.el.innerHTML = `<div class="wr-cc-card wr-cc-postcard"><div class="wr-cc-stamp">Postcard complete</div><div class="wr-cc-art">${pc.svg}</div><h2>${esc(pc.title)}</h2><p>${esc(pc.caption)}</p><button class="wr-btn wr-btn-main">Keep it</button></div>`;
    this.open(0);
  }

  private open(ms: number): void {
    window.clearTimeout(this.timer);
    if (this.el.hidden) overlays.open++;
    this.el.hidden = false;
    if (ms) this.timer = window.setTimeout(() => this.hide(), ms);
  }

  hide(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    overlays.open--;
  }
}
