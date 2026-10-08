/** Tbilisi's Street Pals (friendly ear-tagged street dogs that slow Duke down). */
export const STREET_PALS = {
  /** First chance after this many metres, then every `everyM` metres a `chance` roll. */
  firstAtM: 350,
  everyM: [600, 1100] as const,
  chance: 0.7,
  /** How long the pack is held back (the spec's 5 s chase delay). */
  delaySec: 5,
  /** The pals hang around a moment longer than the delay. */
  extraSec: 1,
  stayM: 60,
  seed: 909,
} as const;
