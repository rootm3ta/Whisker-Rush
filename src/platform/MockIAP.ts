import type { IapProduct, IIAP } from './IAP';
import { PRODUCTS } from '../data/monetization';

/** Web mock store: a confirm card instead of a payment sheet. Nothing is charged. */
export class MockIAP implements IIAP {
  private list: IapProduct[] = [];

  constructor(private readonly host: HTMLElement) {}

  async init(skus: readonly string[]): Promise<void> {
    const bySku = new Map(Object.values(PRODUCTS).map((p) => [p.sku, p]));
    this.list = skus.map((sku) => ({ sku, price: `$${bySku.get(sku)?.usd.toFixed(2) ?? '?'}` }));
  }

  products(): IapProduct[] {
    return this.list;
  }

  purchase(sku: string, _consumable: boolean, label: string): Promise<boolean> {
    const price = this.list.find((p) => p.sku === sku)?.price ?? '';
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'wr-ad';
      el.innerHTML = `<div class="wr-ad-card"><p class="wr-ad-tag">Test store (web)</p><p class="wr-ad-name"></p><p>No money is charged on the web build.</p>
        <button class="wr-btn wr-btn-main" data-a="buy">Buy ${price}</button> <button class="wr-btn" data-a="cancel" style="margin-top:8px">Cancel</button></div>`;
      el.querySelector('.wr-ad-name')!.textContent = label;
      for (const ev of ['pointerdown', 'pointerup'] as const) el.addEventListener(ev, (e) => e.stopPropagation());
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const a = (e.target as HTMLElement).closest('button')?.dataset.a;
        if (!a) return;
        el.remove();
        resolve(a === 'buy');
      });
      this.host.appendChild(el);
    });
  }

  async restore(): Promise<string[]> {
    return [];
  }
}
