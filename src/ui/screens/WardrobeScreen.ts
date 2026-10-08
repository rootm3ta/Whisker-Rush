import { ACCESSORIES, ACCESSORY_IDS, SLOTS, type Slot } from '../../data/accessories';
import { CATS, CAT_IDS, type CatId } from '../../data/cats';
import { SETS } from '../../data/economy';
import { buyAccessory, buyCat, ownsCat, selectCat, toggleAccessory } from '../../meta/Wardrobe';
import { hex } from '../../render/Sky';
import { ICON, Sheet, esc, price } from '../Sheet';
import type { MetaCtx } from './ctx';

type Tab = 'cats' | Slot;

const SOURCE_TEXT = { set: 'Collection Set', streak: '3-day streak', pass: 'Paw Pass', secret: "Tom's Secret Stock", gift: 'Gift' } as const;

/** Wardrobe: pick a cat and mix accessories per slot, with a live 3D preview you can rotate. */
export class WardrobeScreen {
  private readonly sheet: Sheet;
  private tab: Tab = 'cats';

  constructor(
    private readonly ctx: MetaCtx,
    private readonly preview: (on: boolean) => void,
  ) {
    this.sheet = new Sheet(ctx.host, 'Wardrobe', 'wr-sheet-low');
    this.sheet.body.addEventListener('click', this.onClick);
    this.sheet.onClose = () => {
      preview(false);
      ctx.refresh();
    };
  }

  open(): void {
    this.render();
    this.sheet.open();
    this.preview(true);
  }

  private render(): void {
    const p = this.ctx.save.profile;
    const tabs = (['cats', ...SLOTS] as Tab[])
      .map((t) => `<button class="wr-tab ${t === this.tab ? 'on' : ''}" data-tab="${t}">${t === 'cats' ? 'Cats' : t[0].toUpperCase() + t.slice(1)}</button>`)
      .join('');
    let cards = '';
    if (this.tab === 'cats') {
      for (const id of CAT_IDS) {
        const c = CATS[id];
        const owned = ownsCat(p, id);
        const u = c.unlock;
        let status = '';
        if (p.cat === id) status = 'Wearing';
        else if (owned) status = 'Owned';
        else if (u.coins || u.fishBones) status = price(u.coins, u.fishBones);
        else if (u.set) status = `${ICON.lock} ${esc(SETS.find((s) => s.id === u.set)?.name ?? 'Set')}`;
        else if (u.pass) status = `${ICON.lock} Pass tier ${u.pass}`;
        cards += `<button class="wr-card-item ${p.cat === id ? 'on' : ''} ${owned ? '' : 'locked'}" data-cat="${id}">
          <span class="wr-swatch" style="background:linear-gradient(135deg, ${hex(c.base)} 55%, ${hex(c.mark)} 55%)"></span>${esc(c.name)}<small>${esc(c.passive)}</small><span>${status}</span></button>`;
      }
    } else {
      for (const id of ACCESSORY_IDS.filter((a) => ACCESSORIES[a].slot === this.tab)) {
        const a = ACCESSORIES[id];
        const owned = p.accessories.includes(id);
        const worn = p.outfit[a.slot] === id;
        const status = worn ? 'Wearing' : owned ? 'Owned' : a.source ? `${ICON.lock} ${SOURCE_TEXT[a.source]}` : price(a.coins, a.fishBones);
        cards += `<button class="wr-card-item ${worn ? 'on' : ''} ${owned ? '' : 'locked'}" data-acc="${id}">
          <span class="wr-swatch" style="background:${hex(a.colors[0])}"></span>${esc(a.name)}<span>${status}</span></button>`;
      }
    }
    this.sheet.body.innerHTML = `<p class="wr-note">Drag Miso to spin. ${ICON.coin} ${p.coins} &nbsp; ${ICON.bone} ${p.fishBones}</p><div class="wr-tabs">${tabs}</div><div class="wr-grid">${cards}</div>`;
  }

  private readonly onClick = (e: Event): void => {
    const t = (e.target as HTMLElement).closest('button');
    if (!t) return;
    const p = this.ctx.save.profile;
    const d = t.dataset;
    if (d.tab) this.tab = d.tab as Tab;
    else if (d.cat) {
      const id = d.cat as CatId;
      if (!ownsCat(p, id)) buyCat(p, id);
      selectCat(p, id);
    } else if (d.acc) {
      if (!p.accessories.includes(d.acc)) buyAccessory(p, d.acc);
      toggleAccessory(p, d.acc);
    }
    this.ctx.save.write();
    this.ctx.refresh();
    this.render();
  };
}
