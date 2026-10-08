import * as THREE from 'three';
import { CAT_COLORS as C, CAT_SHAPE as S } from '../data/cat';
import type { CatSkin } from '../data/cats';
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
  bodyHeight: number;
  /** Accessory nodes currently attached (removed on outfit change). */
  worn: THREE.Object3D[];
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function blobs(g: CanvasRenderingContext2D, rng: Rng, color: number, n: number, w: number, h: number): void {
  g.fillStyle = hex(color);
  for (let i = 0; i < n; i++) {
    const x = rng.range(0, w);
    const y = rng.range(10, h - 10);
    const r = rng.range(14, 30);
    g.beginPath();
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const rr = r * rng.range(0.75, 1.2);
      g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr);
    }
    g.fill();
  }
}

/** Body coat texture by pattern. Canvas x wraps around the body, y runs along it. */
function coatTexture(skin: CatSkin, part: 'body' | 'head'): THREE.CanvasTexture {
  const [c, g] = canvas(256, 128);
  const rng = new Rng(S.coatSeed + (part === 'head' ? 11 : 0));
  g.fillStyle = hex(skin.base);
  g.fillRect(0, 0, 256, 128);
  switch (skin.pattern) {
    case 'calico':
      blobs(g, rng, skin.mark, S.orangePatches, 256, 128);
      blobs(g, rng, skin.mark2, S.blackPatches, 256, 128);
      break;
    case 'tabby':
      g.strokeStyle = hex(skin.mark);
      g.lineWidth = 7;
      for (let y = 8; y < 128; y += 18) {
        g.beginPath();
        for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x * 0.08 + y) * 4);
        g.stroke();
      }
      break;
    case 'points': {
      // Siamese: darker toward the ends of the body, dark face mask on the head.
      const grad = g.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, hex(skin.mark));
      grad.addColorStop(0.3, 'rgba(0,0,0,0)');
      grad.addColorStop(0.75, 'rgba(0,0,0,0)');
      grad.addColorStop(1, hex(skin.mark));
      if (part === 'body') {
        g.fillStyle = grad;
        g.fillRect(0, 0, 256, 128);
      } else {
        g.fillStyle = hex(skin.mark);
        g.beginPath();
        g.ellipse(192, 72, 34, 40, 0, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case 'fluffy':
      for (let i = 0; i < 420; i++) {
        g.fillStyle = hex(rng.next() < 0.5 ? skin.mark : skin.mark2);
        g.globalAlpha = 0.35;
        g.fillRect(rng.range(0, 256), rng.range(0, 128), rng.range(3, 9), rng.range(1, 3));
      }
      g.globalAlpha = 1;
      break;
    case 'sphynx':
      g.strokeStyle = hex(skin.mark);
      g.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        const y = rng.range(10, 118);
        g.beginPath();
        g.arc(rng.range(0, 256), y, rng.range(8, 20), 0.2, 2.6);
        g.stroke();
      }
      if (part === 'body' && skin.extra === 'sweater') {
        // Knitted sweater over the torso, skin shows at the very ends.
        g.fillStyle = hex(skin.sweater ?? 0x4a8fe0);
        g.fillRect(0, 22, 256, 84);
        g.fillStyle = '#fbf6ec';
        for (let x = 0; x < 256; x += 16) {
          g.fillRect(x, 50, 8, 6);
          g.fillRect(x + 8, 70, 8, 6);
        }
      }
      break;
    case 'solid':
      break;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/** Builds a cat from primitives in a given skin. Faces -z. Outlined parts get an inverted-hull child. */
export function buildCat(skin: CatSkin): CatRig {
  const coat = createToonMaterial(0xffffff, { map: coatTexture(skin, 'body') });
  const headCoat = createToonMaterial(0xffffff, { map: coatTexture(skin, 'head') });
  const legMat = createToonMaterial(skin.legs);
  const earMat = createToonMaterial(skin.pattern === 'points' ? skin.mark : skin.base);
  const pink = createToonMaterial(skin.innerEar);
  const dark = createToonMaterial(skin.eye);
  const ink = createOutlineMaterial();
  const outline = (m: THREE.Mesh) => {
    m.add(new THREE.Mesh(m.geometry, ink));
    return m;
  };

  const root = new THREE.Group();
  root.scale.setScalar(skin.scale);
  const bodyHeight = S.legLength + 0.05;
  const body = new THREE.Group();
  body.position.y = bodyHeight;
  root.add(body);

  const torsoGeo = new THREE.CapsuleGeometry(S.torsoRadius * (skin.pattern === 'fluffy' ? 1.12 : 1), S.torsoLength, 6, 12);
  torsoGeo.rotateX(Math.PI / 2);
  const torso = outline(new THREE.Mesh(torsoGeo, coat));
  body.add(torso);

  const head = new THREE.Group();
  head.position.set(...S.headPos);
  body.add(head);
  const skull = outline(new THREE.Mesh(new THREE.SphereGeometry(S.headRadius, 16, 12), headCoat));
  skull.scale.set(1.08, 0.95, 1);
  head.add(skull);

  const ears: THREE.Group[] = [];
  const earGeo = new THREE.ConeGeometry(S.earSize[0], S.earSize[1], 5);
  const innerGeo = new THREE.ConeGeometry(S.earSize[0] * 0.6, S.earSize[1] * 0.65, 5);
  for (const sx of [-1, 1]) {
    const ear = new THREE.Group();
    ear.position.set(sx * S.earPos[0], S.earPos[1], S.earPos[2]);
    ear.rotation.z = -sx * 0.28;
    const outer = outline(new THREE.Mesh(earGeo, skin.pattern === 'calico' && sx > 0 ? createToonMaterial(skin.mark) : earMat));
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
    for (let i = 0; i < 3; i++) wp.push(sx * 0.05, -0.05, -0.17, sx * 0.27, -0.02 - i * 0.035, -0.12);
  }
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  head.add(new THREE.LineSegments(wGeo, new THREE.LineBasicMaterial({ color: skin.pattern === 'solid' ? 0xd8d0c0 : C.black })));

  if (skin.extra === 'glasses') {
    const frame = createToonMaterial(0x2a201c);
    for (const sx of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 4, 14), frame);
      ring.position.set(sx * S.eyePos[0], S.eyePos[1], S.eyePos[2] - 0.02);
      head.add(ring);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.008), frame);
    bridge.position.set(0, S.eyePos[1], S.eyePos[2] - 0.02);
    head.add(bridge);
  }

  const legs: THREE.Group[] = [];
  const legGeo = new THREE.CapsuleGeometry(S.legRadius, S.legLength - S.legRadius * 2, 4, 8);
  legGeo.translate(0, -S.legLength / 2 + S.legRadius * 0.5, 0);
  for (const hip of [S.frontHip, S.backHip]) {
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(sx * hip[0], hip[1], hip[2]);
      pivot.add(outline(new THREE.Mesh(legGeo, legMat)));
      body.add(pivot);
      legs.push(pivot);
    }
  }

  const tail: THREE.Group[] = [];
  const tailMat = createToonMaterial(skin.tail);
  const tip = createToonMaterial(skin.tailTip);
  let parent: THREE.Object3D = body;
  let r = S.tailRadius * (skin.pattern === 'fluffy' ? 1.3 : 1);
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

  return { root, body, torso, head, ears, eyes, legs, tail, bodyHeight, worn: [] };
}

export function buildShadow(): THREE.Mesh {
  const shadowGeo = new THREE.CircleGeometry(S.shadowRadius, 20);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ color: C.shadow, transparent: true, opacity: S.shadowOpacity, depthWrite: false }),
  );
  shadow.scale.set(1, 1, 1.6);
  shadow.position.y = 0.02;
  shadow.renderOrder = -1;
  return shadow;
}
