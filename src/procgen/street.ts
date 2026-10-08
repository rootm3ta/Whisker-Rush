import * as THREE from 'three';
import type { MAPLE_PALETTE } from '../data/city/mapleLane';
type CityPalette = typeof MAPLE_PALETTE;
import { LANES } from '../data/runner';
import { TRACK as T } from '../data/track';
import { merge, paint, strip } from './geo';

/** One chunk of street ground (road, stripes, curbs, sidewalks, lawns) as a single geometry. */
export function buildStreetGeometry(p: CityPalette): THREE.BufferGeometry {
  const L = T.chunkLength;
  const s = T.groundSegments;
  const rh = T.roadHalfWidth;
  const cOut = rh + T.curbWidth;
  const sOut = cOut + T.sidewalkWidth;
  const ch = T.curbHeight;
  const parts: THREE.BufferGeometry[] = [strip(-rh, rh, 0, L, s, p.road)];

  for (const side of [-1, 1]) {
    const lo = (a: number, b: number) => (side < 0 ? [-b, -a] : [a, b]) as [number, number];
    parts.push(strip(...lo(rh, cOut), ch, L, s, p.curb));
    parts.push(strip(...lo(cOut, sOut), ch, L, s, p.sidewalk));
    parts.push(strip(...lo(sOut, T.lawnOuter), ch - 0.02, L, s, p.lawn));
    const face = new THREE.PlaneGeometry(L, ch, s, 1);
    face.rotateY(side < 0 ? Math.PI / 2 : -Math.PI / 2);
    face.translate(side * rh, ch / 2, -L / 2);
    parts.push(paint(face, p.curb));
  }

  const period = T.stripeDash + T.stripeGap;
  for (let i = 0; i < LANES.count - 1; i++) {
    const x = (i - (LANES.count - 2) / 2) * LANES.width;
    for (let z = 0; z + T.stripeDash <= L; z += period) {
      const d = new THREE.PlaneGeometry(T.stripeWidth, T.stripeDash);
      d.rotateX(-Math.PI / 2);
      d.translate(x, 0.01, -z - T.stripeDash / 2);
      parts.push(paint(d, p.stripe));
    }
  }
  return merge(parts);
}
