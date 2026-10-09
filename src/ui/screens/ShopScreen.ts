import { PRODUCTS, TIP_JAR, type ProductId, type ProductDef } from '../../data/monetization';
import { BOUTIQUE } from '../../data/boutique';
import { CATS, type CatId } from '../../data/cats';
import { ACCESSORIES, type Slot } from '../../data/accessories';
import {
  adGiftAvailable,
  bundleMsLeft,
  claimAdGift,
  claimGift,
  giftAvailable,
  grantProduct,
  heroProduct,
  restoreOwned,
  shelf,
  starterMsLeft,
} from '../../meta/Shop';
import { localDay } from '../../meta/Time';
import type { IIAP, PurchaseResult } from '../../platform/IAP';
import { Turntable } from '../../render/Turntable';
import { ICON, Sheet, esc } from '../Sheet';
import { PEARL_SVG } from '../pearl';
import { ART, jarSvg } from '../boutiqueArt';
import type { MetaCtx } from './ctx';
import '../boutique.css';

const B = BOUTIQUE;
type Tab = 'featured' | 'fish' | 'cats';

/** Cat and outfit a product shows on the turntable (if any). */
function lookOf(d: ProductDef): { cat: CatId; outfit: Partial<Record<Slot, string>> } | null {
  const cat = d.grant.cat as CatId | undefined;
  if (!cat) return null;
  const outfit: Partial<Record<Slot, string>> = {};
  for (const a of d.grant.accessories ?? []) outfit[ACCESSORIES[a].slot] = a;
  return { cat, outfit };
}

/** Contents as icon chips. */
function chips(d: ProductDef): string {
  const g = d.grant;
  const c: string[] = [];
  if (g.cat) c.push(`<span class="bq-chip">${ICON.paw}${esc(CATS[g.cat as CatId].name)}</span>`);
  for (const a of g.accessories ?? []) c.push(`<span class="bq-chip">${esc(ACCESSORIES[a].name)}</span>`);
  if (g.fishBones) c.push(`<span class="bq-chip">${ICON.bone}${g.fishBones}</span>`);
  if (g.coins) c.push(`<span class="bq-chip">${ICON.coin}${g.coins.toLocaleString()}</span>`);
  if (g.roomba) c.push(`<span class="bq-chip">Roomba x${g.roomba}</span>`);
  if (g.coinDoubler) c.push(`<span class="bq-chip">${ICON.coin}x2 coins forever</span>`);
  if (g.noAds) c.push(`<span class="bq-chip">No interstitials</span>`);
  return c.join('');
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return d > 0 ? `${d}d ${p(h)}:${p(m)}:${p(ss)}` : `${p(h)}:${p(m)}:${p(ss)}`;
}

/**
 * Pearl's Treat Boutique: Pearl behind her counter, a free daily gift, a featured hero with a live
 * turntable and a real countdown, Fish Bones tiers, a cat bundle carousel, Tom's Tip Jar, and a
 * footer with No Ads, Restore Purchases and the loot odds. Purchases go price > confirm > store.
 */
export class ShopScreen {
  private readonly sheet: Sheet;
  private readonly top: HTMLElement;
  private readonly confirmEl: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly bubble: HTMLElement;
  private readonly turntable = new Turntable();
  private readonly snaps = new Map<string, string>();
  private busy = false;
  private timer = 0;
  private lineT = 0;
  private lineI = 0;
  private hero: ProductId | null = null;
  private pending: ((ok: boolean) => void) | null = null;
  private confirmId: ProductId | null = null;

