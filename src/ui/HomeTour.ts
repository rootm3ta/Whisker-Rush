import { HOME, type HomeAction } from '../data/home';
import { overlays } from './Sheet';
import './homeTour.css';

/**
 * First-visit Home tour: the room dims, one hotspot at a time gets a spotlight, a hand-drawn arrow
 * and one line. Tap anywhere for the next step; Skip ends it. Counts as an overlay while open.
 */
export class HomeTour {
  private readonly root: HTMLDivElement;
  private readonly spot: HTMLElement;
  private readonly card: HTMLElement;
  private readonly text: HTMLElement;
  private readonly next: HTMLButtonElement;
  private readonly arrow: SVGPathElement;
  private i = -1;
  private done: (() => void) | null = null;
  private readonly last = new Float64Array(5);

  constructor(host: HTMLElement) {
    const r = document.createElement('div');
    r.className = 'wr-tour';
    r.hidden = true;
    r.innerHTML = `
      <div class="wr-tour-spot"></div>
      <svg class="wr-tour-arrow" aria-hidden="true"><path/></svg>
      <div class="wr-tour-card">
        <p></p>
        <div class="wr-tour-row"><button class="wr-tour-skip">Skip</button><span class="wr-tour-dots"></span><button class="wr-btn wr-btn-sm wr-tour-next">Next</button></div>
      </div>`;
    host.appendChild(r);
    this.root = r;
    this.spot = r.querySelector('.wr-tour-spot')!;
    this.card = r.querySelector('.wr-tour-card')!;
    this.text = r.querySelector('p')!;
    this.next = r.querySelector('.wr-tour-next')!;
    this.arrow = r.querySelector('.wr-tour-arrow path')!;
    for (const ev of ['pointerdown', 'pointerup'] as const) r.addEventListener(ev, (e) => e.stopPropagation());
    r.addEventListener('click', (e) => {
      e.stopPropagation();
      if ((e.target as HTMLElement).closest('.wr-tour-skip')) this.finish();
      else this.go(this.i + 1);
    });
  }

  get active(): boolean {
    return this.i >= 0;
  }

  /** The hotspot currently in the spotlight. */
  get action(): HomeAction | null {
    return this.i >= 0 ? HOME.tour[this.i].action : null;
  }

  start(onDone: () => void): void {
    if (this.active) return;
    this.done = onDone;
    overlays.open++;
    this.root.hidden = false;
    this.go(0);
  }

  private go(i: number): void {
    if (i >= HOME.tour.length) {
      this.finish();
      return;
    }
    this.i = i;
    this.last[0] = NaN;
    this.text.textContent = HOME.tour[i].text;
    this.next.textContent = i === HOME.tour.length - 1 ? 'Got it' : 'Next';
    this.root.querySelector('.wr-tour-dots')!.innerHTML = HOME.tour.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    this.card.classList.remove('pop');
    void this.card.offsetWidth;
    this.card.classList.add('pop');
  }

  finish(): void {
    if (!this.active) return;
    this.i = -1;
    this.root.hidden = true;
    overlays.open--;
    const d = this.done;
    this.done = null;
    d?.();
  }

  /** Moves the spotlight onto the hotspot (screen px) and lays out the card and arrow. */
  place(x: number, y: number, r: number, vw: number, vh: number): void {
    if (!this.active) return;
    const L = this.last;
    const rx = Math.round(x);
    const ry = Math.round(y);
    const rr = Math.round(r);
    if (L[0] === rx && L[1] === ry && L[2] === rr && L[3] === vw && L[4] === vh) return;
    L[0] = rx;
    L[1] = ry;
    L[2] = rr;
    L[3] = vw;
    L[4] = vh;
    this.spot.style.transform = `translate(${x - r}px, ${y - r}px)`;
    this.spot.style.width = this.spot.style.height = `${r * 2}px`;
    const below = y < vh * 0.5;
    const cw = Math.min(300, vw - 32);
    const cx = Math.min(Math.max(x - cw / 2, 16), vw - 16 - cw);
    const cy = below ? Math.min(y + r + 70, vh - 190) : Math.max(y - r - 70 - 130, 70);
    this.card.style.width = `${cw}px`;
    this.card.style.transform = `translate(${cx}px, ${cy}px)`;
    // Hand-drawn arrow from the card edge to the spotlight rim.
    const sx = Math.min(Math.max(x, cx + 30), cx + cw - 30);
    const sy = below ? cy - 6 : cy + 130 + 6;
    const ex = x;
    const ey = below ? y + r + 6 : y - r - 6;
    const bend = (ex - sx) * 0.3 + 26;
    const head = below ? -1 : 1;
    this.arrow.setAttribute(
      'd',
      `M${sx} ${sy} Q${(sx + ex) / 2 + bend} ${(sy + ey) / 2} ${ex} ${ey} M${ex - 9} ${ey - 10 * head} L${ex} ${ey} L${ex + 9} ${ey - 8 * head}`,
    );
  }
}
