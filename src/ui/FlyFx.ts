import { FLY } from '../data/fx';
import { ICON } from './Sheet';

/** Reward icons that fly from where they were earned to their HUD counter. Pooled DOM nodes. */
export class FlyFx {
  private readonly nodes: HTMLElement[] = [];
  private next = 0;

  constructor(host: HTMLElement) {
    const layer = document.createElement('div');
    layer.className = 'wr-fly-layer';
    host.appendChild(layer);
    for (let i = 0; i < FLY.pool; i++) {
      const n = document.createElement('div');
      n.className = 'wr-fly';
      layer.appendChild(n);
      this.nodes.push(n);
    }
  }

  fly(kind: 'coin' | 'loot', fromX: number, fromY: number, to: Element | null): void {
    if (!to) return;
    const r = to.getBoundingClientRect();
    const n = this.nodes[this.next];
    this.next = (this.next + 1) % this.nodes.length;
    n.innerHTML = kind === 'coin' ? ICON.coin : ICON.bag;
    n.style.transition = 'none';
    n.style.opacity = '1';
    n.style.transform = `translate(${fromX}px, ${fromY}px) scale(1.2)`;
    void n.offsetWidth;
    n.style.transition = `transform ${FLY.ms}ms cubic-bezier(0.5, -0.4, 0.7, 1), opacity ${FLY.ms}ms ease-in`;
    n.style.transform = `translate(${r.left + r.width / 2 - 12}px, ${r.top + r.height / 2 - 12}px) scale(0.7)`;
    n.style.opacity = '0.4';
  }
}