  constructor(
    private readonly ctx: MetaCtx,
    private readonly iap: IIAP,
  ) {
    this.sheet = new Sheet(ctx.host, B.title, 'wr-bq');
    const card = this.sheet.el.querySelector('.wr-sheet-card')!;
    this.top = document.createElement('div');
    this.top.className = 'bq-top';
    this.top.innerHTML = `<div class="bq-pearl">${PEARL_SVG}</div><div class="bq-side"><div class="bq-chips"><span class="wr-pill">${ICON.coin}<b class="bq-c">0</b></span><span class="wr-pill">${ICON.bone}<b class="bq-b">0</b></span></div><p class="bq-bubble"></p></div>`;
    card.insertBefore(this.top, this.sheet.body);
    this.bubble = this.top.querySelector('.bq-bubble')!;
    this.confirmEl = document.createElement('div');
    this.confirmEl.className = 'bq-confirm';
    this.confirmEl.hidden = true;
    card.appendChild(this.confirmEl);
    this.toast = document.createElement('div');
    this.toast.className = 'bq-toast';
    card.appendChild(this.toast);
    this.sheet.body.classList.add('bq-body');
    this.sheet.body.addEventListener('click', this.onClick);
    this.sheet.body.addEventListener('scroll', this.onScroll, { passive: true });
    this.confirmEl.addEventListener('click', this.onConfirm);
    this.sheet.onClose = () => {
      window.clearInterval(this.timer);
      this.turntable.stop();
      this.answer(false);
      this.ctx.refresh();
    };
  }

  open(section?: Tab): void {
    this.render();
    this.sheet.open();
    this.say(B.idleLines[this.lineI++ % B.idleLines.length]);
    window.clearInterval(this.timer);
    this.timer = window.setInterval(this.tick, 1000);
    this.turntable.start();
    if (section) requestAnimationFrame(() => this.scrollTo(section));
    // Tip jar visit bookkeeping (the jar shakes when it grew since last time).
    const p = this.ctx.save.profile;
    if (p.boutique.lastJar !== p.tipJar) {
      p.boutique.lastJar = p.tipJar;
      this.ctx.save.write();
    }
  }

  private price(id: ProductId): string {
    const sku = PRODUCTS[id].sku;
    return this.iap.products().find((p) => p.sku === sku)?.price ?? `$${PRODUCTS[id].usd.toFixed(2)}`;
  }

  private priceBtn(id: ProductId, cls = ''): string {
    const was = B.wasUsd[id];
    const strike = was && was > PRODUCTS[id].usd ? `<s>$${was.toFixed(2)}</s> ` : '';
    return `<button class="bq-price ${cls}" data-buy="${id}">${strike}${esc(this.price(id))}</button>`;
  }

  private snap(cat: CatId, outfit: Partial<Record<Slot, string>>): string {
    const key = `${cat}|${Object.values(outfit).join(',')}`;
    let s = this.snaps.get(key);
    if (!s) {
      s = this.turntable.snapshot(cat, outfit);
      this.snaps.set(key, s);
    }
    return s;
  }

