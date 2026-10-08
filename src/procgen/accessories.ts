import * as THREE from 'three';
import { ACCESSORIES, type Slot } from '../data/accessories';
import { CAT_SHAPE as S } from '../data/cat';
import { createToonMaterial } from '../render/ToonMaterial';
import type { CatRig } from './cat';

const mats = new Map<number, THREE.MeshToonMaterial>();
function m(color: number): THREE.MeshToonMaterial {
  let mat = mats.get(color);
  if (!mat) mats.set(color, (mat = createToonMaterial(color)));
  return mat;
}

function mesh(g: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const out = new THREE.Mesh(g, m(color));
  out.position.set(x, y, z);
  return out;
}

function group(...kids: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group();
  g.add(...kids);
  return g;
}

function heart(size: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -size);
  s.bezierCurveTo(size * 1.4, -size * 0.1, size * 0.7, size, 0, size * 0.45);
  s.bezierCurveTo(-size * 0.7, size, -size * 1.4, -size * 0.1, 0, -size);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false });
  g.translate(0, 0, -0.006);
  return g;
}

const R = S.headRadius;
const EYE_Y = S.eyePos[1];
const FACE_Z = S.eyePos[2] - 0.025;

/** Builders return a group in the anchor's local space. */
const BUILD: Record<string, (c: readonly number[]) => THREE.Object3D> = {
  // Head: sits between the ears.
  beret: (c) => {
    const top = mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.05, 16), c[0], 0.02, R * 0.9, 0.01);
    top.rotation.z = -0.3;
    return group(top, mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 6), c[1], 0.05, R * 0.9 + 0.045, 0));
  },
  vikingHelmet: (c) => {
    const dome = mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), c[0], 0, R * 0.62, 0);
    const horns = [-1, 1].map((sx) => {
      const h = mesh(new THREE.ConeGeometry(0.035, 0.16, 8), c[1], sx * 0.17, R * 0.85, 0);
      h.rotation.z = -sx * 0.9;
      return h;
    });
    return group(dome, ...horns);
  },
  chefHat: (c) => group(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 14), c[0], 0, R * 0.95, 0), mesh(new THREE.SphereGeometry(0.13, 12, 8), c[0], 0, R * 0.95 + 0.12, 0)),
  crown: (c) => {
    const ring = mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.07, 10, 1, true), c[0], 0, R * 0.92, 0);
    (ring.material as THREE.Material).side = THREE.DoubleSide;
    const spikes = Array.from({ length: 5 }, (_, i) => {
      const a = (i / 5) * Math.PI * 2;
      return mesh(new THREE.ConeGeometry(0.022, 0.06, 4), c[0], Math.cos(a) * 0.1, R * 0.92 + 0.06, Math.sin(a) * 0.1);
    });
    return group(ring, ...spikes, mesh(new THREE.SphereGeometry(0.018, 6, 4), c[1], 0, R * 0.92, -0.105));
  },
  bucketHat: (c) =>
    group(
      mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 16), c[0], 0, R * 0.95, 0),
      mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.015, 18), c[0], 0, R * 0.9, 0),
      mesh(new THREE.CylinderGeometry(0.141, 0.141, 0.03, 16), c[1], 0, R * 0.93, 0),
    ),
  sombrero: (c) => group(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 20), c[0], 0, R * 0.85, 0), mesh(new THREE.ConeGeometry(0.1, 0.16, 14), c[0], 0, R * 0.85 + 0.08, 0), mesh(new THREE.TorusGeometry(0.095, 0.012, 4, 14), c[1], 0, R * 0.85 + 0.02, 0)),
  // Eyes: in front of the face.
  aviators: (c) => {
    const lenses = [-1, 1].map((sx) => {
      const l = mesh(new THREE.SphereGeometry(0.05, 10, 8), c[0], sx * S.eyePos[0], EYE_Y - 0.005, FACE_Z);
      l.scale.set(1.15, 0.9, 0.25);
      return l;
    });
    return group(...lenses, mesh(new THREE.BoxGeometry(0.06, 0.008, 0.008), c[1], 0, EYE_Y + 0.025, FACE_Z));
  },
  heartGlasses: (c) => group(...[-1, 1].map((sx) => mesh(heart(0.045), c[0], sx * S.eyePos[0], EYE_Y, FACE_Z)), mesh(new THREE.BoxGeometry(0.05, 0.008, 0.008), c[1], 0, EYE_Y + 0.01, FACE_Z)),
  monocle: (c) => {
    const ring = mesh(new THREE.TorusGeometry(0.05, 0.009, 4, 16), c[0], S.eyePos[0], EYE_Y, FACE_Z);
    const glass = mesh(new THREE.CircleGeometry(0.045, 14), c[1], S.eyePos[0], EYE_Y, FACE_Z + 0.002);
    glass.rotation.y = Math.PI;
    const chain = mesh(new THREE.BoxGeometry(0.006, 0.12, 0.006), c[0], S.eyePos[0] + 0.04, EYE_Y - 0.08, FACE_Z + 0.02);
    chain.rotation.z = 0.3;
    return group(ring, glass, chain);
  },
  // Neck: around the front of the torso, under the head.
  bandana: (c) => {
    const tri = mesh(new THREE.ConeGeometry(0.15, 0.2, 3), c[0], 0, -0.02, -0.02);
    tri.rotation.x = Math.PI;
    tri.scale.z = 0.35;
    return group(tri, mesh(new THREE.TorusGeometry(0.15, 0.025, 4, 16), c[0], 0, 0.06, 0.04), mesh(new THREE.SphereGeometry(0.015, 6, 4), c[1], 0.03, 0.0, -0.06));
  },
  bellCollar: (c) => group(mesh(new THREE.TorusGeometry(0.155, 0.022, 5, 18), c[0], 0, 0.05, 0.04), mesh(new THREE.SphereGeometry(0.035, 10, 8), c[1], 0, -0.03, -0.1)),
  bowTie: (c) => {
    const wings = [-1, 1].map((sx) => {
      const w = mesh(new THREE.ConeGeometry(0.045, 0.08, 4), c[0], sx * 0.045, 0, -0.12);
      w.rotation.z = (sx * Math.PI) / 2;
      return w;
    });
    return group(...wings, mesh(new THREE.SphereGeometry(0.022, 6, 4), c[0], 0, 0, -0.12));
  },
  goldChain: (c) => group(mesh(new THREE.TorusGeometry(0.17, 0.014, 4, 22), c[0], 0, 0.02, 0.0), mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 12), c[0], 0, -0.1, -0.12)),
  // Back: on top of the torso.
  backpack: (c) => group(mesh(new THREE.BoxGeometry(0.22, 0.16, 0.24), c[0], 0, 0.07, 0.05), mesh(new THREE.BoxGeometry(0.23, 0.05, 0.12), c[1], 0, 0.14, -0.02), mesh(new THREE.BoxGeometry(0.24, 0.04, 0.03), c[1], 0, 0.0, -0.08)),
  cape: (c) => {
    const cloth = mesh(new THREE.BoxGeometry(0.38, 0.02, 0.62), c[0], 0, 0.02, 0.22);
    cloth.rotation.x = -0.25;
    return group(cloth, mesh(new THREE.SphereGeometry(0.03, 6, 4), c[1], 0, 0.04, -0.12));
  },
  angelWings: (c) =>
    group(
      ...[-1, 1].map((sx) => {
        const w = mesh(new THREE.SphereGeometry(0.16, 10, 6), c[0], sx * 0.16, 0.1, 0.0);
        w.scale.set(1.2, 0.25, 0.7);
        w.rotation.z = sx * 0.5;
        return w;
      }),
    ),
  jetpack: (c) =>
    group(
      ...[-1, 1].map((sx) => mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 10), c[0], sx * 0.07, 0.08, 0.06)),
      ...[-1, 1].map((sx) => {
        const f = mesh(new THREE.ConeGeometry(0.05, 0.1, 8), c[1], sx * 0.07, -0.08, 0.06);
        f.rotation.x = Math.PI;
        return f;
      }),
    ),
  // Tail: on the last tail segment.
  tailBow: (c) =>
    group(
      ...[-1, 1].map((sx) => {
        const w = mesh(new THREE.ConeGeometry(0.05, 0.09, 4), c[0], sx * 0.05, 0.03, 0);
        w.rotation.z = (sx * Math.PI) / 2;
        return w;
      }),
      mesh(new THREE.SphereGeometry(0.025, 6, 4), c[0], 0, 0.03, 0),
    ),
  tailRing: (c) => group(mesh(new THREE.TorusGeometry(0.045, 0.012, 5, 14), c[0], 0, 0, 0)),
};

