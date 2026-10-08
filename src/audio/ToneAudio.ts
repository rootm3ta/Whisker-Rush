import * as Tone from 'tone';
import { Rng } from '../core/Rng';
import { MUSIC, SFX } from '../data/audio';
import type { MusicTheme } from '../data/cities';

export type SfxId = keyof typeof SFX.volumes;
export type MusicMode = 'off' | 'home' | 'run';

/**
 * City music from a MusicTheme: chords, drums, bass and a generated pentatonic lead.
 * Stems fade in with speed; a lowpass closes during power-ups; Catnip detunes everything up.
 * Maple Lane is lo-fi FM piano; Rome swings with accordion and tremolo mandolin.
 */
class MusicDirector {
  private readonly master = new Tone.Volume(MUSIC.volumes.master);
  private readonly filter = new Tone.Filter(MUSIC.filter.open, 'lowpass');
  private readonly vol = {
    chords: new Tone.Volume(MUSIC.volumes.chords),
    drums: new Tone.Volume(-60),
    bass: new Tone.Volume(-60),
    lead: new Tone.Volume(-60),
  };
  private readonly piano = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 2,
    modulationIndex: 1.5,
    envelope: { attack: 0.02, decay: 0.6, sustain: 0.25, release: 1.2 },
    modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.5 },
  });
  private readonly accordion = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'fatsawtooth', count: 2, spread: 14 },
    envelope: { attack: 0.04, decay: 0.2, sustain: 0.7, release: 0.25 },
  });
  private readonly vibrato = new Tone.Vibrato(5.5, 0.08);
  private readonly kick = new Tone.MembraneSynth({ pitchDecay: 0.03, octaves: 5, envelope: { attack: 0.001, decay: 0.3, sustain: 0 } });
  private readonly snare = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.14, sustain: 0 } });
  private readonly hat = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.035, sustain: 0 } });
  private readonly hatFilter = new Tone.Filter(7000, 'highpass');
  private readonly bass = new Tone.MonoSynth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.25, sustain: 0.4, release: 0.2 }, filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, baseFrequency: 200, octaves: 2 } });
  private readonly square = new Tone.Synth({ oscillator: { type: 'square8' }, envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.25 } });
  private readonly mandolin = new Tone.PluckSynth({ attackNoise: 1.2, dampening: 4200, resonance: 0.93 });
  /** Home lo-fi layer: its own bus so it can crossfade against the run stems. */
  private readonly homeBus = new Tone.Volume(-60);
  private readonly softKick = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 3, envelope: { attack: 0.002, decay: 0.35, sustain: 0 } });
  private readonly rim = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.001, decay: 0.06, sustain: 0 } });
  private readonly rimFilter = new Tone.Filter(1800, 'bandpass');
  private readonly crackle = new Tone.Noise('brown');
  private readonly crackleFilter = new Tone.Filter(2500, 'highpass');
  private readonly crackleVol = new Tone.Volume(-60);
  /** Home layer keeps playing until the crossfade into the run has finished. */
  private homeUntil = 0;
  private theme: MusicTheme | null = null;
  private chordsList: string[][] = [];
  private chordTops: string[][] = [];
  private melody: (string | null)[] = [];
  private step = 0;
  private mode: MusicMode = 'off';
  private readonly loop: Tone.Loop;

  constructor() {
    this.master.toDestination();
    this.filter.connect(this.master);
    for (const v of Object.values(this.vol)) v.connect(this.filter);
    this.piano.connect(this.vol.chords);
    this.accordion.connect(this.vibrato);
    this.vibrato.connect(this.vol.chords);
    this.kick.connect(this.vol.drums);
    this.snare.connect(this.vol.drums);
    this.hat.connect(this.hatFilter);
    this.hatFilter.connect(this.vol.drums);
    this.bass.connect(this.vol.bass);
    this.square.connect(this.vol.lead);
    this.mandolin.connect(this.vol.lead);
    this.homeBus.connect(this.master);
    this.softKick.connect(this.homeBus);
    this.rim.connect(this.rimFilter);
    this.rimFilter.connect(this.homeBus);
    this.crackle.connect(this.crackleFilter);
    this.crackleFilter.connect(this.crackleVol);
    this.crackleVol.connect(this.master);
    this.loop = new Tone.Loop((time) => this.tick(time), '16n');
  }

  setTheme(theme: MusicTheme): void {
    if (theme === this.theme) return;
    this.theme = theme;
    this.chordsList = theme.chords.map((c) => [...c]);
    this.chordTops = this.chordsList.map((c) => c.slice(1));
    // A 4-bar pentatonic melody, seeded so a city always sounds like itself.
    const rng = new Rng(theme.seed);
    this.melody = [];
    for (let i = 0; i < 64; i++) this.melody.push(i % 2 === 0 && rng.next() < 0.6 ? rng.pick(theme.leadScale) : null);
    this.applyGroove();
    if (this.mode !== 'off') Tone.getTransport().bpm.rampTo(this.mode === 'home' ? theme.homeBpm : theme.bpm, 0.5);
  }

  /** Lazy 16th swing at home, the city's own groove in runs. */
  private applyGroove(): void {
    const t = Tone.getTransport();
    if (this.mode === 'home') {
      t.swing = MUSIC.home.swing;
      t.swingSubdivision = '16n';
    } else if (this.theme) {
      t.swing = this.theme.swing;
      t.swingSubdivision = '8n';
    }
  }

  private tick(time: number): void {
    const th = this.theme;
    if (!th) return;
    const s = this.step++;
    const bar = Math.floor(s / 16) % this.chordsList.length;
    const beat = s % 16;
    const pad = th.pad === 'accordion' ? this.accordion : this.piano;
    const swing = th.groove === 'swing';
    if (swing) {
      // Oom-pah: bass on the beat, accordion stabs on the off-beats.
      if (beat === 4 || beat === 12) pad.triggerAttackRelease(this.chordsList[bar], '8n', time, 0.45);
    } else {
      if (beat === 0) pad.triggerAttackRelease(this.chordsList[bar], '1m', time, 0.5);
      if (beat === 10) pad.triggerAttackRelease(this.chordTops[bar], '8n', time, 0.25);
    }
    if (this.mode === 'home' || time < this.homeUntil) {
      // Lo-fi: soft kick on 1 and the "and" of 3, rim on 2 and 4, a ghost rim before the bar.
      if (beat === 0 || beat === 10) this.softKick.triggerAttackRelease('A1', '8n', time, 0.55);
      if (beat === 4 || beat === 12) this.rim.triggerAttackRelease('32n', time, 0.5);
      if (beat === 15) this.rim.triggerAttackRelease('32n', time, 0.18);
      if (beat === 0 && th.bass[bar]) this.bass.triggerAttackRelease(th.bass[bar], '2n', time, 0.35);
      if (this.mode === 'home') return;
    }
    if (swing) {
      if (beat === 0 || beat === 8) this.kick.triggerAttackRelease('C1', '8n', time, 0.7);
      if (beat === 4 || beat === 12) this.snare.triggerAttackRelease('32n', time, 0.35);
      if (beat % 4 === 2) this.hat.triggerAttackRelease('32n', time, 0.35);
      if (beat === 0 || beat === 8) this.bass.triggerAttackRelease(th.bass[bar], '8n', time, 0.8);
    } else {
      if (beat === 0 || beat === 7 || beat === 10) this.kick.triggerAttackRelease('C1', '8n', time, 0.8);
      if (beat === 4 || beat === 12) this.snare.triggerAttackRelease('16n', time, 0.6);
      if (beat % 2 === 0) this.hat.triggerAttackRelease('32n', time, beat % 4 === 0 ? 0.5 : 0.3);
      if (beat === 0 || beat === 6 || beat === 8 || beat === 14) this.bass.triggerAttackRelease(th.bass[bar], '8n', time, 0.8);
    }
    const note = this.melody[s % 64];
    if (!note) return;
    if (th.lead === 'mandolin') {
      // Tremolo picking: quick repeated plucks.
      const step = Tone.Time('32n').toSeconds();
      for (let k = 0; k < 3; k++) this.mandolin.triggerAttack(note, time + k * step);
    } else {
      this.square.triggerAttackRelease(note, '16n', time, 0.6);
    }
  }

  setMode(mode: MusicMode): void {
    if (mode === this.mode) return;
    const prev = this.mode;
    this.mode = mode;
    const t = Tone.getTransport();
    const H = MUSIC.home;
    if (mode === 'off') {
      this.master.volume.rampTo(-60, 0.4);
      this.crackleVol.volume.rampTo(-60, 0.4);
      return;
    }
    // Home to run crossfades (tempo, filter, lo-fi layer out, stems in); anything else is a quick fade.
    const xfade = prev === 'home' && mode === 'run' ? H.xfadeSec : 0.5;
    const th = this.theme;
    if (th) t.bpm.rampTo(mode === 'home' ? th.homeBpm : th.bpm, xfade);
    this.applyGroove();
    this.master.volume.rampTo(MUSIC.volumes.master, 0.4);
    if (t.state !== 'started') {
      this.loop.start(0);
      t.start();
    }
    if (this.crackle.state !== 'started') this.crackle.start();
    if (mode === 'home') {
      this.homeUntil = 0;
      this.homeBus.volume.rampTo(H.layer, 0.6);
      this.crackleVol.volume.rampTo(H.crackle, 0.6);
      this.setStems(0, false, false);
    } else {
      this.homeUntil = Tone.now() + xfade;
      this.homeBus.volume.rampTo(-60, xfade);
      this.crackleVol.volume.rampTo(-60, xfade);
      this.filter.frequency.rampTo(MUSIC.filter.open, xfade);
    }
  }

  /** Stems build with speed (drums > bass > lead). */
  setStems(speed: number, powerUp: boolean, catnip: boolean): void {
    const run = this.mode === 'run';
    const S = MUSIC.stems;
    const f = MUSIC.fadeSec;
    this.vol.drums.volume.rampTo(run && speed >= S.drums ? MUSIC.volumes.drums : -60, f);
    this.vol.bass.volume.rampTo(run && speed >= S.bass ? MUSIC.volumes.bass : -60, f);
    this.vol.lead.volume.rampTo(run && speed >= S.lead ? MUSIC.volumes.lead : -60, f);
    this.filter.frequency.rampTo(!run ? MUSIC.home.filter : powerUp ? MUSIC.filter.powerUp : MUSIC.filter.open, run ? 0.4 : 0.6);
    const cents = catnip ? MUSIC.catnipDetune : 0;
    this.piano.set({ detune: cents });
    this.accordion.set({ detune: cents });
    this.bass.detune.rampTo(cents, 0.3);
    this.square.detune.rampTo(cents, 0.3);
  }
}

