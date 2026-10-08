import * as THREE from 'three';
import { DOG_ACCESSORY_COLORS as A, type DogBuild, type DogDef } from '../data/dogs';
import type { Prim, V3 } from './sdf';
import { atBone, buildSkeleton, buildSkinnedGeometry, cap, ell, skinnedBody, v3, vnoise, type BoneSpec, type RigidPart } from './character';

export interface DogRig {
  root: THREE.Group;
  body: THREE.Object3D;
  chest: THREE.Object3D;
  hips: THREE.Object3D;
  neck: THREE.Object3D;
  head: THREE.Object3D;
  ears: THREE.Object3D[];
  /** Duke's jowls (bounce with the gait); empty for other dogs. */
  jowls: THREE.Object3D[];
  /** Upper leg bones. Order: front-left, front-right, back-left, back-right. */
  legs: THREE.Object3D[];
  knees: THREE.Object3D[];
  /** First tail bone (wag); the whole chain is in `tails`. */
  tail: THREE.Object3D;
  tails: THREE.Object3D[];
  bodyHeight: number;
}

/** Per-breed silhouette knobs (multipliers on the def's numbers). */
interface Plan {
  wide: number;
  chest: number;
  waist: number;
  neckUp: number;
  headW: number;
  snout: 'short' | 'long' | 'medium';
  jowls: boolean;
  underbite: boolean;
  fluff: number;
  mane: boolean;
  beard: boolean;
  cheekFluff: boolean;
  thigh: number;
  tailCurl: number;
  tailFluff: number;
}

const PLAN: Record<DogBuild, Plan> = {
  bulldog: { wide: 1.4, chest: 1.3, waist: 0.95, neckUp: 0, headW: 1.3, snout: 'short', jowls: true, underbite: true, fluff: 1, mane: false, beard: false, cheekFluff: false, thigh: 1.2, tailCurl: 0, tailFluff: 1 },
  dachshund: { wide: 1, chest: 1.1, waist: 1, neckUp: 0.4, headW: 0.95, snout: 'long', jowls: false, underbite: false, fluff: 1, mane: false, beard: false, cheekFluff: false, thigh: 0.9, tailCurl: 0.1, tailFluff: 1 },
  terrier: { wide: 1, chest: 1.05, waist: 0.92, neckUp: 0.6, headW: 1, snout: 'medium', jowls: false, underbite: false, fluff: 1, mane: false, beard: false, cheekFluff: false, thigh: 1.05, tailCurl: 0, tailFluff: 1 },
  greyhound: { wide: 0.85, chest: 1.35, waist: 0.62, neckUp: 0.9, headW: 0.85, snout: 'long', jowls: false, underbite: false, fluff: 1, mane: false, beard: false, cheekFluff: false, thigh: 1.1, tailCurl: 0.2, tailFluff: 0.8 },
  spinone: { wide: 1.1, chest: 1.1, waist: 0.95, neckUp: 0.5, headW: 1, snout: 'medium', jowls: false, underbite: false, fluff: 1.08, mane: false, beard: true, cheekFluff: false, thigh: 1.1, tailCurl: 0, tailFluff: 1.2 },
  shiba: { wide: 1, chest: 1.08, waist: 0.86, neckUp: 0.7, headW: 1.05, snout: 'medium', jowls: false, underbite: false, fluff: 1, mane: false, beard: false, cheekFluff: true, thigh: 1.05, tailCurl: -0.6, tailFluff: 1.2 },
  akita: { wide: 1.05, chest: 1.12, waist: 0.88, neckUp: 0.7, headW: 1.12, snout: 'medium', jowls: false, underbite: false, fluff: 1, mane: false, beard: false, cheekFluff: true, thigh: 1.1, tailCurl: -0.6, tailFluff: 1.3 },
  shepherd: { wide: 1.1, chest: 1.12, waist: 0.92, neckUp: 0.7, headW: 1.12, snout: 'medium', jowls: false, underbite: false, fluff: 1.06, mane: true, beard: false, cheekFluff: true, thigh: 1.15, tailCurl: 0.15, tailFluff: 1.5 },
  street: { wide: 1, chest: 1.08, waist: 0.88, neckUp: 0.6, headW: 1, snout: 'medium', jowls: false, underbite: false, fluff: 1, mane: false, beard: false, cheekFluff: false, thigh: 1.05, tailCurl: 0.1, tailFluff: 1.1 },
};

