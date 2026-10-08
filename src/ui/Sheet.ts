import './meta.css';

export const ICON = {
  coin: `<svg viewBox="0 0 24 24" class="wr-ico"><circle cx="12" cy="12" r="9.2" fill="#f5c542" stroke="#2a201c" stroke-width="2"/><path d="M8.6 14.6c.8 1.3 2.1 1.9 3.5 1.9 1.7 0 2.9-.9 2.9-2.2 0-2.9-6-1.6-6-4.6 0-1.2 1.2-2.2 2.9-2.2 1.2 0 2.3.5 3 1.4M12 5.8v1.6M12 16.5v1.7" fill="none" stroke="#2a201c" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  bone: `<svg viewBox="0 0 24 24" class="wr-ico"><path d="M3 12h15M6 8v8M9 7v10M12 8v8M15 9v6" stroke="#2a201c" stroke-width="2" stroke-linecap="round"/><path d="M18 12l4-3v6z" fill="#e6f2f7" stroke="#2a201c" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" class="wr-ico"><circle cx="12" cy="12" r="3.4" fill="none" stroke="#2a201c" stroke-width="2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" stroke="#2a201c" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  close: `<svg viewBox="0 0 24 24" class="wr-ico"><path d="M6 6.5l11.5 11M17.5 6L6.2 17.8" stroke="#2a201c" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  paw: `<svg viewBox="0 0 24 24" class="wr-paw-ico"><ellipse cx="12" cy="15.5" rx="5" ry="4.2"/><circle cx="6" cy="10" r="2.2"/><circle cx="9.6" cy="6.4" r="2.2"/><circle cx="14.4" cy="6.4" r="2.2"/><circle cx="18" cy="10" r="2.2"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" class="wr-ico"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="#d8ccb6" stroke="#2a201c" stroke-width="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="#2a201c" stroke-width="2"/></svg>`,
} as const;

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Sketchbook bottom sheet used by every meta screen. Clicks inside never reach the game canvas. */
export class Sheet {
  readonly el: HTMLDivElement;
  readonly body: HTMLDivElement;
  private readonly titleEl: HTMLElement;
  onClose: (() => void) | null = null;

  constructor(host: HTMLElement, title: string, cls = '') {
    const el = document.createElement('div');
    el.className = `wr-sheet ${cls}`;
    el.hidden = true;
    el.innerHTML = `<div class="wr-sheet-card"><header><h2></h2><button class="wr-x" aria-label="Close">${ICON.close}</button></header><div class="wr-sheet-body"></div></div>`;
    host.appendChild(el);
    this.el = el;
    this.body = el.querySelector('.wr-sheet-body')!;
    this.titleEl = el.querySelector('h2')!;
    this.titleEl.textContent = title;
    el.querySelector('.wr-x')!.addEventListener('click', () => this.close());
    for (const ev of ['pointerdown', 'pointerup', 'click'] as const) el.addEventListener(ev, (e) => e.stopPropagation());
    // Let sheets scroll: the game host cancels touchmove for swipes.
    el.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
  }

  get isOpen(): boolean {
    return !this.el.hidden;
  }

  setTitle(t: string): void {
    this.titleEl.textContent = t;
  }

  open(): void {
    this.el.hidden = false;
  }

  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.onClose?.();
  }
}

/** Small reward / info popup over everything. */
export function popup(host: HTMLElement, title: string, lines: readonly string[]): void {
  const el = document.createElement('div');
  el.className = 'wr-popup';
  el.innerHTML = `<div class="wr-popup-card"><h3>${esc(title)}</h3>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<button class="wr-btn wr-btn-main">Nice!</button></div>`;
  for (const ev of ['pointerdown', 'pointerup', 'click'] as const) el.addEventListener(ev, (e) => e.stopPropagation());
  el.querySelector('button')!.addEventListener('click', () => el.remove());
  host.appendChild(el);
}

/** Press squash on every button is CSS; this adds the price chip markup. */
export function price(coins?: number, fishBones?: number): string {
  if (fishBones) return `<span class="wr-price">${fishBones} ${ICON.bone}</span>`;
  return `<span class="wr-price">${coins ?? 0} ${ICON.coin}</span>`;
}
