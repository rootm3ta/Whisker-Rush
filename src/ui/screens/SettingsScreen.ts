import { Sheet } from '../Sheet';
import type { MetaCtx } from './ctx';
import type { AudioStatus } from '../../audio/Audio';

export interface AudioProbe {
  status(): AudioStatus;
  test(): void;
}

const STATUS_TEXT: Record<AudioStatus, string> = {
  locked: 'Locked: tap anywhere to wake the speakers',
  loading: 'Waking up...',
  playing: 'Playing',
  muted: 'Muted by settings',
  paused: 'Paused by the system: tap to resume',
};

/** Settings: sound, music, haptics, an audio status readout with a test button, and a guarded progress reset. */
export class SettingsScreen {
  private readonly sheet: Sheet;
  private confirm = false;
  private timer = 0;

  constructor(
    private readonly ctx: MetaCtx,
    private readonly onReset: () => void,
    private readonly onReplay: () => void,
    private readonly audio: AudioProbe,
    private readonly onTour: () => void,
  ) {
    this.sheet = new Sheet(ctx.host, 'Settings');
    this.sheet.body.addEventListener('click', this.onClick);
    this.sheet.onClose = () => window.clearInterval(this.timer);
  }

  open(): void {
    this.confirm = false;
    this.render();
    this.sheet.open();
    window.clearInterval(this.timer);
    this.timer = window.setInterval(this.updateStatus, 400);
  }

  private readonly updateStatus = (): void => {
    const el = this.sheet.body.querySelector<HTMLElement>('.wr-audio');
    if (!el) return;
    const st = this.audio.status();
    if (el.dataset.s === st) return;
    el.dataset.s = st;
    el.querySelector('small')!.textContent = STATUS_TEXT[st];
  };

  private render(): void {
    const s = this.ctx.save.profile.settings;
    const row = (k: keyof typeof s, label: string) =>
      `<div class="wr-row"><div class="grow"><b>${label}</b></div><button class="wr-toggle ${s[k] ? 'on' : ''}" data-k="${k}" aria-label="${label}"></button></div>`;
    this.sheet.body.innerHTML =
      row('music', 'Music') +
      row('sfx', 'Sound effects') +
      row('haptics', 'Haptics') +
      `<div class="wr-row wr-audio"><svg class="wr-wave" viewBox="0 0 28 20" aria-hidden="true">${[3, 9, 15, 21]
        .map((x, i) => `<rect x="${x}" y="4" width="3.5" height="12" rx="1.75" style="animation-delay:${i * -0.17}s"/>`)
        .join('')}</svg><div class="grow"><b>Audio</b><small></small></div><button class="wr-btn wr-btn-sm" data-act="test">Test sound</button></div>` +
      `<div class="wr-row"><div class="grow"><b>Replay intro</b><small>Watch the comic and tutorial again.</small></div><button class="wr-btn wr-btn-sm" data-act="replay">Replay</button></div>` +
      `<div class="wr-row"><div class="grow"><b>Home tour</b><small>Show the room tour again.</small></div><button class="wr-btn wr-btn-sm" data-act="tour">Show</button></div>` +
      `<div class="wr-row"><div class="grow"><b>Reset progress</b><small>Wipes coins, cats and everything else.</small></div>
      <button class="wr-btn wr-btn-sm" data-act="reset">${this.confirm ? 'Tap again to confirm' : 'Reset'}</button></div>`;
    this.updateStatus();
  }

  private readonly onClick = (e: Event): void => {
    const t = (e.target as HTMLElement).closest('button');
    if (!t) return;
    const s = this.ctx.save.profile.settings;
    if (t.dataset.k) {
      const k = t.dataset.k as keyof typeof s;
      s[k] = !s[k];
      this.ctx.save.write();
      this.ctx.refresh();
    } else if (t.dataset.act === 'test') {
      this.audio.test();
      window.setTimeout(this.updateStatus, 250);
      return;
    } else if (t.dataset.act === 'tour') {
      this.sheet.close();
      this.onTour();
      return;
    } else if (t.dataset.act === 'replay') {
      this.sheet.close();
      this.onReplay();
      return;
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
