import * as THREE from 'three';
import { RENDER } from '../data/render';
import { applyCurvedWorld, curveUniforms } from '../render/ToonMaterial';
import { polygonize, type Prim, type V3 } from './sdf';

/** A bone: parent index (-1 = root), position relative to the parent, optional rest rotation. */
export interface BoneSpec {
  name: string;
  parent: number;
  pos: V3;
  rot?: V3;
}

export interface Skeleton {
  bones: THREE.Bone[];
  /** Rest-pose world (model space) position of each bone. */
  rest: THREE.Vector3[];
  byName: Map<string, number>;
}

export function buildSkeleton(specs: readonly BoneSpec[]): Skeleton {
  const bones: THREE.Bone[] = [];
  const byName = new Map<string, number>();
  specs.forEach((s, i) => {
    const b = new THREE.Bone();
    b.name = s.name;
    b.position.set(s.pos[0], s.pos[1], s.pos[2]);
    if (s.rot) b.rotation.set(s.rot[0], s.rot[1], s.rot[2]);
    if (s.parent >= 0) bones[s.parent].add(b);
    bones.push(b);
    byName.set(s.name, i);
  });
  bones[0].updateMatrixWorld(true);
  const rest = bones.map((b) => b.getWorldPosition(new THREE.Vector3()));
  return { bones, rest, byName };
}

/** A rigid part (eye, ear, sunglasses...): its own geometry, colour and bone, weight 1. */
export interface RigidPart {
  geo: THREE.BufferGeometry;
  color: number;
  bone: number;
}

const tmpC = new THREE.Color();

/**
 * Builds one skinned geometry: the polygonised body (coloured per vertex by `colorAt`) plus rigid
 * parts, all with position, normal, color, skinIndex and skinWeight. One draw call per character.
 */
