import * as THREE from 'three';
import type { MAPLE_PALETTE } from '../data/city/mapleLane';
type CityPalette = typeof MAPLE_PALETTE;
import { TRACK as T } from '../data/track';
import { merge, paint } from './geo';

/** Unit box with its base at y=0. Scaled per instance. */
export function unitBoxBase(): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1);
  g.translate(0, 0.5, 0);
  return g;
}

/** Gable roof prism: base width 1 (x), height 1 (y), length 1 (z), base at y=0. */
export function roofGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0);
  s.lineTo(0.5, 0);
  s.lineTo(0, 1);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
}

/** Thin facade panel (windows, doors), thin along x, centred. */
export function facadeGeometry(): THREE.BufferGeometry {
  return new THREE.BoxGeometry(0.12, 1, 1);
}

/** Picket fence section running from z=0 to z=-sectionLength. */
export function fenceGeometry(p: CityPalette): THREE.BufferGeometry {
  const L = T.fence.sectionLength;
  const h = T.fence.height;
  const parts: THREE.BufferGeometry[] = [];
  for (const y of [h * 0.35, h * 0.75]) {
    const r = new THREE.BoxGeometry(0.06, 0.08, L);
    r.translate(0, y, -L / 2);
    parts.push(paint(r, p.fence));
  }
  const pickets = 4;
  for (let i = 0; i < pickets; i++) {
    const k = new THREE.BoxGeometry(0.08, h, 0.13);
    k.translate(0.04, h / 2, -(i + 0.5) * (L / pickets));
    parts.push(paint(k, p.fence));
  }
  return merge(parts);
}

/** Street lamp with arm pointing +x (toward the road for left-side lamps). */
export function lampGeometry(p: CityPalette): THREE.BufferGeometry {
  const h = T.lamp.height;
  const post = new THREE.CylinderGeometry(0.07, 0.1, h, 6);
  post.translate(0, h / 2, 0);
  const arm = new THREE.BoxGeometry(0.9, 0.06, 0.06);
  arm.translate(0.45, h - 0.05, 0);
  const head = new THREE.BoxGeometry(0.42, 0.16, 0.3);
  head.translate(0.85, h - 0.14, 0);
  return merge([paint(post, p.lampPost), paint(arm, p.lampPost), paint(head, p.lampHead)]);
}

export function trunkGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.11, 0.16, 1, 6);
  g.translate(0, 0.5, 0);
  return g;
}

/** Low-poly crown with faceted (flat) normals. */
export function crownGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.5, 0);
  g.computeVertexNormals();
  return g;
}