/** Synthesized SFX bank. All voices are built once and reused. */
class SfxBank {
  private readonly out = new Tone.Volume(0).toDestination();
  private readonly ping = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.12, sustain: 0, release: 0.08 } });
  private readonly blip = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.05 } });
  private readonly noise = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.12, sustain: 0 } });
  private readonly bandpass = new Tone.Filter(900, 'bandpass');
  private readonly hissNoise = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.02, decay: 0.35, sustain: 0 } });
  private readonly hiPass = new Tone.Filter(3000, 'highpass');
  private readonly barkSynth = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.005, decay: 0.12, sustain: 0, release: 0.05 } });
  private readonly f1 = new Tone.Filter(700, 'bandpass');
  private readonly f2 = new Tone.Filter(1250, 'bandpass');
  private readonly whooshNoise = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.05, decay: 0.25, sustain: 0 } });
  private readonly sweep = new Tone.Filter(400, 'bandpass');
  private readonly bell = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.4, release: 0.1 }, harmonicity: 5.1, modulationIndex: 16, resonance: 3000, octaves: 1.2 });
  private readonly thud = new Tone.MembraneSynth({ pitchDecay: 0.04, octaves: 4, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } });
  private readonly vols = new Map<SfxId, Tone.Volume>();
  /** Voices are shared, so start times must strictly increase. */
  private lastT = 0;

  constructor() {
    const v = (id: SfxId) => {
      const vol = new Tone.Volume(SFX.volumes[id]).connect(this.out);
      this.vols.set(id, vol);
      return vol;
    };
    this.ping.connect(v('coin'));
    this.blip.connect(v('pop'));
    this.noise.connect(this.bandpass);
    this.bandpass.connect(v('mrrp'));
    this.hissNoise.connect(this.hiPass);
    this.hiPass.connect(v('hiss'));
    this.barkSynth.fan(this.f1, this.f2);
    const bark = v('bark');
    this.f1.connect(bark);
    this.f2.connect(bark);
    this.whooshNoise.connect(this.sweep);
    this.sweep.connect(v('whoosh'));
    this.bell.connect(v('register'));
    this.thud.connect(v('thud'));
    v('crash');
    v('stamp');
    v('tick');
  }

  play(id: SfxId, n = 0): void {
    const t = Math.max(Tone.now(), this.lastT + 0.012);
    this.lastT = t + (id === 'bark' ? 0.18 : id === 'register' ? 0.15 : 0);
    switch (id) {
      case 'coin': {
        const scale = SFX.coinScale;
        this.ping.triggerAttackRelease(scale[Math.min(scale.length - 1, Math.floor(n / SFX.coinStreakStep))], '32n', t);
        break;
      }
      case 'mrrp':
        this.noise.triggerAttackRelease('32n', t, 0.5);
        this.blip.frequency.setValueAtTime(320, t);
        this.blip.frequency.exponentialRampToValueAtTime(640, t + 0.08);
        this.blip.triggerAttackRelease(320, 0.1, t, 0.5);
        break;
      case 'hiss':
        this.hissNoise.triggerAttackRelease(0.35, t);
        break;
      case 'bark':
        for (const dt of [0, 0.16]) {
          this.barkSynth.frequency.setValueAtTime(320, t + dt);
          this.barkSynth.frequency.exponentialRampToValueAtTime(170, t + dt + 0.1);
          this.barkSynth.triggerAttackRelease(320, 0.11, t + dt);
        }
        break;
      case 'whoosh':
        this.sweep.frequency.setValueAtTime(400, t);
        this.sweep.frequency.exponentialRampToValueAtTime(2400, t + 0.3);
        this.whooshNoise.triggerAttackRelease(0.3, t);
        break;
      case 'pop':
      case 'tick':
        this.blip.frequency.setValueAtTime(id === 'tick' ? 1600 : 900, t);
        this.blip.frequency.exponentialRampToValueAtTime(id === 'tick' ? 1200 : 300, t + 0.06);
        this.blip.triggerAttackRelease(900, 0.07, t, id === 'tick' ? 0.25 : 0.7);
        break;
      case 'register':
        this.bell.triggerAttackRelease('C6', '8n', t, 0.5);
        this.ping.triggerAttackRelease('E7', '32n', t + 0.08);
        this.ping.triggerAttackRelease('G7', '32n', t + 0.14);
        break;
      case 'thud':
        this.thud.triggerAttackRelease('A1', '16n', t, 0.6);
        break;
      case 'crash':
        this.thud.triggerAttackRelease('E1', '8n', t, 1);
        this.noise.triggerAttackRelease(0.3, t, 1);
        break;
      case 'stamp':
        this.thud.triggerAttackRelease('C2', '32n', t, 0.7);
        break;
    }
  }

  setEnabled(on: boolean): void {
    this.out.mute = !on;
  }
}

export interface ToneAudio {
  music: MusicDirector;
  sfx: SfxBank;
}

/** Tone runs on the context unlock.ts already created and resumed inside the user's tap. */
export async function startToneAudio(ctx: AudioContext): Promise<ToneAudio> {
  Tone.setContext(ctx, true);
  await Tone.start();
  Tone.getContext().lookAhead = 0.05;
  return { music: new MusicDirector(), sfx: new SfxBank() };
}
