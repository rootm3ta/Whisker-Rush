/** Procedural audio (GAME_DESIGN 10). Notes are scientific pitch names. */
export const MUSIC = {
  mapleLane: {
    bpm: 104,
    homeBpm: 92,
    /** I - vi - IV - V in C, one bar each. */
    chords: [
      ['C4', 'E4', 'G4', 'B4'],
      ['A3', 'C4', 'E4', 'G4'],
      ['F3', 'A3', 'C4', 'E4'],
      ['G3', 'B3', 'D4', 'F4'],
    ],
    bass: ['C2', 'A1', 'F1', 'G1'],
    /** Pentatonic pool for the generated lead melody. */
    leadScale: ['C5', 'D5', 'E5', 'G5', 'A5', 'C6'],
    seed: 104,
  },
  /** Stems fade in as run speed passes these thresholds (m/s). */
  stems: { drums: 0, bass: 14, lead: 18 },
  volumes: { chords: -18, drums: -14, bass: -16, lead: -20, master: -4 },
  /** Lowpass cutoff (Hz) while a power-up is active, and normally. */
  filter: { open: 18000, powerUp: 900 },
  /** Catnip pitches the whole mix up (cents). */
  catnipDetune: 200,
  fadeSec: 1.2,
} as const;

export const SFX = {
  /** Coin pings climb this pentatonic ladder with the streak. */
  coinScale: ['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7', 'G7', 'A7'],
  coinStreakStep: 2,
  volumes: { coin: -14, mrrp: -12, hiss: -10, bark: -8, whoosh: -14, pop: -10, register: -10, thud: -10, crash: -6, stamp: -12, tick: -22 },
} as const;