const NB = { body: 0, chest: 1, hips: 2, neck: 3, head: 4, earL: 5, earR: 6, jowlL: 7, jowlR: 8, fl: 9, fl2: 13, tail: 17 } as const;
const TAIL_SEGS = 3;

type Part = 'body' | 'head' | 'snout' | 'cheek' | 'leg' | 'paw' | 'tail' | 'mane' | 'jaw';

function dogBones(d: DogDef, pl: Plan, bh: number): BoneSpec[] {
  const br = d.body.radius;
  const L = d.body.length;
  const hr = d.head.radius;
  const legTop = bh - br * 0.4;
  const bones: BoneSpec[] = [
    { name: 'body', parent: -1, pos: [0, bh, 0] },
    { name: 'chest', parent: NB.body, pos: [0, 0.02, -L * 0.42] },
    { name: 'hips', parent: NB.body, pos: [0, 0, L * 0.42] },
    { name: 'neck', parent: NB.chest, pos: [0, br * 0.55, -br * 0.45] },
    { name: 'head', parent: NB.neck, pos: [0, hr * (0.5 + pl.neckUp * 0.5), -hr * 0.8] },
    { name: 'earL', parent: NB.head, pos: [-hr * 0.62 * pl.headW, hr * 0.62, hr * 0.05] },
    { name: 'earR', parent: NB.head, pos: [hr * 0.62 * pl.headW, hr * 0.62, hr * 0.05] },
    { name: 'jowlL', parent: NB.head, pos: [-hr * 0.42 * pl.headW, -hr * 0.42, -hr * 0.72] },
    { name: 'jowlR', parent: NB.head, pos: [hr * 0.42 * pl.headW, -hr * 0.42, -hr * 0.72] },
  ];
  const lx = br * 0.62 * pl.wide;
  bones.push({ name: 'fl', parent: NB.chest, pos: [-lx, -br * 0.42, 0] }, { name: 'fr', parent: NB.chest, pos: [lx, -br * 0.42, 0] });
  bones.push({ name: 'bl', parent: NB.hips, pos: [-lx * 0.95, -br * 0.38, 0] }, { name: 'br', parent: NB.hips, pos: [lx * 0.95, -br * 0.38, 0] });
  const half = legTop * 0.5;
  bones.push({ name: 'fl2', parent: NB.fl, pos: [0, -half, 0] }, { name: 'fr2', parent: NB.fl + 1, pos: [0, -half, 0] });
  bones.push({ name: 'bl2', parent: NB.fl + 2, pos: [0, -half, 0.04] }, { name: 'br2', parent: NB.fl + 3, pos: [0, -half, 0.04] });
  const seg = d.tail.length / TAIL_SEGS;
  for (let i = 0; i < TAIL_SEGS; i++) {
    bones.push({
      name: `tail${i}`,
      parent: i === 0 ? NB.hips : NB.tail + i - 1,
      pos: i === 0 ? [0, br * 0.55, br * 0.8] : [0, 0, seg],
      rot: i === 0 ? [d.tail.up, 0, 0] : [pl.tailCurl, 0, 0],
    });
  }
  return bones;
}

const geoCache = new Map<DogDef, THREE.BufferGeometry>();

/** Builds a dog as one smooth skinned mesh with a breed-specific silhouette. Faces -z like the cat. */
export function buildDog(d: DogDef): DogRig {
  const root = new THREE.Group();
  root.scale.setScalar(d.scale);
  const pl = PLAN[d.build];
  const bh = d.legLength + d.body.radius * 0.55;
  const sk = buildSkeleton(dogBones(d, pl, bh));
  let geo = geoCache.get(d);
  if (!geo) {
    geo = dogGeometry(d, pl, sk, bh);
    geoCache.set(d, geo);
  }
  skinnedBody(root, geo, sk);
  const b = (i: number) => sk.bones[i];
  return {
    root,
    body: b(NB.body),
    chest: b(NB.chest),
    hips: b(NB.hips),
    neck: b(NB.neck),
    head: b(NB.head),
    ears: [b(NB.earL), b(NB.earR)],
    jowls: pl.jowls ? [b(NB.jowlL), b(NB.jowlR)] : [],
    legs: [b(NB.fl), b(NB.fl + 1), b(NB.fl + 2), b(NB.fl + 3)],
    knees: [b(NB.fl2), b(NB.fl2 + 1), b(NB.fl2 + 2), b(NB.fl2 + 3)],
    tail: b(NB.tail),
    tails: sk.bones.slice(NB.tail),
    bodyHeight: bh,
  };
}

