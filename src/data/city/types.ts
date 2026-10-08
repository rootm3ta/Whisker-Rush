import type { DogDef } from '../dogs';
import type { ObstacleDef } from '../obstacles';
import type { Pattern } from '../patterns';
import type { LootItem } from '../pickups';
import type { PowerUpId } from '../powerups';

export type CityId = 'mapleLane' | 'rome' | 'tokyo';

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
  pad: 'fmPiano' | 'accordion' | 'synthPad' | 'choir';
  lead: 'square' | 'mandolin' | 'koto' | 'panduri';
  /** Kick/snare/hat pattern style. */
  groove: 'lofi' | 'swing' | 'citypop' | 'doli';
  /** Pad used in night districts (e.g. Tokyo's Neon Night). */
  nightPad?: 'fmPiano' | 'accordion' | 'synthPad' | 'choir';
  /** A two-note motif played every 8 bars (Tokyo's crossing chime). */
  motif?: readonly [string, string];
  /** Faster dance section at high run speed (Tbilisi). */
  fastBpm?: number;
}

/** A district: the city's look changes every 1000 m (ZONE.lengthM), cycling through these. */
export interface DistrictDef {
  name: string;
  /** Palette overrides (sky, fog, light, road...) for this district. */
  palette?: Partial<BasePalette>;
  /** Night district: music swaps to the night pad. */
  night?: boolean;
  /** Road bends sideways here (Tbilisi's Bridge of Peace). Multiplies the curved-world side bend. */
  curveSide?: number;
  /** Ambient particles while in this district. */
  particles?: 'petals' | 'steam' | 'leaves';
}

/** City-flavoured power-up (a reskin with a small twist). */
export interface PowerVariant {
  /** Which power-up it replaces. */
  of: PowerUpId;
  name: string;
  /** Extra loot dropped ahead when it starts. */
  bonusLoot?: number;
  /** Sound when it starts. */
  sfx?: 'toast' | 'register' | 'pop';
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
  /** Optional per-district looks (same order as `zones`). */
  districts?: readonly DistrictDef[];
  /** Daily Hunt words while this city is selected. */
  huntWords?: readonly string[];
  /** Ambient sounds played now and then during runs. */
  ambience?: readonly ('crossingChime' | 'crowCaw' | 'trainChime' | 'crowd' | 'river' | 'churchBells' | 'horn' | 'cableHum')[];
  /** Secret Alley theme (name stamped on entry and fog colour). */
  alley?: { name: string; fog: number };
  powerVariant?: PowerVariant;
  /** Outfit set: wear all pieces in this city for a coin bonus. */
  outfitSet?: { name: string; pieces: readonly string[]; bonus: number };
  /** Loading card illustration (inline SVG) shown when travelling here. */
  card?: string;
  /** Postcard comic panel (inline SVG + caption) unlocked by 5 postcard fragments. */
  postcard?: { title: string; caption: string; svg: string };
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
