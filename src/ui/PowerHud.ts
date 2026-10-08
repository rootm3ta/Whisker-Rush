import { ABILITIES, type AbilityId } from '../data/abilities';
import { POWERUPS, POWERUP_IDS, ROOMBA, type PowerUpId } from '../data/powerups';
import type { PowerUps } from '../gameplay/PowerUps';
import { hex } from '../render/Sky';
import './powerHud.css';

export interface PowerHudActions {
  ability(): void;
  roomba(): void;
  boost(id: PowerUpId): void;
}

const ROOMBA_SVG = `<svg viewBox="0 0 24 24" class="wr-ico"><ellipse cx="12" cy="14" rx="9" ry="5" fill="#3a3f4a" stroke="#2a201c" stroke-width="1.8"/><ellipse cx="12" cy="12" rx="9" ry="5" fill="#5b6270" stroke="#2a201c" stroke-width="1.8"/><circle cx="12" cy="10.5" r="1.4" fill="#7fe0ff"/></svg>`;

function stop(e: Event): void {
  e.stopPropagation();
}

/** Power-up timers, ability charge button, Roomba button, start boosts, Daily Hunt letters and banner. */
export class PowerHud {
  private readonly root: HTMLDivElement;
  private readonly tags: HTMLElement[] = [];
  private readonly bars: HTMLElement[] = [];
  private readonly roombaTag: HTMLElement;
  private readonly roombaBar: HTMLElement;
  private readonly abilityBtn: HTMLButtonElement;
  private readonly abilityLabel: HTMLElement;
  private readonly roombaBtn: HTMLButtonElement;
  private readonly roombaCount: HTMLElement;
  private readonly boosts: HTMLElement;
  private readonly hunt: HTMLElement;
  private readonly banner: HTMLElement;
  private shownCharge = -1;
  private shownBanner = '';
  private boostLeft = 0;
  private readonly barShown = new Int16Array(POWERUP_IDS.length + 1).fill(-1);

  constructor(host: HTMLElement, actions: PowerHudActions) {
    const root = document.createElement('div');
    root.className = 'wr-phud';
    root.hidden = true;
    const tags = POWERUP_IDS.map(
      (id) => `<div class="wr-ptag" hidden><i style="background:${hex(POWERUPS[id].color)}"></i><span>${POWERUPS[id].name}</span><b><u></u></b></div>`,
    ).join('');
    root.innerHTML = `
      <div class="wr-ptags">${tags}<div class="wr-ptag wr-roomba-tag" hidden><i style="background:${hex(ROOMBA.light)}"></i><span>Roomba</span><b><u></u></b></div></div>
      <div class="wr-hunt"></div>
      <div class="wr-banner"></div>
      <div class="wr-boosts" hidden>
        <button class="wr-btn wr-boost" data-id="zoomies"></button>
        <button class="wr-btn wr-boost" data-id="fishRocket"></button>
      </div>
      <button class="wr-btn wr-roomba">${ROOMBA_SVG}<span class="wr-roomba-n">0</span></button>
      <button class="wr-ability"><span></span></button>
      <div class="wr-speedlines"></div>`;
    host.appendChild(root);
    this.root = root;
    root.querySelectorAll<HTMLElement>('.wr-ptag').forEach((el, i) => {
      if (i < POWERUP_IDS.length) {
        this.tags.push(el);
        this.bars.push(el.querySelector('u')!);
      }
    });
    this.roombaTag = root.querySelector('.wr-roomba-tag')!;
    this.roombaBar = this.roombaTag.querySelector('u')!;
    this.abilityBtn = root.querySelector('.wr-ability')!;
    this.abilityLabel = this.abilityBtn.querySelector('span')!;
    this.roombaBtn = root.querySelector('.wr-roomba')!;
    this.roombaCount = root.querySelector('.wr-roomba-n')!;
    this.boosts = root.querySelector('.wr-boosts')!;
    this.hunt = root.querySelector('.wr-hunt')!;
    this.banner = root.querySelector('.wr-banner')!;

    for (const el of [this.abilityBtn, this.roombaBtn, this.boosts]) el.addEventListener('pointerdown', stop);
    this.abilityBtn.addEventListener('click', () => actions.ability());
    this.roombaBtn.addEventListener('click', () => actions.roomba());
    this.boosts.querySelectorAll<HTMLButtonElement>('.wr-boost').forEach((b) =>
      b.addEventListener('click', () => {
        actions.boost(b.dataset.id as PowerUpId);
        this.hideBoosts();
      }),
    );
  }

  set visible(v: boolean) {
    this.root.hidden = !v;
  }

  setAbility(id: AbilityId): void {
    this.abilityLabel.textContent = ABILITIES[id].name;
    this.abilityBtn.style.setProperty('--ab', hex(ABILITIES[id].color));
    this.shownCharge = -1;
  }

  setRoombaCount(n: number): void {
    this.roombaCount.textContent = String(n);
    this.roombaBtn.disabled = n <= 0;
  }

  showBoosts(zoomies: number, rocket: number, sec: number): void {
    const [z, r] = this.boosts.querySelectorAll<HTMLButtonElement>('.wr-boost');
    z.textContent = `${POWERUPS.zoomies.name} x${zoomies}`;
    r.textContent = `${POWERUPS.fishRocket.name} x${rocket}`;
    z.hidden = zoomies <= 0;
    r.hidden = rocket <= 0;
    this.boosts.hidden = zoomies <= 0 && rocket <= 0;
    this.boostLeft = sec;
  }

  hideBoosts(): void {
    this.boosts.hidden = true;
    this.boostLeft = 0;
  }

  setHunt(word: string, found: readonly number[]): void {
    let html = '';
    for (let i = 0; i < word.length; i++) html += `<span class="${found.includes(i) ? 'on' : ''}">${word[i]}</span>`;
    this.hunt.innerHTML = html;
  }

  setBanner(text: string): void {
    if (text === this.shownBanner) return;
    this.shownBanner = text;
    this.banner.textContent = text;
    this.banner.classList.toggle('on', text !== '');
  }

  setSpeedLines(on: boolean): void {
    this.root.classList.toggle('wr-fast', on);
  }

  /** Writes a bar only when it moves by 1%, so steady frames allocate nothing. */
  private setBar(i: number, el: HTMLElement, v: number): void {
    const q = Math.round(v * 100);
    if (q === this.barShown[i]) return;
    this.barShown[i] = q;
    el.style.transform = `scaleX(${q / 100})`;
  }

  update(pu: PowerUps, charge: number, dt: number): void {
    for (let i = 0; i < POWERUP_IDS.length; i++) {
      const id = POWERUP_IDS[i];
      const on = pu.isOn(id);
      const tag = this.tags[i];
      if (tag.hidden === on) tag.hidden = !on;
      if (on) this.setBar(i, this.bars[i], id === 'bubble' ? 1 : pu.left[i] / (pu.full[i] || 1));
    }
    const riding = pu.riding;
    if (this.roombaTag.hidden === riding) this.roombaTag.hidden = !riding;
    if (riding) this.setBar(POWERUP_IDS.length, this.roombaBar, pu.roombaLeft / ROOMBA.duration);

    const c = Math.round(charge * 100);
    if (c !== this.shownCharge) {
      this.shownCharge = c;
      this.abilityBtn.style.setProperty('--charge', `${c}%`);
      this.abilityBtn.classList.toggle('ready', c >= 100);
    }
    if (this.boostLeft > 0) {
      this.boostLeft -= dt;
      if (this.boostLeft <= 0) this.hideBoosts();
    }
  }
}
