/**
 * iOS-safe audio unlock and lifecycle.
 *
 * - The AudioContext is created and resumed synchronously inside the first `touchend`/`click`/`keydown`
 *   (iOS ignores `pointerdown` and anything after an `await`).
 * - `navigator.audioSession.type = 'playback'` (Safari 16.4+) plus a looping silent <audio> element
 *   put the page in the media playback session, so the ringer switch no longer mutes Web Audio.
 * - The context is suspended while the page is hidden and resumed on return, after interruptions
 *   (calls, Siri) and on the next tap if iOS left it suspended.
 * Listeners use the capture phase so overlays that stop propagation (the comic) still unlock.
 */

type Ctx = AudioContext & { state: AudioContextState | 'interrupted' };

let ctx: Ctx | null = null;
let silent: HTMLAudioElement | null = null;
let unlocked = false;
let installed = false;
const waiters: ((c: AudioContext) => void)[] = [];

export type AudioLockState = 'locked' | 'running' | 'suspended';

export function audioLockState(): AudioLockState {
  if (!ctx || !unlocked) return 'locked';
  return ctx.state === 'running' ? 'running' : 'suspended';
}

/** Called once with the unlocked context (immediately if already unlocked). */
export function onAudioUnlocked(cb: (c: AudioContext) => void): void {
  if (unlocked && ctx) cb(ctx);
  else waiters.push(cb);
}

/** A tiny silent 16-bit mono WAV (0.5 s at 8 kHz), built once as a Blob URL. */
function silentUrl(): string {
  const rate = 8000;
  const samples = rate / 2;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, samples * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function setPlaybackSession(): void {
  const nav = navigator as Navigator & { audioSession?: { type: string } };
  try {
    if (nav.audioSession) nav.audioSession.type = 'playback';
  } catch {
    /* unsupported */
  }
}

function startSilent(): void {
  if (!silent) {
    silent = document.createElement('audio');
    silent.src = silentUrl();
    silent.loop = true;
    silent.setAttribute('playsinline', '');
    silent.setAttribute('x-webkit-airplay', 'deny');
    silent.preload = 'auto';
  }
  void silent.play().catch(() => undefined);
}

function resume(): void {
  if (!ctx || document.hidden) return;
  if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
  if (silent?.paused) startSilent();
}

/** Runs inside a user gesture: everything here must stay synchronous. */
function unlockAudio(): void {
  setPlaybackSession();
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC({ latencyHint: 'interactive' }) as Ctx;
    ctx.addEventListener('statechange', () => {
      if (ctx && (ctx.state === 'interrupted' || ctx.state === 'suspended') && !document.hidden) void ctx.resume().catch(() => undefined);
    });
  }
  // A one-sample buffer played in the gesture is what actually unlocks older iOS.
  const b = ctx.createBuffer(1, 1, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.connect(ctx.destination);
  src.start(0);
  void ctx.resume().catch(() => undefined);
  startSilent();
  if (!unlocked) {
    unlocked = true;
    for (const w of waiters.splice(0)) w(ctx);
  }
}

/** Bind once at boot. The first tap anywhere unlocks; later taps re-resume if iOS suspended us. */
export function installAudioUnlock(): void {
  if (installed) return;
  installed = true;
  const opts = { capture: true, passive: true } as const;
  const onGesture = () => {
    if (!unlocked) unlockAudio();
    else resume();
  };
  for (const ev of ['touchend', 'click', 'keydown'] as const) window.addEventListener(ev, onGesture, opts);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      void ctx.suspend().catch(() => undefined);
      silent?.pause();
    } else resume();
  });
  window.addEventListener('pageshow', resume);
  window.addEventListener('focus', resume);
}

/** Best-effort resume (e.g. from a "Test sound" button, which is itself a gesture). */
export function resumeAudio(): void {
  if (!unlocked) unlockAudio();
  else resume();
}
