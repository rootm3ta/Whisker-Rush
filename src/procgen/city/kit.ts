import type * as THREE from 'three';
import type { Rng } from '../../core/Rng';

/** One kind of instanced street prop in a city kit. */
export interface PropSpec {
  geometry: () => THREE.BufferGeometry;
  /** 'vc' = vertex colors, 'plain' = white tinted per instance, number = flat toon color, or a custom material (signs, screens). */
  material: 'vc' | 'plain' | number | (() => THREE.Material);
  /** Max instances per 40 m chunk. */
  capacity: number;
}

/** What a kit's layout function gets for one chunk. Coordinates: z from 0 to -length. */
export interface LayoutCtx {
  rng: Rng;
  length: number;
  /** Chunk index along the track (for alternating patterns). */
  index: number;
  /** District index of this chunk (0 if the city has none). */
  district: number;
  /** A seasonal festival is on (decorations). */
  festival: boolean;
  put(key: string, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry: number, color?: number): void;
}

/**
 * A city's look: the street ground, instanced roadside props with their layout,
 * obstacle meshes and the boss vehicle. Pairs with the city's data file.
 */
export interface CityKit {
  street(): THREE.BufferGeometry;
  props: Record<string, PropSpec>;
  layout(ctx: LayoutCtx): void;
  obstacles: Record<string, () => THREE.BufferGeometry>;
  bossVehicle: () => THREE.BufferGeometry;
}
