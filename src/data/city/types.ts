import type { DogDef } from '../dogs';
import type { ObstacleDef } from '../obstacles';
import type { Pattern } from '../patterns';
import type { LootItem } from '../pickups';

export type CityId = 'mapleLane' | 'rome';

/** Colors every city needs for sky, fog, light and the road. Kits may define more. */
export interface BasePalette {
  skyTop: number;
  skyHorizon: number;
  fog: number;
  sun: number;
  hemiSky: number;
  hemiGround: number;
  road: number;
  stripe: number;
  curb: number;
  sidewalk: number;
  lawn: number;
}

/** A procedural music theme (GAME_DESIGN 10). */
export interface MusicTheme {
  bpm: number;
  homeBpm: number;
  /** One chord per bar. */
  chords: string[][];
  bass: string[];
  leadScale: string[];
  seed: number;
  /** 0 = straight, ~0.33 = triplet swing. */
  swing: number;
  /** Instrument presets the music director knows. */
  pad: 'fmPiano' | 'accordion';
  lead: 'square' | 'mandolin';
  /** Kick/snare/hat pattern style. */
  groove: 'lofi' | 'swing';
}

/**
 * Everything gameplay needs to know about a city, in one data file. Its look (street,
 * buildings, obstacle meshes, boss vehicle) comes from the matching kit in procgen/city.
 */
export interface CityDef {
  id: CityId;
  name: string;
  palette: BasePalette;
  /** District names cycled by zone (every 1000 m). */
  zones: readonly string[];
  obstacles: Record<string, ObstacleDef>;
  patterns: Pattern[];
  loot: LootItem[];
  dogs: {
    defs: Record<string, DogDef>;
    /** The two pups running with Duke; the first lunges on a stumble. */
    pups: [string, string];
    /** Who runs the Pack Rush. */
    rush: string;
  };
  boss: { vehicle: string; throwIds: readonly string[]; riderY: number; riderZ: number };
  music: MusicTheme;
  /** Unlock by distance OR coins OR Fish Bones (player's choice). Empty = always open. */
  unlock: { bestDistance?: number; coins?: number; fishBones?: number };
  /** World map pin (0..1 across the map) and blurb. */
  map: { x: number; y: number; mood: string; hazard: string; shortcut: string; musicName: string };
}
