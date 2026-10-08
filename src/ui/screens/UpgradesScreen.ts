import { ABILITIES, type AbilityId } from '../../data/abilities';
import { CONSUMABLES, UPGRADES, UPGRADE_IDS, type UpgradeId } from '../../data/economy';
import { satchelCapacity, upgradeCost, upgradeLevel } from '../../meta/Economy';
import { ICON, Sheet, esc, price } from '../Sheet';
import type { MetaCtx } from './ctx';

/** Scratching Post: upgrades (coin sink), Head Start stock and the equipped ability. */
export class UpgradesScreen {
  private readonly sheet: Sheet;

  constructor(private readonly ctx: MetaCtx) {
    this.sheet = new Sheet(ctx.host, 'Scratching Post');
    this.sheet.body.addEventListener('click', this.onClick);
    this.sheet.onClose = () => ctx.refresh();
  }

  open(): void {
    this.render();
    this.sheet.open();
  }

  private render(): void {
    const p = this.ctx.save.profile;
    let html = `<p class="wr-note">${ICON.coin} ${p.coins} &nbsp; ${ICON.bone} ${p.fishBones}</p>`;
    for (const id of UPGRADE_IDS) {
      const def = UPGRADES[id];
      const lvl = upgradeLevel(p, id);
      const cost = upgradeCost(id, lvl);
      const pips = Array.from({ length: def.max - 1 }, (_, i) => `<i class="${i < lvl - 1 ? 'on' : ''}"></i>`).join('');
      const extra = id === 'satchel' ? ` (${satchelCapacity(lvl)} slots)` : '';
      html += `<div class="wr-row"><div class="grow"><b>${esc(def.name)}</b><small>${esc(def.desc)}${extra}</small><div class="wr-pips">${pips}</div></div>
        ${cost === null ? '<small>MAX</small>' : `<button class="wr-btn wr-btn-sm" data-up="${id}" ${p.coins < cost ? 'disabled' : ''}>${price(cost)}</button>`}</div>`;
    }
    html += `<h3 class="wr-note" style="opacity:1;font-weight:800">Head Start stock</h3>`;
    for (const k of Object.keys(CONSUMABLES) as (keyof typeof CONSUMABLES)[]) {
      const c = CONSUMABLES[k];
      html += `<div class="wr-row"><div class="grow"><b>${esc(c.name)}</b><small>You have ${p.inventory[k]}</small></div>
        <button class="wr-btn wr-btn-sm" data-buy="${k}" ${p.coins < c.coins ? 'disabled' : ''}>${price(c.coins)}</button></div>`;
    }
    html += `<h3 class="wr-note" style="opacity:1;font-weight:800">Active ability (double-tap in runs)</h3><div class="wr-tabs">`;
    for (const id of Object.keys(ABILITIES) as AbilityId[]) {
      html += `<button class="wr-tab ${p.ability === id ? 'on' : ''}" data-ability="${id}">${ABILITIES[id].name}</button>`;
    }
    this.sheet.body.innerHTML = html + '</div>';
  }

  private readonly onClick = (e: Event): void => {
    const t = (e.target as HTMLElement).closest('button');
    if (!t) return;
    const p = this.ctx.save.profile;
    const d = t.dataset;
    if (d.up) {
      const id = d.up as UpgradeId;
      const lvl = upgradeLevel(p, id);
      const cost = upgradeCost(id, lvl);
      if (cost !== null && p.coins >= cost) {
        p.coins -= cost;
        p.upgrades[id] = lvl + 1;
      }
    } else if (d.buy) {
      const k = d.buy as keyof typeof CONSUMABLES;
      if (p.coins >= CONSUMABLES[k].coins) {
        p.coins -= CONSUMABLES[k].coins;
        p.inventory[k]++;
      }
    } else if (d.ability) {
      p.ability = d.ability as AbilityId;
    }
    this.ctx.save.write();
    this.ctx.refresh();
    this.render();
  };
}
