import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import type { MusicMode, SfxId, ToneAudio } from './ToneAudio';
import type { MusicTheme } from '../data/cities';
import { audioLockState, installAudioUnlock, onAudioUnlocked, resumeAudio } from './unlock';

/** What Settings shows: not yet tapped, sound running, or switched off by the player. */
export type AudioStatus = 'locked' | 'loading' | 'playing' | 'muted' | 'paused';

/**
 * Audio front door. The AudioContext is unlocked synchronously in the first tap (see unlock.ts),
 * then Tone.js loads lazily onto that context, so the game boots fast; until then every call is a no-op. Gameplay never calls this:
 * it subscribes to the event bus.
 */
export class Audio {
  private tone: ToneAudio | null = null;
  private loading = false;
  private mode: MusicMode = 'off';
  private theme: MusicTheme | null = null;
  private musicOn = true;
  private sfxOn = true;
  private streak = 0;
  private lastCoin = 0;

  constructor(bus: EventBus<GameEvents>) {
    installAudioUnlock();
    onAudioUnlocked((ctx) => this.load(ctx));
    bus.on('coin', () => {
      const now = performance.now();
      this.streak = now - this.lastCoin < 600 ? this.streak + 1 : 0;
      this.lastCoin = now;
      this.play('coin', this.streak);
    });
    bus.on('jump', () => this.play('mrrp'));
    bus.on('wallKick', () => this.play('mrrp'));
    bus.on('nearMiss', () => this.play('whoosh'));
    bus.on('laneChange', () => this.play('whoosh'));
    bus.on('land', (impact) => {
      if (impact > 12) this.play('thud');
    });
    bus.on('dukeTaunt', () => this.play('bark'));
    bus.on('packRushWarn', () => this.play('bark'));
    bus.on('ability', () => this.play('hiss'));
    bus.on('powerStart', () => this.play('pop'));
    bus.on('shieldPop', () => this.play('pop'));
    bus.on('stumble', () => this.play('thud'));
    bus.on('crash', () => this.play('crash'));
    bus.on('stunt', () => this.play('stamp'));
    bus.on('loot', () => this.play('pop'));
    bus.on('chest', () => this.play('register'));
  }

  private load(ctx: AudioContext): void {
    if (this.tone || this.loading) return;
    this.loading = true;
    void import('./ToneAudio')
      .then((m) => m.startToneAudio(ctx))
      .then((t) => {
        this.tone = t;
        t.sfx.setEnabled(this.sfxOn);
        if (this.theme) t.music.setTheme(this.theme);
        const mode = this.mode;
        this.mode = 'off';
        this.setMode(mode);
      })
      .catch(() => {
        this.loading = false;
      });
  }

  setEnabled(music: boolean, sfx: boolean): void {
    this.musicOn = music;
    this.sfxOn = sfx;
    this.tone?.sfx.setEnabled(sfx);
    const m = this.mode;
    this.mode = 'off';
    this.setMode(m);
  }

  setMode(mode: MusicMode): void {
    const target = this.musicOn ? mode : 'off';
    this.mode = mode;
    this.tone?.music.setMode(target);
  }

  /** The city's music theme (applies now, or as soon as audio loads). */
  setTheme(theme: MusicTheme): void {
    this.theme = theme;
    this.tone?.music.setTheme(theme);
  }

  setStems(speed: number, powerUp: boolean, catnip: boolean): void {
    this.tone?.music.setStems(speed, powerUp, catnip);
  }

  status(): AudioStatus {
    const lock = audioLockState();
    if (lock === 'locked') return 'locked';
    if (!this.tone) return 'loading';
    if (!this.musicOn && !this.sfxOn) return 'muted';
    return lock === 'running' ? 'playing' : 'paused';
  }

  /** Settings "Test sound": runs inside the button's click, so it can also unlock or resume. */
  test(): void {
    resumeAudio();
    this.tone?.sfx.play('register', 0);
  }

  play(id: SfxId, n = 0): void {
    if (this.sfxOn) this.tone?.sfx.play(id, n);
  }
}
