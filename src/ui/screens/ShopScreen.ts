import { PRODUCTS, type ProductId } from '../../data/monetization';
import { grantProduct, restoreOwned, shelf, starterAvailable } from '../../meta/Shop';
import { STARTER_HOURS } from '../../data/monetization';
import type { IIAP } from '../../platform/IAP';
import { Sheet, esc } from '../Sheet';
import type { MetaCtx } from './ctx';

/** The shop: IAP catalog (GAME_DESIGN 11.3), restore purchases, link to crate odds. */
export class ShopScreen {
  private readonly sheet: Sheet;
  private busy = false;

  constructor(
    private readonly ctx: MetaCtx,
    private readonly iap: IIAP,
  ) {
    this.sheet = new Sheet(ctx.host, 'Shop');
    this.sheet.body.addEventListener('click', this.onClick);
    this.sheet.onClose = () => ctx.refresh();
  }

  open(): void {
    this.render();
    this.sheet.open();
  }

  private price(id: ProductId): string {
    const sku = PRODUCTS[id].sku;
    return this.iap.products().find((p) => p.sku === sku)?.price ?? `$${PRODUCTS[id].usd.toFixed(2)}`;
  }

  private render(): void {
    const p = this.ctx.save.profile;
    const now = this.ctx.now();
    let html = `<p class="wr-note">Fair and cozy: nothing here makes you win. Prices come from the store.</p>`;
    if (starterAvailable(p, now)) {
      const h = Math.max(0, Math.ceil(STARTER_HOURS - (now - p.firstSeen) / 3_600_000));
      html += `<p class="wr-chip-hot" style="display:block;text-align:center">Starter Pack: ${h} h left</p>`;
    }
    for (const id of shelf(p, now)) {
      const d = PRODUCTS[id];
      const extra = id === 'tipJar' ? ` (${p.tipJar} saved)` : '';
      html += `<div class="wr-row"><div class="grow"><b>${esc(d.name)}</b><small>${esc(d.blurb + extra)}</small></div>
        <button class="wr-btn wr-btn-sm" data-buy="${id}" ${id === 'tipJar' && p.tipJar <= 0 ? 'disabled' : ''}>${esc(this.price(id))}</button></div>`;
    }
    html += `<div class="wr-go-row"><button class="wr-btn" data-act="restore">Restore purchases</button><button class="wr-btn" data-act="odds">Crate odds</button></div>`;
    this.sheet.body.innerHTML = html;
  }

  private readonly onClick = async (e: Event): Promise<void> => {
    const t = (e.target as HTMLElement).closest('button');
    if (!t || this.busy) return;
    const p = this.ctx.save.profile;
    if (t.dataset.act === 'odds') {
      this.ctx.openOdds();
      return;
    }
    this.busy = true;
    try {
      if (t.dataset.act === 'restore') {
        const lines = restoreOwned(p, await this.iap.restore(), this.ctx.rng);
        this.ctx.save.write();
        this.ctx.reward('Restore purchases', lines.length ? lines : ['Nothing new to restore.']);
      } else if (t.dataset.buy) {
        const id = t.dataset.buy as ProductId;
        const d = PRODUCTS[id];
        if (await this.iap.purchase(d.sku, d.consumable, d.name)) {
          const lines = grantProduct(p, id, this.ctx.rng);
          this.ctx.save.write();
          this.ctx.sound('register');
          this.ctx.reward('Thank you!', lines);
        }
      }
    } finally {
      this.busy = false;
    }
    this.ctx.refresh();
    this.render();
  };
}
