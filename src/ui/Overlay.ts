import { UI_TEXT } from '../data/ui';
import './overlay.css';

/** Center card for Home, Pause and the M2 crash summary. */
export class Overlay {
  private readonly card: HTMLDivElement;
  private readonly title: HTMLHeadingElement;
  private readonly body: HTMLParagraphElement;
  private readonly hint: HTMLParagraphElement;
  private readonly keys: HTMLParagraphElement;

  constructor(host: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'wr-overlay';
    root.innerHTML = `
      <div class="wr-card">
        <h1></h1>
        <p class="wr-body"></p>
        <p class="wr-hint"></p>
        <p class="wr-keys">${UI_TEXT.keysHint}</p>
      </div>`;
    host.appendChild(root);
    this.card = root.querySelector('.wr-card')!;
    this.title = root.querySelector('h1')!;
    this.body = root.querySelector('.wr-body')!;
    this.hint = root.querySelector('.wr-hint')!;
    this.keys = root.querySelector('.wr-keys')!;
  }

  showHome(): void {
    this.setCard(UI_TEXT.title, '', UI_TEXT.homeHint, true);
  }

  showPaused(): void {
    this.setCard(UI_TEXT.pausedTitle, '', UI_TEXT.pausedHint, true);
  }

  hide(): void {
    this.card.hidden = true;
  }

  private setCard(title: string, body: string, hint: string, keys: boolean): void {
    this.title.textContent = title;
    this.body.textContent = body;
    this.body.hidden = body === '';
    this.hint.textContent = hint;
    this.keys.hidden = !keys;
    this.card.hidden = false;
  }
}
