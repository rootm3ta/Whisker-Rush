import * as THREE from 'three';
import { CAT_COLORS as C, CAT_SHAPE as S } from '../data/cat';
import type { CatSkin } from '../data/cats';
import { type Prim, type V3 } from './sdf';
import { atBone, buildSkeleton, buildSkinnedGeometry, cap, ell, skinnedBody, v3, vnoise, type BoneSpec, type RigidPart } from './character';

export interface CatRig {
  root: THREE.Group;
  /** Spine root (torso centre). Scaling it squashes and stretches the whole cat. */
  body: THREE.Object3D;
  chest: THREE.Object3D;
  hips: THREE.Object3D;
  neck: THREE.Object3D;
  /** The skinned mesh (hide it to hide the cat's body). */
  torso: THREE.Object3D;
  head: THREE.Object3D;
  ears: THREE.Object3D[];
  /** Eye bones: scale y to blink. */
  eyes: THREE.Object3D[];
  /** Pupil bones: scale x for slits (small) or dilated (large). */
  pupils: THREE.Object3D[];
  /** Upper leg bones. Order: front-left, front-right, back-left, back-right. */
  legs: THREE.Object3D[];
  /** Lower leg bones, same order. */
  knees: THREE.Object3D[];
  tail: THREE.Object3D[];
  bodyHeight: number;
  /** Accessory nodes currently attached (removed on outfit change). */
  worn: THREE.Object3D[];
}

const B = {
  body: 0, chest: 1, hips: 2, neck: 3, head: 4, earL: 5, earR: 6, eyeL: 7, eyeR: 8, pupilL: 9, pupilR: 10,
  fl: 11, fr: 12, bl: 13, br: 14, fl2: 15, fr2: 16, bl2: 17, br2: 18, tail: 19,
} as const;

/** Model-space skeleton (faces -z, feet on y = 0). */
function catBones(bh: number): BoneSpec[] {
  const n = S.tailSegments;
  const bones: BoneSpec[] = [
    { name: 'body', parent: -1, pos: [0, bh, 0] },
    { name: 'chest', parent: B.body, pos: [0, 0.01, -0.16] },
    { name: 'hips', parent: B.body, pos: [0, 0, 0.16] },
    { name: 'neck', parent: B.chest, pos: [0, 0.07, -0.15] },
    { name: 'head', parent: B.neck, pos: [0, 0.1, -0.15] },
    { name: 'earL', parent: B.head, pos: [-S.earPos[0], S.earPos[1], S.earPos[2]], rot: [0, 0, 0.28] },
    { name: 'earR', parent: B.head, pos: [S.earPos[0], S.earPos[1], S.earPos[2]], rot: [0, 0, -0.28] },
    { name: 'eyeL', parent: B.head, pos: [-S.eyePos[0], S.eyePos[1], S.eyePos[2]] },
    { name: 'eyeR', parent: B.head, pos: [S.eyePos[0], S.eyePos[1], S.eyePos[2]] },
    { name: 'pupilL', parent: B.eyeL, pos: [0, 0, -0.02] },
    { name: 'pupilR', parent: B.eyeR, pos: [0, 0, -0.02] },
    { name: 'fl', parent: B.chest, pos: [-0.095, -0.06, -0.1] },
    { name: 'fr', parent: B.chest, pos: [0.095, -0.06, -0.1] },
    { name: 'bl', parent: B.hips, pos: [-0.09, -0.02, 0.09] },
    { name: 'br', parent: B.hips, pos: [0.09, -0.02, 0.09] },
    { name: 'fl2', parent: B.fl, pos: [0, -0.19, -0.01] },
    { name: 'fr2', parent: B.fr, pos: [0, -0.19, -0.01] },
    { name: 'bl2', parent: B.bl, pos: [0, -0.18, 0.04] },
    { name: 'br2', parent: B.br, pos: [0, -0.18, 0.04] },
  ];
  for (let i = 0; i < n; i++) bones.push({ name: `tail${i}`, parent: i === 0 ? B.hips : B.tail + i - 1, pos: i === 0 ? [0, 0.1, 0.26] : [0, 0, S.tailSegLength] });
  return bones;
}