  private render(): void {
    const p = this.ctx.save.profile;
    const now = this.ctx.now();
    const day = localDay(now);
    const onShelf = shelf(p, now);
    this.top.querySelector('.bq-c')!.textContent = p.coins.toLocaleString();
    this.top.querySelector('.bq-b')!.textContent = p.fishBones.toLocaleString();

    // 1. Daily gift.
    const gift = giftAvailable(p, day);
    const adGift = adGiftAvailable(p, day) && this.ctx.adsLeft('shopGift') > 0;
    let html = `<section class="bq-gift ${gift ? 'ready' : ''}">${ART.gift}<div class="grow"><b>Pearl's daily gift</b><small>${gift ? 'A little something, on the house.' : adGift ? 'Want a second one? Watch a short ad.' : 'Opened. A new gift arrives tomorrow.'}</small></div>
      ${gift ? `<button class="bq-btn bq-gold" data-act="gift">Open</button>` : adGift ? `<button class="bq-btn" data-act="adgift">Watch ad</button>` : ''}</section>`;

    // 2. Tabs.
    html += `<nav class="bq-tabs"><button data-tab="featured" class="on">Featured</button><button data-tab="fish">Fish Bones</button><button data-tab="cats">Cats &amp; Bundles</button></nav>`;

    // 3. Featured hero.
    this.hero = heroProduct(p, now);
    html += `<section id="bq-featured" class="bq-sec">`;
    if (this.hero) {
      const d = PRODUCTS[this.hero];
      const look = lookOf(d);
      const end = this.hero === 'starter' ? now + starterMsLeft(p, now) : this.hero === 'coinDoubler' ? 0 : now + bundleMsLeft(now);
      html += `<div class="bq-hero"><div class="bq-stage">${look ? '<div class="bq-tt"></div>' : ART.coinStack}<span class="bq-ribbon">${this.hero === 'starter' ? 'Starter Pack' : this.hero === 'coinDoubler' ? 'Forever' : 'This week'}</span></div>
        <h3>${esc(d.name)}</h3><div class="bq-chiprow">${chips(d)}</div>
        ${end ? `<p class="bq-timer">Ends in <b data-end="${end}">${clock(end - now)}</b></p>` : `<p class="bq-timer">${esc(d.blurb)}</p>`}
        ${this.priceBtn(this.hero, 'bq-wide')}</div>`;
    } else html += `<div class="bq-hero bq-empty"><h3>You own every featured treat.</h3><p>Pearl is deeply impressed.</p></div>`;
    html += `<button class="bq-passcard" data-act="pass">${ART.pass}<div class="grow"><b>Paw Pass</b><small>Premium track and tier skips live on the Pass board.</small></div><span class="bq-go">Open</span></button></section>`;

    // 4. Fish Bones.
    html += `<section id="bq-fish" class="bq-sec"><h4>Fish Bones</h4><div class="bq-fishgrid">`;
    for (const t of B.fishTiers) {
      const d = PRODUCTS[t.id];
      html += `<div class="bq-fish ${t.ribbon ? 'has-ribbon' : ''}">${t.ribbon ? `<span class="bq-tag">${t.ribbon}</span>` : ''}${ART[t.art]}<b class="bq-amt">${d.grant.fishBones!.toLocaleString()}</b><span class="bq-stamp">${t.bonus}</span>${this.priceBtn(t.id, 'bq-wide')}</div>`;
    }
    html += `</div></section>`;

    // 5. Cats & bundles carousel.
    const bundles = B.carousel.filter((id) => !p.iap.owned.includes(id));
    html += `<section id="bq-cats" class="bq-sec"><h4>Cats &amp; Bundles</h4>`;
    if (bundles.length) {
      html += `<div class="bq-carousel">`;
      for (const id of bundles) {
        const d = PRODUCTS[id];
        const look = lookOf(d)!;
        html += `<div class="bq-cat" data-card="${id}"><img alt="" src="${this.snap(look.cat, look.outfit)}"/><b>${esc(d.name)}</b><div class="bq-chiprow">${chips(d)}</div><small class="bq-perk">Perk: ${esc(CATS[look.cat].passive)}</small>${this.priceBtn(id, 'bq-wide')}</div>`;
      }
      html += `</div>`;
    } else html += `<p class="bq-note">Every cat bundle is already yours.</p>`;
    html += `</section>`;

    // 6. Tom's Tip Jar.
    const grew = p.tipJar > p.boutique.lastJar;
    html += `<section class="bq-jar ${grew ? 'shake' : ''}">${jarSvg(p.tipJar / TIP_JAR.cap)}<div class="grow"><b>Tom's Tip Jar</b><small>Fills up as you run. ${p.tipJar} of ${TIP_JAR.cap} Fish Bones saved.</small>
      ${p.tipJar > 0 ? `<button class="bq-price bq-wide" data-buy="tipJar">Break the jar ${esc(this.price('tipJar'))}</button>` : `<small>Empty for now. Go run!</small>`}</div></section>`;

    // 7. Footer.
    html += `<footer class="bq-foot">`;
    if (onShelf.includes('noAds')) html += `<div class="bq-mini">${ART.noAds}<div class="grow"><b>No Ads</b><small>No interstitials. Rewarded ads become free.</small></div>${this.priceBtn('noAds')}</div>`;
    if (!p.iap.coinDoubler && this.hero !== 'coinDoubler') html += `<div class="bq-mini">${ART.coinStack}<div class="grow"><b>Coin Doubler</b><small>x2 coins in every run, forever.</small></div>${this.priceBtn('coinDoubler')}</div>`;
    html += `<div class="bq-links"><button data-act="restore">Restore purchases</button><button data-act="odds">Loot odds</button></div></footer>`;

    this.sheet.body.innerHTML = html;
    const stage = this.sheet.body.querySelector('.bq-tt');
    if (stage && this.hero) {
      const look = lookOf(PRODUCTS[this.hero])!;
      this.turntable.setLook(look.cat, look.outfit);
      stage.appendChild(this.turntable.canvas);
    }
  }

