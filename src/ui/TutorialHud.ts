import type { Tutorial } from '../gameplay/Tutorial';
import { ICON, esc } from './Sheet';
import './tutorialHud.css';

/** Ghost-paw hints and the step instruction during the tutorial run. */
export class TutorialHud {
  private readonly root: HTMLDivElement;
  private readonly paw: HTMLElement;
  private readonly text: HTMLElement;
  private shownHint = '';
  private shownText = '';

  constructor(host: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'wr-tut';
    root.hidden = true;
    root.innerHTML = `<p class="wr-tut-text"></p><div class="wr-ghost">${ICON.paw}</div>`;
    host.appendChild(root);
    this.root = root;
    this.paw = root.querySelector('.wr-ghost')!;
    this.text = root.querySelector('.wr-tut-text')!;
  }

  set visible(v: boolean) {
    this.root.hidden = !v;
  }

  update(t: Tutorial): void {
    const hint = t.frozen ? t.hint : 'none';
    if (hint !== this.shownHint) {
      this.shownHint = hint;
      this.paw.className = `wr-ghost wr-ghost-${hint}`;
    }
    if (t.text !== this.shownText) {
      this.shownText = t.text;
      this.text.innerHTML = esc(t.text);
      this.text.classList.toggle('on', t.text !== '');
    }
    this.root.classList.toggle('wr-tut-frozen', t.frozen);
  }
}
