/** Procedural audio (GAME_DESIGN 10). Notes are scientific pitch names. */
export const MUSIC = {
  /** Stems fade in as run speed passes these thresholds (m/s). */
  stems: { drums: 0, bass: 14, lead: 18 },
  volumes: { chords: -18, drums: -14, bass: -16, lead: -20, master: -4 },
  /** Lowpass cutoff (Hz) while a power-up is active, and normally. */
  filter: { open: 18000, powerUp: 900 },
  /** Catnip pitches the whole mix up (cents). */
  catnipDetune: 200,
  fadeSec: 1.2,
  /**
   * Home: a lo-fi take on the city theme at the city's homeBpm (85 to 95): chords through a warm
   * lowpass, lazy 16th swing, soft kick and rim, vinyl crackle. Crossfades into the run theme.
   */
  home: { filter: 1500, swing: 0.28, layer: -9, crackle: -40, xfadeSec: 1.6 },
} as const;

export const SFX = {
  /** Coin pings climb this pentatonic ladder with the streak. */
  coinScale: ['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7', 'G7', 'A7'],
  coinStreakStep: 2,
  volumes: { coin: -14, mrrp: -12, hiss: -10, bark: -8, whoosh: -14, pop: -10, register: -10, thud: -10, crash: -6, stamp: -12, tick: -22, chatter: -14 },
} as const;
