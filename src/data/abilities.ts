/** Active abilities (GAME_DESIGN 4.5). One equipped at a time, charged by combo gains. */
export type AbilityId = 'hiss' | 'nap' | 'pounce' | 'purr';

export const ABILITIES: Record<AbilityId, { name: string; color: number }> = {
  hiss: { name: 'Hiss', color: 0xe8863a },
  nap: { name: 'Nap Time', color: 0x9fc7e8 },
  pounce: { name: 'Pounce', color: 0xd9562e },
  purr: { name: 'Purr Field', color: 0xe8a6d8 },
};

export const ABILITY = {
  default: 'pounce' as AbilityId,
  /** Combo gained (sum of combo bumps) needed for a full charge. */
  chargeNeeded: 1.2,
  hissRadius: 3.5,
  napSec: 2,
  napDodgeGrace: 1,
  pounceMeters: 30,
  pounceSec: 0.35,
  purrSec: 5,
  /** Purr auto-collect reach (x): the cat's lane plus the nearest neighbor. */
  purrReachX: 3.9,
} as const;
