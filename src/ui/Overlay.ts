import { UI_TEXT } from '../data/ui';
import './overlay.css';

/** Minimal sketchbook overlay for M1: title card, pause card and distance counter. */
export class Overlay {
  private readonly card: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly hint: HTMLParagraphElement;
  private readonly hud: HTMLDivElement;
  private shownMeters = -1;

  constructor(host: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'wr-overlay';
    root.innerHTML = `
      <div class="wr-hud" hidden></div>
      <div class="wr-card">
        <h1></h1>
        <p class="wr-hint"></p>
        <p class="wr-keys">${UI_TEXT.keysHint}</p>
      </div>`;
    host.appendChild(root);
    this.card = root.querySelector('.wr-card')!;
    this.title = root.querySelector('h1')!;
    this.hint = root.querySelector('.wr-hint')!;
    this.hud = root.querySelector('.wr-hud')!;
  }

  showHome(): void {
    this.setCard(UI_TEXT.title, UI_TEXT.homeHint);
    this.hud.hidden = true;
  }

  showPaused(): void {
    this.setCard(UI_TEXT.pausedTitle, UI_TEXT.pausedHint);
  }

  showRun(): void {
    this.card.hidden = true;
    this.hud.hidden = false;
  }

  setDistance(m: number): void {
    const v = Math.floor(m);
    if (v === this.shownMeters) return;
    this.shownMeters = v;
    this.hud.textContent = `${v} m`;
  }

  private setCard(title: string, hint: string): void {
    this.title.textContent = title;
    this.hint.textContent = hint;
    this.card.hidden = false;
  }
}