function dogGeometry(d: DogDef, pl: Plan, sk: ReturnType<typeof buildSkeleton>, bh: number): THREE.BufferGeometry {
  const R = sk.rest;
  const br = d.body.radius * pl.fluff;
  const L = d.body.length;
  const hr = d.head.radius;
  const prims: Prim[] = [];
  const parts: Part[] = [];
  const add = (p: Prim, part: Part) => {
    prims.push(p);
    parts.push(part);
  };
  // Body: chest, waist and rump.
  add(ell([0, bh, 0], [br * pl.wide * pl.waist, br * pl.waist, L / 2 + br * 0.3], NB.body), 'body');
  add(ell(v3(R[NB.chest], 0, 0.01, 0), [br * pl.wide * pl.chest, br * 1.05 * pl.chest, br * 0.95], NB.chest), 'body');
  add(ell(v3(R[NB.hips]), [br * pl.wide * 0.95, br * 0.95, br * 0.85], NB.hips), 'body');
  if (pl.mane) add(ell(v3(R[NB.neck], 0, -br * 0.15, 0.03), [br * pl.wide * 1.15, br * 1.15, br * 0.85], NB.neck, 0.08), 'mane');
  const H = R[NB.head];
  add(cap(v3(R[NB.neck], 0, -br * 0.2, br * 0.2), v3(H, 0, -hr * 0.3, hr * 0.3), br * 0.6 * pl.wide, hr * 0.62 * pl.headW, NB.neck), 'body');
  add(ell([H.x, H.y, H.z], [hr * pl.headW, hr, hr * 1.02], NB.head), 'head');
  if (pl.cheekFluff) for (const sx of [-1, 1]) add(ell(v3(H, sx * hr * 0.55 * pl.headW, -hr * 0.3, -hr * 0.15), [hr * 0.42, hr * 0.38, hr * 0.42], NB.head, 0.05), 'cheek');
  const s = d.snout;
  const front = v3(H, 0, -hr * 0.25, -hr * 0.6);
  if (pl.snout === 'short') {
    add(ell(v3(H, 0, -hr * 0.3, -hr * 0.88), [s.w * 0.62, s.h * 0.6, s.d * 0.55 + 0.02], NB.head, 0.04), 'snout');
  } else {
    const len = pl.snout === 'long' ? s.d + hr * 0.45 : s.d + hr * 0.2;
    add(cap(front, [front[0], front[1] - hr * 0.08, front[2] - len], s.h * 0.55, s.h * 0.42, NB.head, 0.05), 'snout');
  }
  if (pl.underbite) add(ell(v3(H, 0, -hr * 0.62, -hr * 0.78), [s.w * 0.5, hr * 0.17, hr * 0.32], NB.head, 0.03), 'jaw');
  if (pl.jowls) for (const sx of [0, 1]) add(ell(v3(R[NB.jowlL + sx]), [hr * 0.3, hr * 0.34, hr * 0.3], NB.jowlL + sx, 0.05), 'snout');
  if (pl.beard) add(ell([front[0], front[1] - hr * 0.28, front[2] - s.d * 0.6], [s.w * 0.45, hr * 0.25, s.d * 0.45], NB.head, 0.05), 'snout');
  // Legs.
  const lr = d.legRadius;
  for (let i = 0; i < 4; i++) {
    const up = R[NB.fl + i];
    const low = R[NB.fl2 + i];
    const fr = i < 2;
    if (fr) add(cap(v3(up, 0, 0.04, 0), v3(low), lr * 1.3, lr, NB.fl + i, 0.06), 'leg');
    else add(ell(v3(up, 0, -(up.y - low.y) * 0.3, 0.02), [lr * 1.9 * pl.thigh, (up.y - low.y) * 0.62, lr * 2.2 * pl.thigh], NB.fl + i, 0.07), 'leg');
    const paw: V3 = [low.x, lr * 0.75, low.z - (fr ? 0.02 : 0.0)];
    add(cap(v3(low), [paw[0], paw[1] + lr * 0.4, paw[2] + 0.01], lr, lr * 0.9, NB.fl2 + i, 0.03), 'leg');
    add(ell(paw, [lr * 1.25, lr * 0.75, lr * 1.6], NB.fl2 + i, 0.03), 'paw');
  }
  // Tail chain.
  const seg = d.tail.length / TAIL_SEGS;
  let tr = d.tail.radius * pl.tailFluff;
  for (let i = 0; i < TAIL_SEGS; i++) {
    const a = R[NB.tail + i];
    const bt = sk.bones[NB.tail + i];
    const end = i < TAIL_SEGS - 1 ? v3(R[NB.tail + i + 1]) : (() => {
      const e = new THREE.Vector3(0, 0, seg * 0.9).applyMatrix4(bt.matrixWorld);
      return v3(e);
    })();
    add(cap(v3(a), end, tr, tr * 0.82, NB.tail + i, i === 0 ? 0.05 : 0.03), 'tail');
    tr *= 0.82;
  }

  // Rigid parts: ears, eyes, nose, teeth, accessories.
  const rigid: RigidPart[] = [];
  for (const [e, sx] of [[NB.earL, -1], [NB.earR, 1]] as const) {
    let g: THREE.BufferGeometry;
    let rot: V3 = [0, 0, 0];
    switch (d.ears) {
      case 'long':
        g = new THREE.SphereGeometry(1, 10, 8).scale(hr * 0.15, hr * 0.78, hr * 0.42).translate(sx * hr * 0.1, -hr * 0.62, 0);
        break;
      case 'pointy':
        g = new THREE.ConeGeometry(hr * 0.4, hr * 0.9, 8).scale(1, 1, 0.5).translate(0, hr * 0.38, 0);
        rot = [-0.1, 0, -sx * 0.28];
        rigid.push({ geo: atBone(new THREE.ConeGeometry(hr * 0.24, hr * 0.55, 6).scale(1, 1, 0.3).translate(0, hr * 0.3, -hr * 0.07), sk, e, [0, 0, 0], rot), color: 0xe8a0a0, bone: e });
        break;
      case 'drop':
        g = new THREE.ConeGeometry(hr * 0.3, hr * 0.5, 6).scale(1, 1, 0.35).rotateZ(Math.PI).translate(sx * hr * 0.06, -hr * 0.12, 0);
        rot = [0, 0, -sx * 0.3];
        break;
      default:
        // Folded (rose / button): a small flap tipping forward.
        g = new THREE.ConeGeometry(hr * 0.34, hr * 0.5, 6).scale(1, 1, 0.35).translate(0, hr * 0.2, 0);
        rot = [-1.1, 0, -sx * 0.5];
    }
    rigid.push({ geo: atBone(g, sk, e, [0, 0, 0], rot), color: d.earColor, bone: e });
  }
  for (const sx of [-1, 1]) {
    rigid.push({ geo: atBone(new THREE.SphereGeometry(hr * 0.13, 8, 6).scale(1, 1.1, 0.6), sk, NB.head, [sx * hr * 0.4 * pl.headW, hr * 0.2, -hr * 0.88]), color: 0x1d1612, bone: NB.head });
    rigid.push({ geo: atBone(new THREE.SphereGeometry(hr * 0.045, 5, 4), sk, NB.head, [sx * hr * 0.4 * pl.headW - hr * 0.04, hr * 0.26, -hr * 0.96]), color: 0xffffff, bone: NB.head });
  }
  const noseZ = pl.snout === 'short' ? -hr * 0.88 - s.d * 0.55 - 0.02 : -hr * 0.6 - (pl.snout === 'long' ? s.d + hr * 0.45 : s.d + hr * 0.2) - s.h * 0.35;
  const noseY = pl.snout === 'short' ? -hr * 0.12 : -hr * 0.3;
  rigid.push({ geo: atBone(new THREE.SphereGeometry(hr * 0.15, 8, 6).scale(1.2, 0.85, 0.8), sk, NB.head, [0, noseY, noseZ]), color: d.nose, bone: NB.head });
  if (pl.underbite) for (const sx of [-1, 1]) rigid.push({ geo: atBone(new THREE.ConeGeometry(hr * 0.05, hr * 0.14, 4), sk, NB.head, [sx * hr * 0.16, -hr * 0.46, -hr * 1.08]), color: 0xfbfaf4, bone: NB.head });
  for (const acc of d.accessories) {
    if (acc === 'sunglasses') {
      for (const sx of [-1, 1]) rigid.push({ geo: atBone(new THREE.SphereGeometry(hr * 0.27, 10, 6).scale(1.15, 0.72, 0.25), sk, NB.head, [sx * hr * 0.4 * pl.headW, hr * 0.22, -hr * 0.98]), color: A.lens, bone: NB.head });
      rigid.push({ geo: atBone(new THREE.BoxGeometry(hr * 0.3, 0.025, 0.025), sk, NB.head, [0, hr * 0.32, -hr * 1.02]), color: A.frame, bone: NB.head });
      for (const sx of [-1, 1]) rigid.push({ geo: atBone(new THREE.BoxGeometry(0.022, 0.022, hr * 0.9), sk, NB.head, [sx * hr * 0.78 * pl.headW, hr * 0.28, -hr * 0.55]), color: A.frame, bone: NB.head });
    } else if (acc === 'spikedCollar') {
      const rr = br * 0.72 * pl.wide;
      rigid.push({ geo: atBone(new THREE.TorusGeometry(rr, br * 0.1, 6, 18).rotateX(Math.PI / 2 - 0.4), sk, NB.neck, [0, -br * 0.1, br * 0.05]), color: A.collar, bone: NB.neck });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const g = new THREE.ConeGeometry(br * 0.08, br * 0.24, 5).rotateZ(a - Math.PI / 2).translate(Math.cos(a) * rr * 1.08, Math.sin(a) * rr * 1.08, 0).rotateX(Math.PI / 2 - 0.4);
        rigid.push({ geo: atBone(g, sk, NB.neck, [0, -br * 0.1, br * 0.05]), color: A.spike, bone: NB.neck });
      }
    } else if (acc === 'bandana') {
      rigid.push({ geo: atBone(new THREE.ConeGeometry(br * 0.85, br * 1.1, 3).rotateX(Math.PI).scale(1, 1, 0.4), sk, NB.neck, [0, -br * 0.55, -br * 0.35]), color: A.bandana, bone: NB.neck });
    } else if (acc === 'earTag') {
      rigid.push({ geo: atBone(new THREE.BoxGeometry(hr * 0.22, hr * 0.16, 0.012), sk, NB.earR, [0, hr * 0.12, -hr * 0.05]), color: A.earTag, bone: NB.earR });
    }
  }

  const body = new THREE.Color(d.body.color);
  const head = new THREE.Color(d.head.color);
  const snout = new THREE.Color(s.color);
  const leg = new THREE.Color(d.legColor);
  const tail = new THREE.Color(d.tail.color);
  const under = d.underside !== undefined ? new THREE.Color(d.underside) : null;
  const patches = d.patches.map((c) => new THREE.Color(c));
  const seed = Math.round(d.body.color / 131);
  const colorAt = (x: number, y: number, z: number, prim: number, out: THREE.Color) => {
    const part = parts[prim];
    if (part === 'head') out.copy(head);
    else if (part === 'snout' || part === 'jaw') out.copy(snout);
    else if (part === 'leg') out.copy(body).lerp(leg, THREE.MathUtils.smoothstep(bh - y, 0.02, 0.15));
    else if (part === 'paw') out.copy(leg);
    else if (part === 'tail') out.copy(tail);
    else if (part === 'cheek') out.copy(under ?? snout);
    else out.copy(body);
    // Patches on the coat (not on the face or paws).
    if ((part === 'body' || part === 'mane' || part === 'head') && patches.length) {
      const n = vnoise(x * 5 + 2, y * 5, z * 5, seed);
      if (n > 0.6) out.copy(patches[0]);
      else if (patches.length > 1 && vnoise(x * 6, y * 6 + 5, z * 6, seed + 3) > 0.7) out.copy(patches[1]);
    }
    // Lighter underside (Shiba and Akita urajiro).
    if (under && (part === 'body' || part === 'mane') && y < bh - br * 0.15) out.lerp(under, 0.9);
    if (under && part === 'tail' && y < R[NB.tail].y + 0.02) out.lerp(under, 0.6);
  };
  return buildSkinnedGeometry(prims, 0.07, 0.022 * (d.body.radius / 0.17), sk.bones.length, colorAt, rigid, 0.03, 3800);
}