const ANCHOR: Record<Exclude<Slot, 'trail'>, (rig: CatRig) => { parent: THREE.Object3D; pos: [number, number, number] }> = {
  head: (r) => ({ parent: r.head, pos: [0, 0, 0] }),
  eyes: (r) => ({ parent: r.head, pos: [0, 0, 0] }),
  neck: (r) => ({ parent: r.neck, pos: [0, -0.02, 0.02] }),
  back: (r) => ({ parent: r.body, pos: [0, S.torsoRadius + 0.01, 0.05] }),
  tail: (r) => ({ parent: r.tail[r.tail.length - 1], pos: [0, 0, S.tailSegLength * 0.4] }),
};

/** Removes previous accessories and attaches the given outfit (trails are drawn by TrailFx). */
export function dressCat(rig: CatRig, outfit: Partial<Record<Slot, string>>): void {
  for (const n of rig.worn) n.parent?.remove(n);
  rig.worn.length = 0;
  for (const slot of Object.keys(outfit) as Slot[]) {
    const id = outfit[slot];
    if (!id || slot === 'trail' || !BUILD[id]) continue;
    const a = ANCHOR[slot](rig);
    const node = BUILD[id](ACCESSORIES[id].colors);
    node.position.set(...a.pos);
    a.parent.add(node);
    rig.worn.push(node);
  }
}
