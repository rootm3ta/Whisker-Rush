import { Sheet } from '../Sheet';
import type { MetaCtx } from './ctx';

/** Settings: sound, music, haptics and a guarded progress reset. */
export class SettingsScreen {
  private readonly sheet: Sheet;
  private confirm = false;

  constructor(
    private readonly ctx: MetaCtx,
    private readonly onReset: () => void,
  ) {
    this.sheet = new Sheet(ctx.host, 'Settings');
    this.sheet.body.addEventListener('click', this.onClick);
  }

  open(): void {
    this.confirm = false;
    this.render();
    this.sheet.open();
  }

  private render(): void {
    const s = this.ctx.save.profile.settings;
    const row = (k: keyof typeof s, label: string) =>
      `<div class="wr-row"><div class="grow"><b>${label}</b></div><button class="wr-toggle ${s[k] ? 'on' : ''}" data-k="${k}" aria-label="${label}"></button></div>`;
    this.sheet.body.innerHTML =
      row('music', 'Music') +
      row('sfx', 'Sound effects') +
      row('haptics', 'Haptics') +
      `<div class="wr-row"><div class="grow"><b>Reset progress</b><small>Wipes coins, cats and everything else.</small></div>
      <button class="wr-btn wr-btn-sm" data-act="reset">${this.confirm ? 'Tap again to confirm' : 'Reset'}</button></div>`;
  }

  private readonly onClick = (e: Event): void => {
    const t = (e.target as HTMLElement).closest('button');
    if (!t) return;
    const s = this.ctx.save.profile.settings;
    if (t.dataset.k) {
      const k = t.dataset.k as keyof typeof s;
      s[k] = !s[k];
      this.ctx.save.write();
    } else if (t.dataset.act === 'reset') {
      if (!this.confirm) this.confirm = true;
      else {
        this.onReset();
        this.sheet.close();
        return;
      }
    }
    this.render();
  };
}
