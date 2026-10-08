import { MAPLE_LANE } from './city/mapleLane';
import { ROME } from './city/rome';
import { TOKYO } from './city/tokyo';
import { TBILISI } from './city/tbilisi';
import type { CityDef, CityId } from './city/types';

export type { BasePalette, CityDef, CityId, MusicTheme } from './city/types';

/** Playable cities. Adding a city: one data file in data/city plus one kit in procgen/city. */
export const CITIES: Record<CityId, CityDef> = { mapleLane: MAPLE_LANE, rome: ROME, tokyo: TOKYO, tbilisi: TBILISI };

/** World Tour order, including cities that are not built yet (shown as "coming soon"). */
export const WORLD_TOUR: readonly { id: string; name: string; x: number; y: number; playable: boolean }[] = [
  { id: 'mapleLane', name: 'Maple Lane', x: MAPLE_LANE.map.x, y: MAPLE_LANE.map.y, playable: true },
  { id: 'rome', name: 'Rome', x: ROME.map.x, y: ROME.map.y, playable: true },
  { id: 'paris', name: 'Paris', x: 0.46, y: 0.3, playable: false },
  { id: 'berlin', name: 'Berlin', x: 0.56, y: 0.26, playable: false },
  { id: 'tokyo', name: 'Tokyo', x: TOKYO.map.x, y: TOKYO.map.y, playable: true },
  { id: 'tbilisi', name: 'Tbilisi', x: TBILISI.map.x, y: TBILISI.map.y, playable: true },
];

export const FOG = { near: 30, far: 140 } as const;
