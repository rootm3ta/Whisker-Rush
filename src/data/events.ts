import type { CityId } from './cities';

/** Seasonal city events: a date window, a loot multiplier and festival decorations in the kit. */
export interface SeasonalEvent {
  id: string;
  name: string;
  city: CityId;
  /** Month (0 = January) and inclusive day range. */
  month: number;
  fromDay: number;
  toDay: number;
  lootMul: number;
}

export const EVENTS: readonly SeasonalEvent[] = [
  // Tbilisoba: Tbilisi's harvest festival at the end of October (grape garlands, double loot).
  { id: 'tbilisoba', name: 'Tbilisoba Festival', city: 'tbilisi' as CityId, month: 9, fromDay: 20, toDay: 31, lootMul: 2 },
];

/** The event running in a city on a date (`?festival=1` forces it for testing). */
export function activeEvent(city: CityId, date: Date, force = false): SeasonalEvent | null {
  for (const e of EVENTS) {
    if (e.city !== city) continue;
    if (force || (date.getMonth() === e.month && date.getDate() >= e.fromDay && date.getDate() <= e.toDay)) return e;
  }
  return null;
}
