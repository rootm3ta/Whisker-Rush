import type * as THREE from 'three';
import type { CityId } from '../data/cities';
import type { CityKit } from './city/kit';
import { MAPLE_KIT } from './city/mapleLane';
import { ROME_KIT } from './city/rome';
import { SHARED_OBSTACLES } from './obstacles';

/** One kit per playable city. */
export const KITS: Record<CityId, CityKit> = { mapleLane: MAPLE_KIT, rome: ROME_KIT };

/** Every obstacle mesh in the game, from the shared set and each city kit. */
export const OBSTACLE_GEOMETRY: Record<string, () => THREE.BufferGeometry> = {
  ...SHARED_OBSTACLES,
  ...MAPLE_KIT.obstacles,
  ...ROME_KIT.obstacles,
};
