import * as THREE from 'three';
import { DOG_ACCESSORY_COLORS as A, type DogDef } from '../data/dogs';
import { createOutlineMaterial, createToonMaterial } from '../render/ToonMaterial';

export interface DogRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  ears: THREE.Group[];
  /** Order: front-left, front-right, back-left, back-right. */
  legs: THREE.Group[];
  tail: THREE.Group;
  bodyHeight: number;
}

const mats = new Map<number, THREE.MeshToonMaterial>();
function toon(color: number): THREE.MeshToonMaterial {
  let m = mats.get(color);
  if (!m) mats.set(color, (m = createToonMaterial(color)));
  return m;
}

let ink: THREE.MeshBasicMaterial | null = null;
function outlined(m: THREE.Mesh): THREE.Mesh {
  ink ??= createOutlineMaterial();
  m.add(new THREE.Mesh(m.geometry, ink));
  return m;
}

function mesh(g: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(g, toon(color));
  m.position.set(x, y, z);
  return m;
}

function capsuleZ(r: number, len: number): THREE.BufferGeometry {
  const g = new THREE.CapsuleGeometry(r, len, 5, 10);
  g.rotateX(Math.PI / 2);
  return g;
}

/** Builds a dog from primitives. Faces -z like the cat. */
export function buildDog(d: DogDef): DogRig {
  const root = new THREE.Group();
  root.scale.setScalar(d.scale);
  const br = d.body.radius;
  const half = d.body.length / 2 + br;
  const bodyHeight = d.legLength + br * 0.55;
  const body = new THREE.Group();
  body.position.y = bodyHeight;
  root.add(body);

  body.add(outlined(mesh(capsuleZ(br, d.body.length), d.body.color)));
  // Coat patches: flattened blobs on the back and flanks.
  d.patches.forEach((c, i) => {
    const p = mesh(new THREE.SphereGeometry(br * 0.55, 10, 8), c, (i % 2 ? 1 : -1) * br * 0.45, br * 0.55, (i - 0.5) * br * 1.2);
    p.scale.set(1, 0.55, 1.3);
    body.add(p);
  });

  const hr = d.head.radius;
  const head = new THREE.Group();
  head.position.set(0, br * 0.6, -half - hr * 0.35);
  body.add(head);
  head.add(outlined(mesh(new THREE.SphereGeometry(hr, 14, 10), d.head.color)));
  const s = d.snout;
  head.add(outlined(mesh(new THREE.BoxGeometry(s.w, s.h, s.d), s.color, 0, -hr * 0.3, -hr * 0.85 - s.d * 0.3)));
  head.add(mesh(new THREE.SphereGeometry(hr * 0.16, 8, 6), d.nose, 0, -hr * 0.2, -hr * 0.85 - s.d * 0.8));
  const tongue = mesh(new THREE.BoxGeometry(s.w * 0.35, 0.02, s.d * 0.7), A.tongue, 0, -hr * 0.3 - s.h * 0.55, -hr * 0.9);
  tongue.rotation.x = 0.4;
  head.add(tongue);
  for (const sx of [-1, 1]) head.add(mesh(new THREE.SphereGeometry(hr * 0.12, 8, 6), A.lens, sx * hr * 0.4, hr * 0.2, -hr * 0.86));

  const ears: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * hr * 0.72, hr * 0.62, -hr * 0.05);
    let g: THREE.BufferGeometry;
    if (d.ears === 'long') {
      g = new THREE.BoxGeometry(hr * 0.22, hr * 1.5, hr * 0.7);
      g.translate(0, -hr * 0.7, 0);
      ear.rotation.z = sx * 0.15;
    } else {
      g = new THREE.ConeGeometry(hr * 0.38, hr * 0.6, 3);
      g.translate(0, hr * 0.25, 0);
      ear.rotation.set(-0.9, 0, -sx * 0.5);
    }
    ear.add(outlined(mesh(g, d.earColor)));
    head.add(ear);
    ears.push(ear);
  }

  for (const acc of d.accessories) {
    if (acc === 'sunglasses') {
      for (const sx of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(hr * 0.55, hr * 0.32, 0.03), A.lens, sx * hr * 0.38, hr * 0.22, -hr * 0.95));
      head.add(mesh(new THREE.BoxGeometry(hr * 0.3, 0.03, 0.03), A.frame, 0, hr * 0.3, -hr * 0.97));
      for (const sx of [-1, 1]) head.add(mesh(new THREE.BoxGeometry(0.025, 0.025, hr * 0.9), A.frame, sx * hr * 0.66, hr * 0.28, -hr * 0.5));
    } else if (acc === 'spikedCollar') {
      const ring = new THREE.TorusGeometry(br * 0.82, br * 0.12, 6, 16);
      const collar = mesh(ring, A.collar, 0, br * 0.4, -half + br * 0.2);
      body.add(collar);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const spike = mesh(new THREE.ConeGeometry(br * 0.1, br * 0.28, 5), A.spike, Math.cos(a) * br * 0.95, br * 0.4 + Math.sin(a) * br * 0.95, -half + br * 0.2);
        spike.rotation.z = a - Math.PI / 2;
        body.add(spike);
      }
    } else if (acc === 'bandana') {
      const g = new THREE.ConeGeometry(br * 0.9, br * 1.2, 3);
      g.rotateX(Math.PI);
      const b = mesh(g, A.bandana, 0, br * 0.05, -half + br * 0.5);
      b.scale.z = 0.4;
      body.add(b);
    }
  }

  const legs: THREE.Group[] = [];
  const legGeo = new THREE.CapsuleGeometry(d.legRadius, Math.max(0.01, d.legLength - d.legRadius * 2), 4, 8);
  legGeo.translate(0, -d.legLength / 2 + d.legRadius * 0.5, 0);
  for (const hz of [-1, 1]) {
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * br * 0.6, -br * 0.4, hz * d.body.length * 0.5);
      pivot.add(outlined(new THREE.Mesh(legGeo, toon(d.legColor))));
      body.add(pivot);
      legs.push(pivot);
    }
  }

  const tail = new THREE.Group();
  tail.position.set(0, br * 0.45, half - br * 0.2);
  tail.rotation.x = d.tail.up;
  const tg = capsuleZ(d.tail.radius, d.tail.length);
  tg.translate(0, 0, d.tail.length / 2);
  tail.add(outlined(mesh(tg, d.tail.color)));
  body.add(tail);

  return { root, body, head, ears, legs, tail, bodyHeight };
}
