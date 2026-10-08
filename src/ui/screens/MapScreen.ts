import { ACCESSORIES } from '../../data/accessories';
import { SETS } from '../../data/economy';
import { CITIES, WORLD_TOUR, type CityId } from '../../data/cities';
import { DOGS } from '../../data/dogs';
import { LOOT_ITEMS, RARITIES } from '../../data/pickups';
import { isUnlocked, travel, unlockCity, unlockOptions, type UnlockMethod } from '../../meta/WorldTour';
import { hex } from '../../render/Sky';
import { ICON, Sheet, esc } from '../Sheet';
import type { MetaCtx } from './ctx';

const W = 340;
const H = 210;

/** Doodled continents for the sketchbook world map (hand-authored paths in a 340x210 box). */
const LAND = [
  'M30 60 C45 35 90 30 110 48 C122 60 112 80 100 92 C92 110 70 130 58 120 C44 108 22 88 30 60 Z',
  'M86 128 C100 122 112 140 108 162 C104 186 92 196 86 180 C80 166 78 140 86 128 Z',
  'M150 50 C170 34 205 36 220 46 C228 58 214 72 200 76 C188 84 176 96 166 92 C150 86 140 66 150 50 Z',
  'M168 100 C186 96 204 104 206 124 C208 150 194 172 182 170 C168 166 160 140 162 118 Z',
  'M222 42 C252 26 300 30 318 52 C330 70 312 90 290 96 C268 104 244 96 232 80 C220 66 214 52 222 42 Z',
  'M282 140 C298 134 316 142 314 158 C312 172 296 176 286 168 C278 160 276 148 282 140 Z',
];

/** World Tour map: pins per city, unlock by distance, coins or Fish Bones, travel. */
export class MapScreen {
  private readonly sheet: Sheet;
  private selected: string = 'mapleLane';

  constructor(
    private readonly ctx: MetaCtx,
    private readonly onTravel: (id: CityId) => void,
  ) {
    this.sheet = new Sheet(ctx.host, 'World Tour');
    this.sheet.body.addEventListener('click', this.onClick);
    this.sheet.onClose = () => ctx.refresh();
  }

  open(): void {
    this.selected = this.ctx.save.profile.city;
    this.render();
    this.sheet.open();
  }

  private render(): void {
    const p = this.ctx.save.profile;
    const pts = WORLD_TOUR.map((c) => `${(c.x * W).toFixed(0)},${(c.y * H).toFixed(0)}`).join(' ');
    let pins = '';
    for (const c of WORLD_TOUR) {
      const x = c.x * W;
      const y = c.y * H;
      const open = c.playable && isUnlocked(p, c.id as CityId);
      const here = p.city === c.id;
      const fill = !c.playable ? '#d8ccb6' : open ? '#d9562e' : '#fbf6ec';
      pins += `<g class="wr-pin" data-city="${c.id}" transform="translate(${x.toFixed(0)} ${y.toFixed(0)})">
        <circle r="${this.selected === c.id ? 12 : 9}" fill="${fill}" stroke="#2a201c" stroke-width="2.5"/>
        ${here ? '<circle r="4" fill="#fbf6ec"/>' : !open ? '<path d="M-3.5 1h7v5h-7z M-2 1v-2.5a2 2 0 014 0V1" fill="none" stroke="#2a201c" stroke-width="1.6"/>' : ''}
        <text y="${y > H - 30 ? -16 : 24}" text-anchor="middle">${esc(c.name)}</text></g>`;
    }
    const svg = `<svg class="wr-map" viewBox="0 0 ${W} ${H}">
      <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="14" fill="#cfe6f5" stroke="#2a201c" stroke-width="2.5"/>
      ${LAND.map((d) => `<path d="${d}" fill="#e8d4b8" stroke="#2a201c" stroke-width="2"/>`).join('')}
      <polyline points="${pts}" fill="none" stroke="#d9562e" stroke-width="2.5" stroke-dasharray="5 6" stroke-linecap="round"/>
      ${pins}</svg>`;
    this.sheet.body.innerHTML = svg + this.details();
  }