/** Primitive parts, for colouring. */
type Part = 'torso' | 'head' | 'cheek' | 'muzzle' | 'chin' | 'neck' | 'legU' | 'legL' | 'paw' | 'tail';

function luminance(c: number): number {
  return (((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11) / 255;
}

const geoCache = new Map<string, THREE.BufferGeometry>();

/**
 * Builds a cat as one smooth skinned mesh (plus thin outline) in a given skin. Faces -z.
 * The body is polygonised once per skin and cached; every Miso shares the same geometry.
 */
export function buildCat(skin: CatSkin): CatRig {
  const root = new THREE.Group();
  root.scale.setScalar(skin.scale);
  const bh = S.legLength + 0.05;
  const sk = buildSkeleton(catBones(bh));
  const key = JSON.stringify([skin.pattern, skin.base, skin.mark, skin.mark2, skin.legs, skin.tail, skin.tailTip, skin.eye, skin.morph, skin.extra, skin.sweater]);
  let geo = geoCache.get(key);
  if (!geo) {
    geo = catGeometry(skin, sk, bh);
    geoCache.set(key, geo);
  }
  const mesh = skinnedBody(root, geo, sk);
  const bone = (i: number) => sk.bones[i];

  // Whiskers ride on the head bone.
  const wp: number[] = [];
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) wp.push(sx * 0.06, -0.06, -0.19, sx * 0.29, -0.03 - i * 0.035, -0.14);
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute('position', new THREE.Float32BufferAttribute(wp, 3));
  bone(B.head).add(new THREE.LineSegments(wGeo, new THREE.LineBasicMaterial({ color: skin.pattern === 'solid' ? 0xd8d0c0 : C.black })));

  return {
    root,
    body: bone(B.body),
    chest: bone(B.chest),
    hips: bone(B.hips),
    neck: bone(B.neck),
    torso: mesh,
    head: bone(B.head),
    ears: [bone(B.earL), bone(B.earR)],
    eyes: [bone(B.eyeL), bone(B.eyeR)],
    pupils: [bone(B.pupilL), bone(B.pupilR)],
    legs: [bone(B.fl), bone(B.fr), bone(B.bl), bone(B.br)],
    knees: [bone(B.fl2), bone(B.fr2), bone(B.bl2), bone(B.br2)],
    tail: sk.bones.slice(B.tail),
    bodyHeight: bh,
    worn: [],
  };
}

function catGeometry(skin: CatSkin, sk: ReturnType<typeof buildSkeleton>, bh: number): THREE.BufferGeometry {
  const M = skin.morph ?? {};
  const slim = M.slim ?? 1;
  const round = M.round ?? 1;
  const fl = (M.fluff ?? 1) * (skin.pattern === 'fluffy' ? 1.06 : 1);
  const cheeks = M.cheeks ?? 1;
  const R = sk.rest;
  const prims: Prim[] = [];
  const parts: Part[] = [];
  const add = (p: Prim, part: Part) => {
    prims.push(p);
    parts.push(part);
  };
  const tr = 0.17 * slim * fl * round;
  // Torso: belly, chest and haunches blend into one soft bean.
  add(ell([0, bh, 0], [tr, 0.165 * fl * round, 0.29], B.body), 'torso');
  add(ell(v3(R[B.chest], 0, 0, -0.01), [0.155 * slim * fl, 0.17 * fl, 0.17], B.chest), 'torso');
  for (const sx of [-1, 1]) add(ell(v3(R[B.hips], sx * 0.07 * slim, -0.015, 0.04), [0.11 * slim * fl, 0.15 * fl, 0.15], B.hips), 'torso');
  add(cap(v3(R[B.neck], 0, -0.03, 0.05), v3(R[B.head], 0, -0.06, 0.06), 0.1 * fl, 0.095 * fl, B.neck), 'neck');
  // Big round head with cheeks and a small muzzle.
  const H = R[B.head];
  add(ell([H.x, H.y, H.z], [0.215 * round * (slim < 1 ? 0.95 : 1), 0.19 * round, 0.19 * round], B.head), 'head');
  for (const sx of [-1, 1]) add(ell(v3(H, sx * 0.105, -0.05, -0.07), [0.095 * cheeks, 0.08 * cheeks, 0.085], B.head, 0.05), 'cheek');
  add(ell(v3(H, 0, -0.06, -0.14), [0.075, 0.058, 0.06], B.head, 0.04), 'muzzle');
  add(ell(v3(H, 0, -0.11, -0.09), [0.06, 0.04, 0.05], B.head, 0.04), 'chin');
  // Legs: slim with round paws. Thighs give the back legs a cat silhouette.
  const legR = 0.046 * slim;
  for (let i = 0; i < 4; i++) {
    const up = R[B.fl + i];
    const low = R[B.fl2 + i];
    const front = i < 2;
    if (front) add(cap(v3(up), v3(low), legR * 1.15, legR, B.fl + i, 0.05), 'legU');
    else add(ell(v3(up, 0, -0.07, 0.01), [0.07 * slim * fl, 0.12, 0.095], B.fl + i, 0.06), 'legU');
    const paw: V3 = [low.x, 0.035, low.z + (front ? -0.02 : -0.03)];
    add(cap(v3(low), [paw[0], paw[1] + 0.03, paw[2] + 0.01], legR, legR * 0.85, B.fl2 + i, 0.03), 'legL');
    add(ell(paw, [0.048 * slim, 0.034, 0.062], B.fl2 + i, 0.03), 'paw');
  }
  // Tail: tapering chain, blends into the rump at the base only.
  const n = S.tailSegments;
  let r = S.tailRadius * 1.05 * (skin.pattern === 'fluffy' ? 1.25 : 1);
  for (let i = 0; i < n; i++) {
    const a = R[B.tail + i];
    const end: V3 = i < n - 1 ? v3(R[B.tail + i + 1]) : v3(a, 0, 0, S.tailSegLength * 0.85);
    const rb = Math.max(0.03, r * 0.9);
    add(cap(v3(a), end, Math.max(0.03, r), rb, B.tail + i, i === 0 ? 0.05 : 0.02), 'tail');
    r *= 0.92;
  }

  // Rigid parts: ears, eyes, pupils, glints, nose, glasses.
  const rigid: RigidPart[] = [];
  const earColor = skin.pattern === 'points' || skin.pattern === 'tuxedo' ? skin.mark : skin.base;
  for (const [e, sx] of [[B.earL, -1], [B.earR, 1]] as const) {
    const outer = new THREE.ConeGeometry(S.earSize[0], S.earSize[1], 10, 1).scale(1, 1, 0.42).translate(0, S.earSize[1] / 2 - 0.01, 0);
    rigid.push({ geo: atBone(outer, sk, e), color: skin.pattern === 'calico' && sx > 0 ? skin.mark : earColor, bone: e });
    const inner = new THREE.ConeGeometry(S.earSize[0] * 0.62, S.earSize[1] * 0.7, 8, 1).scale(1, 1, 0.3).translate(0, S.earSize[1] * 0.38, -0.022);
    rigid.push({ geo: atBone(inner, sk, e), color: skin.innerEar, bone: e });
  }
  const iris = luminance(skin.eye) < 0.2 ? 0xd99a3a : skin.eye;
  for (const [e, p] of [[B.eyeL, B.pupilL], [B.eyeR, B.pupilR]] as const) {
    rigid.push({ geo: atBone(new THREE.SphereGeometry(0.054, 12, 8).scale(1, 1.12, 0.42), sk, e), color: iris, bone: e });
    rigid.push({ geo: atBone(new THREE.SphereGeometry(0.032, 10, 6).scale(0.62, 1.12, 0.32), sk, p), color: 0x15110f, bone: p });
    rigid.push({ geo: atBone(new THREE.SphereGeometry(0.012, 6, 4), sk, e, [-0.016, 0.022, -0.026]), color: 0xffffff, bone: e });
  }
  rigid.push({ geo: atBone(new THREE.SphereGeometry(0.024, 8, 6).scale(1.2, 0.8, 0.8), sk, B.head, [0, -0.035, -0.205]), color: C.nose, bone: B.head });
  if (skin.extra === 'glasses') {
    for (const sx of [-1, 1]) rigid.push({ geo: atBone(new THREE.TorusGeometry(0.058, 0.008, 5, 18), sk, B.head, [sx * S.eyePos[0], S.eyePos[1], S.eyePos[2] - 0.03]), color: 0x2a201c, bone: B.head });
    rigid.push({ geo: atBone(new THREE.BoxGeometry(0.05, 0.008, 0.008), sk, B.head, [0, S.eyePos[1], S.eyePos[2] - 0.03]), color: 0x2a201c, bone: B.head });
  }

  const mark = new THREE.Color(skin.mark);
  const mark2 = new THREE.Color(skin.mark2);
  const legs = new THREE.Color(skin.legs);
  const tailC = new THREE.Color(skin.tail);
  const tip = new THREE.Color(skin.tailTip);
  const white = new THREE.Color(0xffffff);
  const sweater = new THREE.Color(skin.sweater ?? 0x4a8fe0);
  const seed = S.coatSeed + Math.round(skin.base / 997);
  const tailStart = R[B.tail].z;
  const tailLen = S.tailSegLength * n;
  const colorAt = (x: number, y: number, z: number, prim: number, out: THREE.Color) => {
    const part = parts[prim];
    out.setHex(skin.base);
    if (part === 'legL' || part === 'paw') out.copy(legs);
    if (part === 'tail') {
      const t = (z - tailStart) / tailLen;
      out.copy(tailC).lerp(tip, THREE.MathUtils.smoothstep(t, 0.72, 0.85));
    }
    const face = part === 'muzzle' || part === 'chin';
    switch (skin.pattern) {
      case 'calico': {
        if (face || part === 'paw') break;
        if (part !== 'tail') {
          if (vnoise(x * 6 + 3, y * 6, z * 6, seed) > 0.62) out.copy(mark);
          else if (vnoise(x * 7, y * 7 + 9, z * 7, seed + 1) > 0.68) out.copy(mark2);
        }
        break;
      }
      case 'tabby': {
        if (face || part === 'paw') break;
        const w = vnoise(x * 4, y * 4, z * 4, seed) * 3.5;
        const band = part === 'legU' || part === 'legL' ? Math.sin(y * 42 + w) : part === 'head' || part === 'cheek' ? (y > H.y + 0.04 ? Math.sin(x * 46 + w) : -1) : Math.sin(z * 30 + w + Math.abs(x) * 6);
        if (band > 0.5) out.lerp(mark, 0.85);
        break;
      }
      case 'points': {
        // Siamese: darker toward the face, ears, paws and tail.
        let k = 0;
        if (face || part === 'cheek') k = 0.9;
        else if (part === 'head') k = THREE.MathUtils.smoothstep(-(z - H.z), 0.06, 0.18) * 0.85;
        else if (part === 'legL' || part === 'paw' || part === 'tail') k = 1;
        else if (part === 'legU') k = 0.5;
        out.lerp(mark, k);
        break;
      }
      case 'fluffy': {
        const n1 = vnoise(x * 22, y * 22, z * 22, seed);
        if (n1 > 0.7) out.lerp(mark, 0.6);
        else if (n1 < 0.25) out.lerp(mark2, 0.55);
        if (face || (part === 'neck' && y < R[B.neck].y)) out.lerp(mark2, 0.7);
        break;
      }
      case 'sphynx': {
        if (part === 'head' && Math.abs(Math.sin(y * 95)) < 0.12) out.lerp(mark, 0.8);
        if (skin.extra === 'sweater' && (part === 'torso' || part === 'neck') && z > -0.3 && z < 0.24) {
          out.copy(sweater);
          if (Math.abs(Math.sin(z * 48)) > 0.82) out.lerp(white, 0.85);
        }
        break;
      }
      case 'tuxedo': {
        out.copy(mark);
        const bib = (part === 'torso' || part === 'neck') && y < bh - 0.02 && z < -0.05;
        if (face || bib || part === 'paw') out.copy(white);
        break;
      }
      case 'solid':
        break;
    }
    // Muzzle and chin are a touch lighter on every coat but solid black.
    if (face && skin.pattern !== 'solid' && skin.pattern !== 'points') out.lerp(white, 0.45);
  };
  return buildSkinnedGeometry(prims, 0.06, S.cell, sk.bones.length, colorAt, rigid, 0.025, S.bodyTris);
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
