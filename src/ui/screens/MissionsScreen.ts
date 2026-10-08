import { MISSION_SET } from '../../data/economy';
import { ensureMissions, missionTarget, missionText } from '../../meta/Missions';
import { Sheet, esc } from '../Sheet';
import type { MetaCtx } from './ctx';

/** Mission notebook: 3 active missions; a full set adds +1 to the permanent multiplier. */
export class MissionsScreen {
  private readonly sheet: Sheet;

  constructor(private readonly ctx: MetaCtx) {
    this.sheet = new Sheet(ctx.host, 'Missions');
  }

  open(): void {
    const p = this.ctx.save.profile;
    ensureMissions(p);
    const set = p.missions.set;
    let html = `<p class="wr-note">Set ${set + 1} · Score multiplier <b>x${p.missions.multiplier}</b> (max x${MISSION_SET.maxMultiplier}). Finish all three for +1 and a Catnip Crate.</p>`;
    for (const m of p.missions.active) {
      const target = missionTarget(m.id, set);
      const done = m.progress >= target;
      html += `<div class="wr-row"><div class="grow"><b>${done ? 'Done: ' : ''}${esc(missionText(m.id, set))}</b>
        <div class="wr-bar"><u style="width:${Math.min(100, (m.progress / target) * 100)}%"></u></div><small>${Math.min(m.progress, target)} / ${target}</small></div></div>`;
    }
    this.sheet.body.innerHTML = html;
    this.sheet.open();
  }
}
