import { crateOddsPercent } from '../../meta/Economy';
import { MYSTERY_FISH } from '../../data/secrets';
import { Sheet, esc } from '../Sheet';
import type { MetaCtx } from './ctx';

/** Loot box odds disclosure (Apple 3.1.1, Google Play policy). */
export class OddsScreen {
  private readonly sheet: Sheet;

  constructor(ctx: MetaCtx) {
    this.sheet = new Sheet(ctx.host, 'Odds');
  }

  open(): void {
    const crate = crateOddsPercent()
      .map((o) => `<div class="wr-row"><div class="grow"><b>${esc(o.label)}</b></div><b>${o.percent}%</b></div>`)
      .join('');
    const total = MYSTERY_FISH.table.reduce((a, e) => a + e.weight, 0);
    const fish = MYSTERY_FISH.table
      .map((e) => `<div class="wr-row"><div class="grow"><b>${esc({ powerup: 'A random power-up', sneeze: 'Sneeze (coins)', loaf: 'Loaf mode (points)' }[e.id])}</b></div><b>${Math.round((e.weight / total) * 1000) / 10}%</b></div>`)
      .join('');
    this.sheet.body.innerHTML = `<p class="wr-note">Catnip Crates come from logins, missions, the Paw Pass and free ads. They are never sold for money.</p>
      <h3 class="wr-note" style="opacity:1;font-weight:800">Catnip Crate</h3>${crate}
      <h3 class="wr-note" style="opacity:1;font-weight:800">Mystery Fish (in runs)</h3>${fish}`;
    this.sheet.open();
  }
}
