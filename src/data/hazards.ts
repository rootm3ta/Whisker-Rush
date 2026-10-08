/** Moving city hazards (Rome's Vespas, falling laundry). Speeds in m/s, times in s. */
export const HAZARDS = {
  weave: {
    /** Scooters drive along at this speed (the cat is faster, so you catch up). */
    speed: 6,
    /** Time between lane changes. */
    every: [1.3, 2.4] as const,
    /** No lane changes this close to the cat (fair reaction distance, m). */
    minAhead: 14,
    laneRate: 4,
  },
  drop: {
    /** Laundry falls when the cat is this many seconds away. */
    triggerSec: 0.9,
    fallSec: 0.5,
    height: 4.2,
  },
} as const;
