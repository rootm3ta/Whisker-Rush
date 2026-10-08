import './meta.css';

export const ICON = {
  coin: `<svg viewBox="0 0 24 24" class="wr-ico"><circle cx="12" cy="12" r="9.2" fill="#f5c542" stroke="#2a201c" stroke-width="2"/><path d="M8.6 14.6c.8 1.3 2.1 1.9 3.5 1.9 1.7 0 2.9-.9 2.9-2.2 0-2.9-6-1.6-6-4.6 0-1.2 1.2-2.2 2.9-2.2 1.2 0 2.3.5 3 1.4M12 5.8v1.6M12 16.5v1.7" fill="none" stroke="#2a201c" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  bone: `<svg viewBox="0 0 24 24" class="wr-ico"><path d="M3 12h15M6 8v8M9 7v10M12 8v8M15 9v6" stroke="#2a201c" stroke-width="2" stroke-linecap="round"/><path d="M18 12l4-3v6z" fill="#e6f2f7" stroke="#2a201c" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" class="wr-ico"><path d="M18.80 10.34 L21.49 10.57 L21.49 13.43 L18.80 13.66 L17.98 15.63 L19.73 17.70 L17.70 19.73 L15.63 17.98 L13.66 18.80 L13.43 21.49 L10.57 21.49 L10.34 18.80 L8.37 17.98 L6.30 19.73 L4.27 17.70 L6.02 15.63 L5.20 13.66 L2.51 13.43 L2.51 10.57 L5.20 10.34 L6.02 8.37 L4.27 6.30 L6.30 4.27 L8.37 6.02 L10.34 5.20 L10.57 2.51 L13.43 2.51 L13.66 5.20 L15.63 6.02 L17.70 4.27 L19.73 6.30 L17.98 8.37Z" fill="#fbf6ec" stroke="#2a201c" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.2" fill="#fbf6ec" stroke="#2a201c" stroke-width="1.8"/></svg>`,
  purse: `<svg viewBox="0 0 24 24" class="wr-ico"><path d="M5 9.5h14l-1.2 9.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" fill="#f2c14e" stroke="#2a201c" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.5 9.5a3.5 3.5 0 0 1 7 0" fill="none" stroke="#2a201c" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="14.5" r="1.6" fill="#2a201c"/></svg>`,
  close: `<svg viewBox="0 0 24 24" class="wr-ico"><path d="M6 6.5l11.5 11M17.5 6L6.2 17.8" stroke="#2a201c" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  paw: `<svg viewBox="0 0 24 24" class="wr-paw-ico"><ellipse cx="12" cy="15.5" rx="5" ry="4.2"/><circle cx="6" cy="10" r="2.2"/><circle cx="9.6" cy="6.4" r="2.2"/><circle cx="14.4" cy="6.4" r="2.2"/><circle cx="18" cy="10" r="2.2"/></svg>`,
  bag: `<svg viewBox="0 0 24 24" class="wr-ico"><path d="M5.2 9.1c-.4 4.3-.2 8.6.6 11.2 3.9 1 8.4 1 12.4 0 .8-2.7 1-6.9.6-11.2-4.6-.9-9-.9-13.6 0z" fill="#c8915a" stroke="#2a201c" stroke-width="2" stroke-linejoin="round"/><path d="M8.6 9c.1-3 1.4-5 3.4-5s3.3 2 3.4 5" fill="none" stroke="#2a201c" stroke-width="2" stroke-linecap="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" class="wr-ico"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="#d8ccb6" stroke="#2a201c" stroke-width="2"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="#2a201c" stroke-width="2"/></svg>`,
} as const;

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** Number of sheets and popups currently open (checked every frame without DOM queries). */
export const overlays = { open: 0 };

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
    if (!this.el.hidden) return;
    this.el.hidden = false;
    overlays.open++;
  }

  close(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    overlays.open--;
    this.onClose?.();
  }
}

/** Small reward / info popup over everything. */
export function popup(host: HTMLElement, title: string, lines: readonly string[]): void {
  const el = document.createElement('div');
  el.className = 'wr-popup';
  el.innerHTML = `<div class="wr-popup-card"><h3>${esc(title)}</h3>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<button class="wr-btn wr-btn-main">Nice!</button></div>`;
  for (const ev of ['pointerdown', 'pointerup', 'click'] as const) el.addEventListener(ev, (e) => e.stopPropagation());
  overlays.open++;
  el.querySelector('button')!.addEventListener('click', () => {
    el.remove();
    overlays.open--;
  });
  host.appendChild(el);
}

/** A modal question with sketchbook buttons; resolves the chosen button index. */
export function ask(host: HTMLElement, title: string, lines: readonly string[], buttons: readonly string[]): Promise<number> {
  return new Promise((resolve) => {
    const el = document.createElement('div');
    el.className = 'wr-popup';
    el.innerHTML = `<div class="wr-popup-card"><h3>${esc(title)}</h3>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}${buttons
      .map((b, i) => `<button class="wr-btn ${i === 0 ? 'wr-btn-main' : ''}" data-i="${i}" style="margin-top:8px;width:100%">${esc(b)}</button>`)
      .join('')}</div>`;
    for (const ev of ['pointerdown', 'pointerup'] as const) el.addEventListener(ev, (e) => e.stopPropagation());
    overlays.open++;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = (e.target as HTMLElement).closest('button')?.dataset.i;
      if (i === undefined) return;
      el.remove();
      overlays.open--;
      resolve(Number(i));
    });
    host.appendChild(el);
  });
}

/** Press squash on every button is CSS; this adds the price chip markup. */
export function price(coins?: number, fishBones?: number): string {
  if (fishBones) return `<span class="wr-price">${fishBones} ${ICON.bone}</span>`;
  return `<span class="wr-price">${coins ?? 0} ${ICON.coin}</span>`;
}
