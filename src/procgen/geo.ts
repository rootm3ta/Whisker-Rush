import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const tmp = new THREE.Color();

/** Converts to non-indexed and fills a per-vertex color attribute. */
export function paint(geo: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  tmp.setHex(color);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = tmp.r;
    arr[i * 3 + 1] = tmp.g;
    arr[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Merges painted geometries into one draw call. */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts, false);
  if (!g) throw new Error('mergeGeometries failed');
  parts.forEach((p) => p.dispose());
  return g;
}

/** Horizontal strip from x0..x1 at height y, running from z=0 to z=-length. */
export function strip(x0: number, x1: number, y: number, length: number, segs: number, color: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(x1 - x0, length, 1, segs);
  g.rotateX(-Math.PI / 2);
  g.translate((x0 + x1) / 2, y, -length / 2);
  return paint(g, color);
}
