import { CHALLENGE, LOGIN, STREAK } from '../../data/economy';
import { claimLogin, loginState } from '../../meta/Calendar';
import { crateOddsPercent } from '../../meta/Economy';
import { ensureChallenges, missionTarget, missionText } from '../../meta/Missions';
import { localDay } from '../../meta/Time';
import { Sheet, esc } from '../Sheet';
import type { MetaCtx } from './ctx';

function rewardLabel(r: (typeof LOGIN)[number]): string {
  const parts: string[] = [];
  const x = r as { coins?: number; fishBones?: number; roomba?: number; zoomies?: number; crate?: number };
  if (x.coins) parts.push(`${x.coins}c`);
  if (x.fishBones) parts.push(`${x.fishBones} bone`);
  if (x.roomba) parts.push('Roomba');
  if (x.zoomies) parts.push('Zoomies');
  if (x.crate) parts.push('Crate');
  return parts.join(' + ');
}

/** Fridge calendar: 7-day login rewards, streak, daily challenges and crate odds. */
export class CalendarScreen {
  private readonly sheet: Sheet;

  constructor(private readonly ctx: MetaCtx) {
    this.sheet = new Sheet(ctx.host, 'Daily');
    this.sheet.body.addEventListener('click', this.onClick);
    this.sheet.onClose = () => ctx.refresh();
  }

  open(): void {
    this.render();
    this.sheet.open();
  }

  private render(): void {
    const p = this.ctx.save.profile;
    const day = localDay(this.ctx.now());
    const s = loginState(p, day);
    ensureChallenges(p, day);
    let html = `<p class="wr-note">Log in every day. Miss one and the calendar starts over. ${STREAK.days} days in a row unlocks a sparkle trail.</p><div class="wr-calendar">`;
    LOGIN.forEach((r, i) => {
      const cls = s.canClaim && i === s.index ? 'today' : i < (s.canClaim ? s.index : s.index + 1) ? 'done' : '';
      html += `<div class="wr-day ${cls}">Day ${i + 1}<br>${esc(rewardLabel(r))}</div>`;
    });
    html += `</div>`;
    html += s.canClaim
      ? `<button class="wr-btn wr-btn-main" data-act="claim">Claim day ${s.index + 1}${s.comeback ? ' + welcome back gift' : ''}</button>`
      : `<p class="wr-note">Come back tomorrow. Streak: ${p.login.streak} day${p.login.streak === 1 ? '' : 's'}.</p>`;
    html += `<h3 class="wr-note" style="opacity:1;font-weight:800">Daily challenges (${CHALLENGE.fishBones} Fish Bone each)</h3>`;
    for (const c of p.challenges.list) {
      const target = missionTarget(c.id, 0);
      html += `<div class="wr-row"><div class="grow"><b>${c.done ? 'Done: ' : ''}${esc(missionText(c.id, 0))}</b>
        <div class="wr-bar"><u style="width:${Math.min(100, (c.progress / target) * 100)}%"></u></div></div></div>`;
    }
    html += `<p class="wr-note"><b>Catnip Crate odds:</b> ${crateOddsPercent().map((o) => `${esc(o.label)} ${o.percent}%`).join(' · ')}</p>`;
    this.sheet.body.innerHTML = html;
  }

  private readonly onClick = (e: Event): void => {
    const t = (e.target as HTMLElement).closest('button');
    if (t?.dataset.act !== 'claim') return;
    const lines = claimLogin(this.ctx.save.profile, localDay(this.ctx.now()), this.ctx.rng);
    if (lines) {
      this.ctx.save.write();
      this.ctx.reward('Daily reward', lines);
    }
    this.ctx.refresh();
    this.render();
  };
}
