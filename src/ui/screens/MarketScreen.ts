import { SETS } from '../../data/economy';
import { MARKET } from '../../data/economy';
import { ACCESSORIES } from '../../data/accessories';
import { CONSUMABLES } from '../../data/economy';
import { LOOT_ITEMS, RARITIES } from '../../data/pickups';
import { TOM_LINES } from '../../data/tom';
import { NEWCOMER } from '../../data/tutorial';
import { dailyBoard, haggleBonus, secretStock, sellPrice, stockBucket, type BoardEntry } from '../../meta/Economy';
import { buySecret, itemIndex, sell, sellAll, sellMul, setProgress, stashTotal, tradeSet } from '../../meta/Market';
import { localDay } from '../../meta/Time';
import { hex } from '../../render/Sky';
import { ICON, Sheet, esc, price } from '../Sheet';
import type { MetaCtx } from './ctx';

const TOM_SVG = `<svg viewBox="0 0 64 64"><path d="M12 22l4-16 12 11h8l12-11 4 16c4 6 4 18-2 25-6 8-16 10-20 10s-14-2-20-10c-6-7-6-19-2-25z" fill="#e0894a" stroke="#2a201c" stroke-width="2.5" stroke-linejoin="round"/><path d="M20 30c5-3 10-3 12 0" stroke="#2a201c" stroke-width="2.5" fill="none"/><path d="M14 27l36 9" stroke="#2a201c" stroke-width="2.5"/><ellipse cx="25" cy="33" rx="6.5" ry="5.5" fill="#2a201c"/><ellipse cx="42" cy="34" rx="3.2" ry="4" fill="#2a201c"/><path d="M30 44l2.5 2.5 2.5-2.5z" fill="#e88c94" stroke="#2a201c" stroke-width="1.5"/><path d="M24 50c4 3 12 3 16 0" stroke="#2a201c" stroke-width="2" fill="none"/><path d="M16 18c3 2 6 6 5 9M40 14c2 3 6 4 9 3" stroke="#b5622f" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;

type Tab = 'sell' | 'secret' | 'sets';

/** Old Tom's Market: sell loot, daily hot/cold board, haggle, Secret Stock and Collection Sets. */
export class MarketScreen {
  private readonly sheet: Sheet;
  private tab: Tab = 'sell';
  private board: BoardEntry[] = [];
  private line = '';
  private haggle = 1;
  /** First visit: Tom pays the newcomer bonus on everything. Rewarded "double loot" also sets it. */
  private bonus = 1;
  private doubledThisVisit = false;
  private haggleUsed = false;
  private haggling = false;
  private haggleStart = 0;
  private needle: HTMLElement | null = null;

  constructor(private readonly ctx: MetaCtx) {
    this.sheet = new Sheet(ctx.host, "Old Tom's Market");
    this.sheet.body.addEventListener('click', this.onClick);
    this.sheet.onClose = () => ctx.refresh();
  }

  get isOpen(): boolean {
    return this.sheet.isOpen;
  }

  open(newcomer = false): void {
    this.board = dailyBoard(localDay(this.ctx.now()));
    this.tab = 'sell';
    this.haggle = 1;
    this.haggleUsed = false;
    this.haggling = false;
    this.bonus = newcomer ? NEWCOMER.sellMul : 1;
    this.doubledThisVisit = false;
    if (newcomer) this.line = NEWCOMER.tomIntro.join(' ');
    else this.say(stashTotal(this.ctx.save.profile) === 0 ? 'empty' : 'greet');
    this.render();
    this.sheet.open();
  }

  close(): void {
    this.sheet.close();
  }

  /** Needle animation for the haggle mini-game. */
  update(): void {
    if (!this.haggling || !this.needle) return;
    this.needle.style.left = `${50 + 50 * this.needlePos()}%`;
  }

  private needlePos(): number {
    return Math.sin(((performance.now() - this.haggleStart) / 1000) * MARKET.haggleSwingHz * Math.PI * 2);
  }

  private say(kind: keyof typeof TOM_LINES): void {
    this.line = this.ctx.rng.pick(TOM_LINES[kind]);
  }

  private render(): void {
    const p = this.ctx.save.profile;
    const tabs = (['sell', 'secret', 'sets'] as Tab[])
      .map((t) => `<button class="wr-tab ${t === this.tab ? 'on' : ''}" data-tab="${t}">${{ sell: 'Sell', secret: 'Secret Stock', sets: 'Sets' }[t]}</button>`)
      .join('');
    let html = `<div class="wr-tom">${TOM_SVG}<div class="wr-bubble">${esc(this.line)}</div></div><div class="wr-tabs">${tabs}</div>`;
    if (this.tab === 'sell') html += this.renderSell();
    else if (this.tab === 'secret') html += this.renderSecret();
    else html += this.renderSets();
    html += `<p class="wr-note">${ICON.coin} ${p.coins} &nbsp; ${ICON.bone} ${p.fishBones}</p>`;
    this.sheet.body.innerHTML = html;
    this.needle = this.sheet.body.querySelector('.wr-needle');
  }

  private renderSell(): string {
    const p = this.ctx.save.profile;
    const chip = (e: BoardEntry) => `<span class="${e.mul > 1 ? 'wr-chip-hot' : 'wr-chip-cold'}">${esc(LOOT_ITEMS[e.item].name)} x${e.mul}</span>`;
    let html = this.bonus > 1 ? `<p class="wr-chip-hot" style="display:block;text-align:center">Newcomer bonus: x${this.bonus} on everything today</p>` : '';
    html += `<p class="wr-note">Today's board (resets at midnight). <b>Hot</b> items sell for more (x2.5), <b>cold</b> ones for less: hold them for another day.</p><div>${this.board.map(chip).join('')}</div>`;
    if (!this.doubledThisVisit && Object.keys(this.ctx.save.profile.stash).length > 0) {
      html += `<button class="wr-btn wr-btn-sm" data-act="double" style="margin-top:6px">Watch ad: x2 on everything this visit</button>`;
    } else if (this.doubledThisVisit) html += `<p class="wr-note"><b>x2 loot value this visit.</b></p>`;
    html += `<div class="wr-haggle">`;
    if (this.haggling) html += `<b>Stop the paw in the green!</b><div class="wr-meter"><div class="wr-needle"></div></div><button class="wr-btn wr-btn-sm" data-act="stop">Paw!</button>`;
    else if (this.haggle > 1) html += `<b>Haggled: +${Math.round((this.haggle - 1) * 100)}% on your next sale</b>`;
    else if (this.haggleUsed) html += `<b>No more haggling this visit.</b>`;
    else html += `<button class="wr-btn wr-btn-sm" data-act="haggle">Haggle (once per visit)</button>`;
    html += `</div>`;
    const ids = Object.keys(p.stash).sort((a, b) => LOOT_ITEMS[itemIndex(b)].value - LOOT_ITEMS[itemIndex(a)].value);
    if (ids.length === 0) return html + `<p class="wr-note">Your stash is empty. Go grab some loot!</p>`;
    for (const id of ids) {
      const i = itemIndex(id);
      const item = LOOT_ITEMS[i];
      const each = sellPrice(i, this.board, sellMul(p) * this.bonus);
      html += `<div class="wr-row"><span class="wr-swatch" style="background:${hex(RARITIES[item.rarity].color)};width:18px;height:18px"></span>
        <div class="grow"><b>${esc(item.name)}</b> x${p.stash[id]}<small>${RARITIES[item.rarity].name} · ${price(each)} each</small></div>
        <button class="wr-btn wr-btn-sm" data-sell="${id}" data-n="1">Sell 1</button>
        <button class="wr-btn wr-btn-sm" data-sell="${id}" data-n="${p.stash[id]}">All</button></div>`;
    }
    html += `<button class="wr-btn wr-btn-main" data-act="sellAll" style="margin-top:10px">Sell All</button>`;
    return html;
  }

  private renderSecret(): string {
    const p = this.ctx.save.profile;
    const bucket = stockBucket(this.ctx.now());
    const left = (bucket + 1) * MARKET.secretStockHours * 3_600_000 - this.ctx.now();
    const key = this.stockKey();
    let html = `<p class="wr-note">Restocks in ${Math.ceil(left / 3_600_000)} h.</p>`;
    if (this.ctx.adsLeft('secretRefresh') > 0) html += `<button class="wr-btn wr-btn-sm" data-act="refresh">Watch ad: new stock now</button>`;
    secretStock(key).forEach((e, i) => {
      const name = e.kind === 'accessory' ? ACCESSORIES[e.id].name : CONSUMABLES[e.id as keyof typeof CONSUMABLES].name;
      const owned = (e.kind === 'accessory' && p.accessories.includes(e.id)) || p.secretBought.includes(`${key}:${e.id}`);
      html += `<div class="wr-row"><div class="grow"><b>${esc(name)}</b><small>${e.kind === 'accessory' ? ACCESSORIES[e.id].slot : 'consumable'}</small></div>
        ${owned ? '<small>Sold out</small>' : `<button class="wr-btn wr-btn-sm" data-secret="${i}">${price(e.coins, e.fishBones)}</button>`}</div>`;
    });
    return html;
  }

  private renderSets(): string {
    const p = this.ctx.save.profile;
    let html = `<p class="wr-note">Trade a full set to Tom: exclusive reward and +2% coins forever.</p>`;
    for (const s of SETS) {
      const pr = setProgress(p, s.id);
      const reward = s.reward.kind === 'cat' ? 'A new cat' : ACCESSORIES[s.reward.id].name;
      const items = s.items.map((id) => `<span class="${(p.stash[id] ?? 0) > 0 ? 'wr-chip-hot' : 'wr-chip-cold'}">${esc(LOOT_ITEMS[itemIndex(id)].name)}</span>`).join('');
      html += `<div class="wr-row"><div class="grow"><b>${esc(s.name)}</b> ${pr.have}/${pr.need}<small>Reward: ${esc(reward)}</small><div>${items}</div></div>
        ${pr.traded ? '<small>Traded</small>' : `<button class="wr-btn wr-btn-sm" data-set="${s.id}" ${pr.complete ? '' : 'disabled'}>Trade</button>`}</div>`;
    }
    return html;
  }

  private readonly onClick = (e: Event): void => {
    const t = (e.target as HTMLElement).closest('button');
    if (!t) return;
    const p = this.ctx.save.profile;
    const d = t.dataset;
    if (d.tab) {
      this.tab = d.tab as Tab;
      if (this.tab === 'secret') this.say('secret');
    } else if (d.sell) {
      const n = Number(d.n);
      const isSock = d.sell === 'sock';
      const coins = sell(p, d.sell, n, this.board, this.haggle, this.bonus);
      const mul = this.board.find((b) => LOOT_ITEMS[b.item].id === d.sell)?.mul ?? 1;
      this.say(mul > 1 ? 'hot' : mul < 1 ? 'cold' : 'sell');
      this.haggle = 1;
      this.coinFall(Math.min(12, 3 + n));
      this.ctx.sound('register');
      this.ctx.addStats({ itemsSold: n, socksSold: isSock ? n : 0 });
      this.ctx.save.write();
      void coins;
    } else if (d.act === 'sellAll') {
      const r = sellAll(p, this.board, this.bonus);
      if (r.items === 0) return;
      this.say('sellAll');
      this.coinFall(MARKET.waterfallSteps);
      this.ctx.sound('register');
      this.ctx.addStats({ itemsSold: r.items, socksSold: r.socks });
      this.ctx.save.write();
      this.ctx.reward('Sold!', [`${r.items} items`, `+${r.coins} coins`]);
    } else if (d.act === 'double') {
      void this.ctx.watchAd('doubleLoot').then((ok) => {
        if (!ok) return;
        this.doubledThisVisit = true;
        this.bonus = Math.max(this.bonus, 2);
        this.render();
      });
      return;
    } else if (d.act === 'refresh') {
      void this.ctx.watchAd('secretRefresh').then((ok) => {
        if (ok) this.say('secret');
        this.render();
      });
      return;
    } else if (d.act === 'haggle') {
      this.haggling = true;
      this.haggleUsed = true;
      this.haggleStart = performance.now();
    } else if (d.act === 'stop') {
      this.haggling = false;
      const bonus = haggleBonus(this.needlePos());
      this.haggle = 1 + bonus;
      this.say(bonus > 0 ? 'haggleGood' : 'haggleBad');
    } else if (d.secret) {
      const key = this.stockKey();
      const entry = secretStock(key)[Number(d.secret)];
      if (buySecret(p, entry, key)) {
        this.ctx.save.write();
        this.say('secret');
      } else {
        this.say('broke');
      }
    } else if (d.set) {
      const lines = tradeSet(p, d.set, this.ctx.rng);
      if (lines) {
        this.say('set');
        this.ctx.save.write();
        this.ctx.reward('Set traded!', lines);
      }
    }
    this.ctx.refresh();
    this.render();
  };

  /** Secret Stock seed: the 8-hour bucket, shifted by ad refreshes. */
  private stockKey(): number {
    return stockBucket(this.ctx.now()) * 64 + this.ctx.save.profile.ads.secretShift;
  }

  /** Sell All waterfall: coins rain down the screen. */
  private coinFall(n: number): void {
    const el = document.createElement('div');
    el.className = 'wr-coinfall';
    let html = '';
    for (let i = 0; i < n; i++) {
      html += ICON.coin.replace('class="wr-ico"', `class="wr-ico" style="left:${5 + Math.random() * 90}%;animation-delay:${(i * 0.035).toFixed(2)}s"`);
    }
    el.innerHTML = html;
    this.ctx.host.appendChild(el);
    window.setTimeout(() => el.remove(), 2400);
  }
}