  private details(): string {
    const p = this.ctx.save.profile;
    const tour = WORLD_TOUR.find((c) => c.id === this.selected)!;
    if (!tour.playable) {
      return `<div class="wr-row"><div class="grow"><b>${esc(tour.name)}</b><small>Coming soon. Duke's cousins are getting ready.</small></div></div>`;
    }
    const id = tour.id as CityId;
    const c = CITIES[id];
    const dogs = c.dogs.pups.map((d) => DOGS[d].name).join(' and ');
    const loot = c.loot
      .filter((l) => l.rarity >= 2)
      .slice(0, 4)
      .map((l) => `<span class="wr-chip" style="border-color:${hex(RARITIES[l.rarity].color)}">${esc(l.name)}</span>`)
      .join(' ');
    let html = `<div class="wr-city">
      <div class="wr-row"><div class="grow"><b>${esc(c.name)}</b><small>${esc(c.map.mood)}</small></div>
        <span class="wr-swatch" style="background:linear-gradient(135deg, ${hex(c.palette.skyTop)} 50%, ${hex(c.palette.skyHorizon)} 50%)"></span></div>
      <p class="wr-note">Local dogs: ${esc(dogs)} · Hazards: ${esc(c.map.hazard)} · Shortcut: ${esc(c.map.shortcut)} · Music: ${esc(c.map.musicName)}</p>
      <p class="wr-note">Loot to find: ${loot}</p>`;
    if (c.districts) html += `<p class="wr-note">Districts: ${c.districts.map((d) => esc(d.name)).join(' > ')}</p>`;
    const extras: string[] = [];
    if (c.outfitSet) extras.push(`Outfit set <b>${esc(c.outfitSet.name)}</b> (${c.outfitSet.pieces.map((a) => esc(ACCESSORIES[a].name)).join(', ')}): +${Math.round(c.outfitSet.bonus * 100)}% coins here`);
    const set = SETS.find((s) => 'city' in s && s.city === id);
    if (set && 'cityBonus' in set) extras.push(`Collection <b>${esc(set.name)}</b>: +${Math.round(set.cityBonus * 100)}% coins here`);
    if (c.powerVariant) extras.push(`Local power-up: <b>${esc(c.powerVariant.name)}</b>`);
    if (extras.length) html += `<p class="wr-note">${extras.join(' · ')}</p>`;
    if (p.city === id) html += `<p class="wr-note"><b>You are here.</b> Your runs happen in ${esc(c.name)}.</p>`;
    else if (isUnlocked(p, id)) html += `<button class="wr-btn wr-btn-main" data-travel="${id}">Travel to ${esc(c.name)}</button>`;
    else {
      html += `<p class="wr-note">Unlock with any one of these:</p>`;
      for (const o of unlockOptions(p, id)) {
        const label = o.method === 'distance' ? `Run ${o.need} m (best ${o.have} m)` : o.method === 'coins' ? `Pay ${o.need} ${ICON.coin}` : `Pay ${o.need} ${ICON.bone}`;
        html += `<button class="wr-btn" style="margin:4px 4px 0 0" data-unlock="${o.method}" ${o.ok ? '' : 'disabled'}>${label}</button>`;
      }
    }
    return html + '</div>';
  }

  private readonly onClick = (e: Event): void => {
    const t = e.target as Element;
    const pin = t.closest('.wr-pin') as SVGGElement | null;
    const btn = t.closest('button') as HTMLButtonElement | null;
    const p = this.ctx.save.profile;
    if (pin?.dataset.city) {
      this.selected = pin.dataset.city;
    } else if (btn?.dataset.travel) {
      const id = btn.dataset.travel as CityId;
      if (travel(p, id)) {
        this.ctx.save.write();
        this.onTravel(id);
        this.ctx.reward(`Welcome to ${CITIES[id].name}!`, ['Your next run starts here.', `Local loot sells at Old Tom's too.`]);
      }
    } else if (btn?.dataset.unlock) {
      const id = this.selected as CityId;
      if (unlockCity(p, id, btn.dataset.unlock as UnlockMethod)) {
        this.ctx.save.write();
        this.ctx.sound('stamp');
        this.ctx.reward(`${CITIES[id].name} unlocked!`, ['Tap Travel to go there.']);
      }
    } else return;
    this.ctx.refresh();
    this.render();
  };
}

export const LOOT_COUNT = LOOT_ITEMS.length;
