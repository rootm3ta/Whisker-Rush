import * as THREE from 'three';
import { OBSTACLE_COLORS as K, type ObstacleId } from '../data/obstacles';
import { merge, paint } from './geo';

/** Places a primitive and paints it in one call. */
function part(g: THREE.BufferGeometry, color: number, x: number, y: number, z: number): THREE.BufferGeometry {
  g.translate(x, y, z);
  return paint(g, color);
}

function box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.BufferGeometry {
  return part(new THREE.BoxGeometry(w, h, d), color, x, y, z);
}

function cyl(r: number, h: number, color: number, x: number, y: number, z: number, seg = 10): THREE.BufferGeometry {
  return part(new THREE.CylinderGeometry(r, r, h, seg), color, x, y, z);
}

function blob(r: number, color: number, x: number, y: number, z: number, sy = 1): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, 0);
  g.scale(1, sy, 1);
  return part(g, color, x, y, z);
}

function trashCans(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.5, 0.5]) {
    parts.push(cyl(0.42, 0.92, K.can, x, 0.46, -0.5, 12));
    parts.push(cyl(0.46, 0.08, K.canLid, x, 0.96, -0.5, 12));
    parts.push(box(0.16, 0.06, 0.06, K.canLid, x, 1.03, -0.5));
  }
  return merge(parts);
}

function hedge(): THREE.BufferGeometry {
  const parts = [box(2.4, 0.7, 1.1, K.hedge, 0, 0.35, -0.6)];
  for (let i = 0; i < 4; i++) parts.push(blob(0.42, i % 2 ? K.hedge : K.hedgeDark, -0.9 + i * 0.6, 0.72, -0.6, 0.7));
  return merge(parts);
}

function bike(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.55, 0.55]) parts.push(part(new THREE.TorusGeometry(0.3, 0.05, 6, 14), K.tire, x, 0.32, -0.4));
  const bar = new THREE.BoxGeometry(1.1, 0.06, 0.06);
  bar.rotateZ(0.25);
  parts.push(part(bar, K.bikeFrame, 0, 0.45, -0.4));
  parts.push(box(0.06, 0.4, 0.06, K.bikeFrame, -0.25, 0.52, -0.4));
  parts.push(box(0.26, 0.06, 0.12, K.tire, -0.25, 0.73, -0.4));
  parts.push(box(0.06, 0.06, 0.5, K.tire, 0.45, 0.7, -0.4));
  return merge(parts);
}

function sprinkler(): THREE.BufferGeometry {
  const parts = [cyl(0.12, 0.2, K.sprinkler, 0, 0.1, -0.4)];
  for (let i = 0; i < 5; i++) {
    const a = -0.9 + i * 0.45;
    const jet = new THREE.BoxGeometry(0.06, 0.9, 0.06);
    jet.translate(0, 0.45, 0);
    jet.rotateZ(a);
    parts.push(part(jet, K.water, 0, 0.15, -0.4));
  }
  parts.push(box(2.2, 0.04, 0.5, K.water, 0, 0.02, -0.4));
  return merge(parts);
}

function gardenFence(): THREE.BufferGeometry {
  const parts = [box(2.6, 0.08, 0.06, K.fence, 0, 0.35, -0.15), box(2.6, 0.08, 0.06, K.fence, 0, 0.75, -0.15)];
  for (let i = 0; i < 9; i++) {
    parts.push(box(0.14, 0.9, 0.08, K.fence, -1.2 + i * 0.3, 0.45, -0.1));
    const tip = new THREE.ConeGeometry(0.1, 0.16, 4);
    tip.rotateY(Math.PI / 4);
    parts.push(part(tip, K.fence, -1.2 + i * 0.3, 0.98, -0.1));
  }
  return merge(parts);
}

function lowBranch(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.14, 0.2, 3.4, 7);
  g.rotateZ(Math.PI / 2 + 0.06);
  const parts = [part(g, K.branch, 0, 1.25, -0.3)];
  for (let i = 0; i < 6; i++) parts.push(blob(0.36, K.leaves[i % 3], -1.3 + i * 0.52, 1.1 + (i % 2) * 0.25, -0.3, 0.8));
  return merge(parts);
}

function laundry(): THREE.BufferGeometry {
  const parts = [cyl(0.06, 2.4, K.pole, -1.5, 1.2, -0.2, 6), cyl(0.06, 2.4, K.pole, 1.5, 1.2, -0.2, 6), box(3.0, 0.03, 0.03, K.rope, 0, 2.25, -0.2)];
  for (let i = 0; i < 3; i++) parts.push(box(0.8, 1.25, 0.04, K.sheets[i], -0.95 + i * 0.95, 1.6, -0.2));
  return merge(parts);
}