export function buildSkinnedGeometry(
  prims: readonly Prim[],
  k: number,
  cell: number,
  boneCount: number,
  colorAt: (x: number, y: number, z: number, prim: number, out: THREE.Color) => void,
  rigid: readonly RigidPart[],
  sigma = 0.025,
  targetTris = 4000,
): THREE.BufferGeometry {
  const poly = polygonize(prims, k, cell, boneCount, sigma, targetTris);
  const nBody = poly.positions.length / 3;
  let nRigid = 0;
  let iRigid = 0;
  const rg = rigid.map((r) => {
    const g = r.geo;
    nRigid += g.getAttribute('position').count;
    iRigid += g.index ? g.index.count : g.getAttribute('position').count;
    return g;
  });
  const n = nBody + nRigid;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  const si = new Uint16Array(n * 4);
  const sw = new Float32Array(n * 4);
  const idx = new Uint32Array(poly.index.length + iRigid);
  pos.set(poly.positions);
  nor.set(poly.normals);
  si.set(poly.skinIndex);
  sw.set(poly.skinWeight);
  idx.set(poly.index);
  for (let i = 0; i < nBody; i++) {
    colorAt(poly.positions[i * 3], poly.positions[i * 3 + 1], poly.positions[i * 3 + 2], poly.nearest[i], tmpC);
    col[i * 3] = tmpC.r;
    col[i * 3 + 1] = tmpC.g;
    col[i * 3 + 2] = tmpC.b;
  }
  let v = nBody;
  let t = poly.index.length;
  rg.forEach((g, r) => {
    const p = g.getAttribute('position');
    const nm = g.getAttribute('normal');
    tmpC.setHex(rigid[r].color);
    for (let i = 0; i < p.count; i++) {
      pos[(v + i) * 3] = p.getX(i);
      pos[(v + i) * 3 + 1] = p.getY(i);
      pos[(v + i) * 3 + 2] = p.getZ(i);
      nor[(v + i) * 3] = nm.getX(i);
      nor[(v + i) * 3 + 1] = nm.getY(i);
      nor[(v + i) * 3 + 2] = nm.getZ(i);
      col[(v + i) * 3] = tmpC.r;
      col[(v + i) * 3 + 1] = tmpC.g;
      col[(v + i) * 3 + 2] = tmpC.b;
      si[(v + i) * 4] = rigid[r].bone;
      sw[(v + i) * 4] = 1;
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[t++] = g.index.getX(i) + v;
    else for (let i = 0; i < p.count; i++) idx[t++] = i + v;
    v += p.count;
    g.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}

/** Places a rigid geometry at a bone's rest position (model space), with an optional local offset. */
export function atBone(geo: THREE.BufferGeometry, sk: Skeleton, bone: number, offset: V3 = [0, 0, 0], rot?: V3): THREE.BufferGeometry {
  const b = sk.bones[bone];
  const m = new THREE.Matrix4().copy(b.matrixWorld);
  const local = new THREE.Matrix4().compose(new THREE.Vector3(...offset), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
  return geo.applyMatrix4(m.multiply(local));
}

// ---- Materials -------------------------------------------------------------------------------

export const furUniforms = {
  uRim: { value: 0.35 },
  uFuzz: { value: 0.18 },
  uRimColor: { value: new THREE.Color(0xfff0d8) },
};

let furMat: THREE.MeshToonMaterial | null = null;
let thinInk: THREE.MeshBasicMaterial | null = null;

function toonGradient(): THREE.DataTexture {
  const steps = RENDER.toonSteps;
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  const t = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

/**
 * Character fur: 3-band toon ramp with vertex colours, a warm rim light and a dithered fresnel
 * "fuzz" on the silhouette so coats read soft without fur cards. Shares the curved-world bend.
 */
export function furMaterial(): THREE.MeshToonMaterial {
  if (furMat) return furMat;
  const m = new THREE.MeshToonMaterial({ color: 0xffffff, vertexColors: true, gradientMap: toonGradient() });
  applyCurvedWorld(m);
  const curve = m.onBeforeCompile;
  m.onBeforeCompile = (shader, r) => {
    curve(shader, r);
    shader.uniforms.uCurveDown = curveUniforms.uCurveDown;
    shader.uniforms.uRim = furUniforms.uRim;
    shader.uniforms.uFuzz = furUniforms.uFuzz;
    shader.uniforms.uRimColor = furUniforms.uRimColor;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uRim;\nuniform float uFuzz;\nuniform vec3 uRimColor;')
      .replace(
        '#include <opaque_fragment>',
        `float wrNdV = abs(dot(normal, normalize(vViewPosition)));
  float wrEdge = pow(1.0 - wrNdV, 3.0);
  float wrN = fract(sin(dot(floor(gl_FragCoord.xy * 0.5), vec2(12.9898, 78.233))) * 43758.5453);
  outgoingLight += uRimColor * wrEdge * uRim * diffuseColor.rgb;
  outgoingLight = mix(outgoingLight, outgoingLight * (0.86 + 0.28 * wrN), smoothstep(0.35, 0.85, wrEdge) * uFuzz * 4.0);
  #include <opaque_fragment>`,
      );
  };
  m.customProgramCacheKey = () => 'wrFur';
  furMat = m;
  return m;
}

/** Thinner inverted-hull outline for characters (silhouette only). */
export function thinOutline(): THREE.MeshBasicMaterial {
  if (thinInk) return thinInk;
  const mat = new THREE.MeshBasicMaterial({ color: RENDER.ink, side: THREE.BackSide });
  applyCurvedWorld(mat, {
    decl: 'uniform float uOutlineThin;',
    beginVertex: 'vec3 transformed = vec3(position) + normalize(normal) * uOutlineThin;',
    uniforms: { uOutlineThin: { value: RENDER.outline * 0.6 } },
    key: 'OutlineThin',
  });
  thinInk = mat;
  return mat;
}

/** Skinned body + outline sharing one skeleton, under `root`. Returns the body mesh. */
export function skinnedBody(root: THREE.Object3D, geo: THREE.BufferGeometry, sk: Skeleton): THREE.SkinnedMesh {
  const body = new THREE.SkinnedMesh(geo, furMaterial());
  body.add(sk.bones[0]);
  // Bind in model space (before parenting under the scaled root).
  body.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(sk.bones);
  body.bind(skeleton);
  const ink = new THREE.SkinnedMesh(geo, thinOutline());
  ink.bind(skeleton, body.bindMatrix);
  root.add(body, ink);
  body.frustumCulled = ink.frustumCulled = false;
  body.userData.ink = ink;
  return body;
}

// ---- Small helpers ---------------------------------------------------------------------------

/** Smooth 3D value noise in [0, 1]. */
export function vnoise(x: number, y: number, z: number, seed: number): number {
  const h = (i: number, j: number, k: number) => {
    let n = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 2147483647) ^ Math.imul(seed, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const fx = x - xi, fy = y - yi, fz = z - zi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(
    l(l(h(xi, yi, zi), h(xi + 1, yi, zi), sx), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), sx), sy),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), sx), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), sx), sy),
    sz,
  );
}

/** Ellipsoid primitive helper. */
export function ell(c: V3, r: V3, bone: number, k?: number): Prim {
  return { kind: 'ell', c, r, bone, k };
}

/** Tapered capsule between two points. */
export function cap(a: V3, b: V3, ra: number, rb: number, bone: number, k?: number): Prim {
  return { kind: 'cap', a, b, ra, rb, bone, k };
}

export function v3(v: THREE.Vector3, dx = 0, dy = 0, dz = 0): V3 {
  return [v.x + dx, v.y + dy, v.z + dz];
}
