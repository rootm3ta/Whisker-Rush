import { PASS, passReward } from '../../data/economy';
import { ACCESSORIES } from '../../data/accessories';
import { CATS, type CatId } from '../../data/cats';
import { canClaimTier, claimTier, passTier } from '../../meta/Pass';
import { canClaimPremium, claimPremium } from '../../meta/Shop';
import { passPremiumReward } from '../../data/monetization';
import { Sheet, esc } from '../Sheet';
import type { MetaCtx } from './ctx';

function label(tier: number): string {
  const r = passReward(tier);
  if (r.cat) return `${CATS[r.cat as CatId].name} (cat)`;
  if (r.accessory) return ACCESSORIES[r.accessory].name;
  if (r.crate) return 'Catnip Crate';
  if (r.fishBones) return `${r.fishBones} Fish Bones`;
  if (r.roomba) return `${r.roomba} Roomba`;
  return `${r.coins} coins`;
}

/** Paw Pass season 1: free track with 30 tiers earned by Paw Stamps. */
export class PassScreen {
  private readonly sheet: Sheet;

  constructor(private readonly ctx: MetaCtx) {
    this.sheet = new Sheet(ctx.host, 'Paw Pass');
    this.sheet.body.addEventListener('click', this.onClick);
    this.sheet.onClose = () => ctx.refresh();
  }

  open(): void {
    this.render();
    this.sheet.open();
  }

  private render(): void {
    const p = this.ctx.save.profile;
    const tier = passTier(p.pass.stamps);
    const into = p.pass.stamps % PASS.stampsPerTier;
    let html = `<p class="wr-note"><b>${esc(PASS.season)}</b> · Tier ${tier}/${PASS.tiers} · ${into}/${PASS.stampsPerTier} stamps to next. Earn stamps from runs, missions, challenges and logins.</p>`;
    if (!p.pass.premium) html += `<button class="wr-btn wr-btn-main" data-act="premium">Get Premium: 300 Fish Bones back over the season</button>`;
    html += `<div class="wr-row"><b style="width:34px">Tier</b><div class="grow"><b>Free</b></div><b>&nbsp;</b><b style="width:92px;text-align:right">Premium</b></div>`;
    for (let t = 1; t <= PASS.tiers; t++) {
      const claimed = p.pass.claimed.includes(t);
      const can = canClaimTier(p, t);
      const prem = passPremiumReward(t);
      const pClaimed = (p.pass.premiumClaimed ?? []).includes(t);
      const pCell = !p.pass.premium ? `<small>${prem.fishBones} bones${prem.crate ? ' + crate' : ''}</small>` : pClaimed ? '<small>Claimed</small>' : canClaimPremium(p, t) ? `<button class="wr-btn wr-btn-sm" data-ptier="${t}">${prem.fishBones} bones</button>` : `<small>${prem.fishBones} bones</small>`;
      html += `<div class="wr-row"><b style="width:34px">${t}</b><div class="grow">${esc(label(t))}</div>
        ${claimed ? '<small>Claimed</small>' : can ? `<button class="wr-btn wr-btn-sm" data-tier="${t}">Claim</button>` : '<small>Locked</small>'}<span style="width:92px;text-align:right">${pCell}</span></div>`;
    }
    this.sheet.body.innerHTML = html;
  }

  private readonly onClick = (e: Event): void => {
    const t = (e.target as HTMLElement).closest('button');
    if (t?.dataset.act === 'premium') {
      this.ctx.openShop();
      return;
    }
    if (t?.dataset.ptier) {
      const lines = claimPremium(this.ctx.save.profile, Number(t.dataset.ptier), this.ctx.rng);
      if (lines) {
        this.ctx.save.write();
        this.ctx.reward(`Premium tier ${t.dataset.ptier}`, lines);
      }
      this.ctx.refresh();
      this.render();
      return;
    }
    if (!t?.dataset.tier) return;
    const lines = claimTier(this.ctx.save.profile, Number(t.dataset.tier), this.ctx.rng);
    if (lines) {
      this.ctx.save.write();
      this.ctx.reward(`Tier ${t.dataset.tier}`, lines);
    }
    this.ctx.refresh();
    this.render();
  };
}