  private readonly tick = (): void => {
    const now = this.ctx.now();
    let expired = false;
    this.sheet.body.querySelectorAll<HTMLElement>('[data-end]').forEach((el) => {
      const left = Number(el.dataset.end) - now;
      el.textContent = clock(left);
      if (left <= 0) expired = true;
    });
    // The Starter Pack (or a weekly bundle) ran out: the hero moves on.
    if (expired && heroProduct(this.ctx.save.profile, now) !== this.hero) this.render();
    this.lineT += 1;
    if (this.lineT >= B.lineEverySec && this.confirmEl.hidden) this.say(B.idleLines[this.lineI++ % B.idleLines.length]);
  };

  private say(line: string, mood = ''): void {
    this.lineT = 0;
    this.bubble.textContent = line;
    this.bubble.classList.remove('pop');
    void this.bubble.offsetWidth;
    this.bubble.classList.add('pop');
    const pearl = this.top.querySelector('.pearl')!;
    pearl.classList.remove('happy', 'groom', 'tap');
    if (mood) {
      void (pearl as HTMLElement).getBoundingClientRect();
      pearl.classList.add(mood);
    } else if (Math.random() < 0.5) pearl.classList.add(Math.random() < 0.5 ? 'groom' : 'tap');
  }

  /** Pearl's eyes follow the card you are looking at. */
  private look(el: Element): void {
    const r = el.getBoundingClientRect();
    const pr = this.top.querySelector('.pearl')!.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (r.left + r.width / 2 - (pr.left + pr.width * 0.4)) / 160));
    const dy = Math.max(-1, Math.min(1, (r.top - pr.bottom) / 300));
    (this.top.querySelector('.pl-pupils') as SVGGElement).style.transform = `translate(${dx * 3}px, ${dy * 2.5}px)`;
  }

  private scrollTo(tab: Tab): void {
    const sec = this.sheet.body.querySelector<HTMLElement>(`#bq-${tab}`);
    const tabs = this.sheet.body.querySelector<HTMLElement>('.bq-tabs');
    if (sec && tabs) this.sheet.body.scrollTo({ top: sec.offsetTop - tabs.offsetHeight - 6, behavior: 'smooth' });
  }

  private readonly onScroll = (): void => {
    const body = this.sheet.body;
    const tabs = body.querySelector<HTMLElement>('.bq-tabs');
    if (!tabs) return;
    const y = body.scrollTop + tabs.offsetHeight + 40;
    let active: Tab = 'featured';
    for (const t of ['featured', 'fish', 'cats'] as Tab[]) {
      const sec = body.querySelector<HTMLElement>(`#bq-${t}`);
      if (sec && sec.offsetTop <= y) active = t;
    }
    if (body.scrollTop + body.clientHeight >= body.scrollHeight - 4) active = 'cats';
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.tab === active));
  };

  private readonly onClick = async (e: Event): Promise<void> => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button, .bq-cat, .bq-fish');
    if (!t) return;
    const card = t.closest('.bq-cat, .bq-fish, .bq-hero');
    if (card) {
      this.look(card);
      if (!t.dataset.buy) this.say(B.browseLines[Math.floor(Math.random() * B.browseLines.length)]);
    }
    if (t.dataset.tab) {
      this.scrollTo(t.dataset.tab as Tab);
      return;
    }
    if (t.dataset.buy) {
      void this.buy(t.dataset.buy as ProductId, t);
      return;
    }
    const act = t.dataset.act;
    if (!act || this.busy) return;
    const p = this.ctx.save.profile;
    const day = localDay(this.ctx.now());
    if (act === 'odds') this.ctx.openOdds();
    else if (act === 'pass') {
      this.sheet.close();
      this.ctx.openPass();
    } else if (act === 'gift') {
      const lines = claimGift(p, day, this.ctx.rng);
      if (lines) this.celebrate(t, lines, 'Pearl\'s gift', B.giftLines[day % B.giftLines.length]);
    } else if (act === 'adgift') {
      this.busy = true;
      try {
        if (await this.ctx.watchAd('shopGift')) {
          const lines = claimAdGift(p, day, this.ctx.rng);
          if (lines) this.celebrate(t, lines, 'A second gift', 'Two gifts in one day. How spoiled.');
        }
      } finally {
        this.busy = false;
      }
    } else if (act === 'restore') {
      this.busy = true;
      try {
        const lines = restoreOwned(p, await this.iap.restore(), this.ctx.rng);
        this.ctx.save.write();
        this.ctx.refresh();
        this.ctx.reward('Restore purchases', lines.length ? lines : ['Nothing new to restore.']);
        this.render();
      } finally {
        this.busy = false;
      }
    }
  };

  /**
   * Price tapped: confirmation sheet (art, contents, price), then the store. Resolves true when
   * bought. Also used by the Paw Pass screen for its own products.
   */
  buy(id: ProductId, from?: HTMLElement): Promise<boolean> {
    if (this.busy) return Promise.resolve(false);
    if (!this.sheet.isOpen) this.open();
    this.answer(false);
    const d = PRODUCTS[id];
    const look = lookOf(d);
    const art = look
      ? `<img alt="" src="${this.snap(look.cat, look.outfit)}"/>`
      : id === 'tipJar'
        ? jarSvg(this.ctx.save.profile.tipJar / TIP_JAR.cap)
        : id.startsWith('fish')
          ? ART[B.fishTiers.find((f) => f.id === id)?.art ?? 'pouch']
          : id === 'noAds'
            ? ART.noAds
            : id.startsWith('pass')
              ? ART.pass
              : ART.coinStack;
    const contents = id === 'tipJar' ? `<span class="bq-chip">${ICON.bone}${this.ctx.save.profile.tipJar}</span>` : chips(d) || `<span class="bq-chip">${esc(d.blurb)}</span>`;
    this.confirmEl.innerHTML = `<div class="bq-confirm-card"><div class="bq-confirm-art">${art}</div><h3>${esc(d.name)}</h3><p>${esc(d.blurb)}</p><div class="bq-chiprow">${contents}</div>
      <button class="bq-price bq-wide bq-big" data-c="buy">Buy for ${esc(this.price(id))}</button><button class="bq-btn bq-ghost" data-c="no">Not now</button></div>`;
    this.confirmEl.hidden = false;
    this.confirmId = id;
    this.ctx.haptic('tick');
    this.ctx.sound('pop');
    if (from) this.look(from);
    this.say(B.browseLines[Math.floor(Math.random() * B.browseLines.length)]);
    return new Promise((resolve) => (this.pending = resolve));
  }

  private answer(ok: boolean): void {
    const p = this.pending;
    this.pending = null;
    this.confirmEl.hidden = true;
    this.confirmId = null;
    p?.(ok);
  }

  private readonly onConfirm = async (e: Event): Promise<void> => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-c]');
    if (!t && e.target !== this.confirmEl) return;
    if (!t || t.dataset.c === 'no') {
      this.say(B.cancelLines[Math.floor(Math.random() * B.cancelLines.length)]);
      this.answer(false);
      return;
    }
    const id = this.confirmId;
    if (!id || this.busy) return;
    this.busy = true;
    const d = PRODUCTS[id];
    let result: PurchaseResult = 'failed';
    try {
      result = await this.iap.purchase(d.sku, d.consumable, d.name);
    } catch {
      result = 'failed';
    } finally {
      this.busy = false;
    }
    if (result === 'ok') {
      const lines = grantProduct(this.ctx.save.profile, id, this.ctx.rng);
      this.ctx.save.write();
      // Celebrate first: the flying rewards start from the (still visible) buy button.
      this.celebrate(t, lines, 'Thank you!', B.buyLines[Math.floor(Math.random() * B.buyLines.length)], true);
      this.answer(true);
    } else if (result === 'cancelled') {
      this.answer(false);
      this.say(B.cancelLines[Math.floor(Math.random() * B.cancelLines.length)]);
      this.showToast('Purchase cancelled. Nothing was charged.');
    } else {
      this.answer(false);
      this.ctx.haptic('error');
      this.say(B.failLines[Math.floor(Math.random() * B.failLines.length)]);
      this.showToast('The store could not finish that purchase. You were not charged. Please try again in a moment.');
    }
  };

  private showToast(text: string): void {
    this.toast.textContent = text;
    this.toast.classList.remove('on');
    void this.toast.offsetWidth;
    this.toast.classList.add('on');
  }

  /** Rewards fly into the counters, counters tick up, confetti, Pearl spins. */
  private celebrate(from: HTMLElement, lines: string[], title: string, line: string, register = false): void {
    const p = this.ctx.save.profile;
    const coinEl = this.top.querySelector<HTMLElement>('.bq-c')!;
    const boneEl = this.top.querySelector<HTMLElement>('.bq-b')!;
    const before = [Number(coinEl.textContent!.replace(/\D/g, '')), Number(boneEl.textContent!.replace(/\D/g, ''))];
    this.ctx.save.write();
    this.ctx.refresh();
    this.ctx.sound(register ? 'register' : 'stamp');
    this.ctx.haptic('success');
    this.say(line, 'happy');
    const fr = from.getBoundingClientRect();
    const card = this.sheet.el.querySelector('.wr-sheet-card')!;
    const cr = card.getBoundingClientRect();
    const flyTo = (target: HTMLElement, icon: string, n: number) => {
      const tr = target.getBoundingClientRect();
      for (let i = 0; i < n; i++) {
        const f = document.createElement('div');
        f.className = 'bq-fly';
        f.innerHTML = icon;
        f.style.left = `${fr.left - cr.left + fr.width / 2 - 12 + (i - n / 2) * 10}px`;
        f.style.top = `${fr.top - cr.top}px`;
        card.appendChild(f);
        requestAnimationFrame(() => {
          f.style.transitionDelay = `${i * 60}ms`;
          f.style.transform = `translate(${tr.left - fr.left - fr.width / 2 + 12 - (i - n / 2) * 10}px, ${tr.top - fr.top}px) scale(0.6)`;
          f.style.opacity = '0.3';
        });
        window.setTimeout(() => f.remove(), 900 + i * 60);
      }
    };
    if (p.coins !== before[0]) flyTo(coinEl, ICON.coin, 6);
    if (p.fishBones !== before[1]) flyTo(boneEl, ICON.bone, 6);
    const count = (el: HTMLElement, a: number, b: number) => {
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0 - 500) / 700);
        el.textContent = Math.round(a + (b - a) * Math.max(0, k)).toLocaleString();
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    count(coinEl, before[0], p.coins);
    count(boneEl, before[1], p.fishBones);
    const colors = ['#d9a441', '#f6c9c4', '#e89a96', '#fbf6ec', '#c25a6a', '#9fc3d6'];
    for (let i = 0; i < 36; i++) {
      const c = document.createElement('i');
      c.className = 'bq-confetti';
      c.style.left = `${Math.random() * 100}%`;
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = `${Math.random() * 0.3}s`;
      c.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
      c.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
      card.appendChild(c);
      window.setTimeout(() => c.remove(), 1800);
    }
    window.setTimeout(() => {
      this.ctx.reward(title, lines);
      if (this.sheet.isOpen) this.render();
    }, 1100);
  }
}
