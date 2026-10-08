import * as THREE from 'three';
import { CAT_COLORS as C, CAT_SHAPE as S } from '../data/cat';
import { Rng } from '../core/Rng';
import { createOutlineMaterial, createToonMaterial } from '../render/ToonMaterial';
import { hex } from '../render/Sky';

export interface CatRig {
  root: THREE.Group;
  body: THREE.Group;
  torso: THREE.Mesh;
  head: THREE.Group;
  ears: THREE.Group[];
  eyes: THREE.Mesh[];
  /** Order: front-left, front-right, back-left, back-right. */
  legs: THREE.Group[];
  tail: THREE.Group[];
  shadow: THREE.Mesh;
  bodyHeight: number;
}

/** Calico coat: cream base with orange and black patches, seeded. */
function calicoTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = hex(C.base);
  g.fillRect(0, 0, c.width, c.height);
  const rng = new Rng(S.coatSeed);
  const blob = (color: number, n: number) => {
    g.fillStyle = hex(color);
    for (let i = 0; i < n; i++) {
      const x = rng.range(0, c.width);
      const y = rng.range(10, c.height - 10);
      const r = rng.range(14, 30);
      g.beginPath();
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const rr = r * rng.range(0.75, 1.2);
        g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr);
      }
      g.fill();
    }
  };
  blob(C.orange, S.orangePatches);
  blob(C.black, S.blackPatches);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Builds Miso from primitives. Faces -z. Outlined parts get an inverted-hull child. */
export function buildCat(): CatRig {
  const coat = createToonMaterial(0xffffff, { map: calicoTexture() });
  const cream = createToonMaterial(C.base);
  const pink = createToonMaterial(C.innerEar);
  const dark = createToonMaterial(C.eye);
  const ink = createOutlineMaterial();
  const outline = (m: THREE.Mesh) => {
    m.add(new THREE.Mesh(m.geometry, ink));
    return m;
  };

  const root = new THREE.Group();
  root.scale.setScalar(S.scale);
  const bodyHeight = S.legLength + 0.05;
  const body = new THREE.Group();
  body.position.y = bodyHeight;
  root.add(body);

  const torsoGeo = new THREE.CapsuleGeometry(S.torsoRadius, S.torsoLength, 6, 12);
  torsoGeo.rotateX(Math.PI / 2);
  const torso = outline(new THREE.Mesh(torsoGeo, coat));
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(...S.headPos);
  body.add(head);
  const skull = outline(new THREE.Mesh(new THREE.SphereGeometry(S.headRadius, 16, 12), coat));
  skull.scale.set(1.08, 0.95, 1);
  head.add(skull);

  const ears: THREE.Group[] = [];
  const earGeo = new THREE.ConeGeometry(S.earSize[0], S.earSize[1], 5);
  const innerGeo = new THREE.ConeGeometry(S.earSize[0] * 0.6, S.earSize[1] * 0.65, 5);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * S.earPos[0], S.earPos[1], S.earPos[2]);
    ear.rotation.z = -sx * 0.28;
    const outer = outline(new THREE.Mesh(earGeo, sx < 0 ? cream : coat));
    outer.position.y = S.earSize[1] / 2;
    const inner = new THREE.Mesh(innerGeo, pink);
    inner.position.set(0, S.earSize[1] * 0.4, -S.earSize[0] * 0.45);
    ear.add(outer, inner);
    head.add(ear);
    ears.push(ear);
  }

  const eyes: THREE.Mesh[] = [];
  const eyeGeo = new THREE.SphereGeometry(0.036, 10, 8);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, dark);
    eye.position.set(sx * S.eyePos[0], S.eyePos[1], S.eyePos[2]);
    eye.scale.set(1, 1.15, 0.5);
    head.add(eye);
    eyes.push(eye);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), createToonMaterial(C.nose));
  nose.position.set(0, -0.035, -S.headRadius - 0.005);
  head.add(nose);

  const wp: number[] = [];
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      wp.push(sx * 0.05, -0.05, -0.17, sx * 0.27, -0.02 - i * 0.035, -0.12);
    }
  }
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  head.add(new THREE.LineSegments(wGeo, new THREE.LineBasicMaterial({ color: C.black })));

  const legs: THREE.Group[] = [];
  const legGeo = new THREE.CapsuleGeometry(S.legRadius, S.legLength - S.legRadius * 2, 4, 8);
  legGeo.translate(0, -S.legLength / 2 + S.legRadius * 0.5, 0);
  for (const hip of [S.frontHip, S.backHip]) {
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * hip[0], hip[1], hip[2]);
      pivot.add(outline(new THREE.Mesh(legGeo, cream)));
      body.add(pivot);
      legs.push(pivot);
    }
  }

  const tail: THREE.Group[] = [];
  const tailMat = createToonMaterial(C.orange);
  const tip = createToonMaterial(C.black);
  let parent: THREE.Object3D = body;
  let r = S.tailRadius;
  for (let i = 0; i < S.tailSegments; i++) {
    const seg = new THREE.Group();
    if (i === 0) seg.position.set(...S.tailBase);
    else seg.position.z = S.tailSegLength;
    const g = new THREE.CapsuleGeometry(r, S.tailSegLength, 3, 8);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0, S.tailSegLength / 2);
    seg.add(outline(new THREE.Mesh(g, i === S.tailSegments - 1 ? tip : tailMat)));
    parent.add(seg);
    tail.push(seg);
    parent = seg;
    r *= S.tailTaper;
  }

  const shadowGeo = new THREE.CircleGeometry(S.shadowRadius, 20);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ color: C.shadow, transparent: true, opacity: S.shadowOpacity, depthWrite: false }),
  );
  shadow.scale.set(1, 1, 1.6);
  shadow.position.y = 0.02;
  shadow.renderOrder = -1;

  return { root, body, torso, head, ears, eyes, legs, tail, shadow, bodyHeight };
}