function car(): THREE.BufferGeometry {
  const L = 4.2;
  const parts = [
    box(2.0, 0.75, L, 0xffffff, 0, 0.62, -L / 2),
    box(1.75, 0.42, 2.3, 0xffffff, 0, 1.19, -L / 2 - 0.2),
    box(1.8, 0.3, 2.2, K.carGlass, 0, 1.17, -L / 2 - 0.2),
    box(1.6, 0.16, 0.06, 0xfff1c9, 0, 0.8, -0.01),
  ];
  for (const x of [-0.9, 0.9]) {
    for (const z of [-0.85, -L + 0.85]) {
      const w = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 12);
      w.rotateZ(Math.PI / 2);
      parts.push(part(w, K.tire, x, 0.34, z));
    }
  }
  return merge(parts);
}

function mailTruck(): THREE.BufferGeometry {
  const L = 6.5;
  const parts = [
    box(2.3, 2.1, L, K.truck, 0, 1.45, -L / 2),
    box(2.32, 0.28, L - 0.4, K.truckStripe, 0, 1.2, -L / 2),
    box(1.9, 0.6, 0.06, K.carGlass, 0, 1.95, -0.01),
  ];
  for (const x of [-1.0, 1.0]) {
    for (const z of [-1.1, -L + 1.1]) {
      const w = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12);
      w.rotateZ(Math.PI / 2);
      parts.push(part(w, K.tire, x, 0.42, z));
    }
  }
  return merge(parts);
}

function ramp(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(4, 0);
  s.lineTo(4, 1.4);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 2.2, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-1.1, 0, 0);
  const parts = [paint(g, K.ramp)];
  for (let i = 1; i < 4; i++) {
    const slat = new THREE.BoxGeometry(2.24, 0.04, 0.08);
    slat.rotateX(Math.atan2(1.4, 4));
    parts.push(part(slat, K.rampDark, 0, (1.4 * i) / 4 + 0.02, -i));
  }
  return merge(parts);
}

function hedgeWall(): THREE.BufferGeometry {
  const L = 10;
  const parts = [box(2.4, 2.0, L, K.hedgeDark, 0, 1.0, -L / 2)];
  for (let i = 0; i < 8; i++) parts.push(blob(0.55, i % 2 ? K.hedge : K.hedgeDark, i % 2 ? 0.5 : -0.5, 2.05, -0.6 - i * 1.2, 0.55));
  return merge(parts);
}

/** Unit-length clothesline wire along -z; poles are added by the view. */
function clothesline(): THREE.BufferGeometry {
  return merge([box(0.05, 0.05, 1, K.rope, 0, 1.5, -0.5)]);
}

export const OBSTACLE_GEOMETRY: Record<ObstacleId, () => THREE.BufferGeometry> = {
  trashCans,
  hedge,
  bike,
  sprinkler,
  gardenFence,
  lowBranch,
  laundry,
  car,
  mailTruck,
  ramp,
  hedgeWall,
  clothesline,
};

export function clotheslinePole(): THREE.BufferGeometry {
  return merge([cyl(0.06, 1.7, K.pole, 0, 0.85, 0, 6), box(0.5, 0.05, 0.05, K.pole, 0, 1.6, 0)]);
}

export function coinGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 14);
  g.rotateX(Math.PI / 2);
  return g;
}

export function lootGeometry(): THREE.BufferGeometry {
  return new THREE.OctahedronGeometry(0.28, 0);
}

export function fishBoneGeometry(color: number): THREE.BufferGeometry {
  const parts = [box(0.7, 0.06, 0.06, color, 0, 0, 0)];
  for (let i = 0; i < 4; i++) parts.push(box(0.05, 0.3 - i * 0.04, 0.05, color, -0.15 + i * 0.13, 0, 0));
  const head = new THREE.ConeGeometry(0.14, 0.22, 4);
  head.rotateZ(Math.PI / 2);
  parts.push(part(head, color, -0.42, 0, 0));
  const tail = new THREE.ConeGeometry(0.14, 0.16, 4);
  tail.rotateZ(-Math.PI / 2);
  parts.push(part(tail, color, 0.4, 0, 0));
  return merge(parts);
}

export function sockGeometry(): THREE.BufferGeometry {
  return merge([box(0.18, 0.4, 0.06, 0xffffff, 0, -0.2, 0), box(0.3, 0.16, 0.06, 0xffffff, 0.06, -0.42, 0), box(0.2, 0.08, 0.07, 0xf3ead8, 0, 0, 0)]);
}
