import * as THREE from 'three';
import { RENDER } from '../data/render';

/** Shared uniforms so every curved material bends identically. */
export const curveUniforms = {
  uCurveDown: { value: RENDER.curveDown as number },
  uCurveSide: { value: RENDER.curveSide as number },
};

let gradientMap: THREE.DataTexture | null = null;

function getGradientMap(): THREE.DataTexture {
  if (gradientMap) return gradientMap;
  const steps = RENDER.toonSteps;
  const data = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  gradientMap = new THREE.DataTexture(data, steps.length, 1, THREE.RGBAFormat);
  gradientMap.minFilter = THREE.NearestFilter;
  gradientMap.magFilter = THREE.NearestFilter;
  gradientMap.needsUpdate = true;
  return gradientMap;
}

const CURVE_DECL = '#include <common>\nuniform float uCurveDown;\nuniform float uCurveSide;';
const CURVE_BEND = `#include <project_vertex>
  float wrDepth = max(-mvPosition.z, 0.0);
  float wrD2 = wrDepth * wrDepth;
  mvPosition.y -= uCurveDown * wrD2;
  mvPosition.x += uCurveSide * wrD2;
  gl_Position = projectionMatrix * mvPosition;`;

interface VertexPatch {
  decl: string;
  beginVertex: string;
  uniforms: Record<string, THREE.IUniform>;
  key: string;
}

/** Applies the curved-world bend in view space (down and sideways with depth). */
export function applyCurvedWorld(mat: THREE.Material, patch?: VertexPatch): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCurveDown = curveUniforms.uCurveDown;
    shader.uniforms.uCurveSide = curveUniforms.uCurveSide;
    let vs = shader.vertexShader
      .replace('#include <common>', CURVE_DECL + (patch ? '\n' + patch.decl : ''))
      .replace('#include <project_vertex>', CURVE_BEND);
    if (patch) {
      Object.assign(shader.uniforms, patch.uniforms);
      vs = vs.replace('#include <begin_vertex>', patch.beginVertex);
    }
    shader.vertexShader = vs;
  };
  mat.customProgramCacheKey = () => 'curvedWorld' + (patch ? patch.key : '');
}

export interface ToonOptions {
  vertexColors?: boolean;
  map?: THREE.Texture;
}

export function createToonMaterial(color: number, opts: ToonOptions = {}): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    vertexColors: opts.vertexColors ?? false,
    map: opts.map ?? null,
  });
  applyCurvedWorld(mat);
  return mat;
}

const OUTLINE_PATCH: VertexPatch = {
  decl: 'uniform float uOutline;',
  beginVertex: 'vec3 transformed = vec3(position) + normalize(normal) * uOutline;',
  uniforms: { uOutline: { value: RENDER.outline } },
  key: 'Outline',
};

/** Inverted-hull ink outline: back faces extruded along normals. Characters only. */
export function createOutlineMaterial(): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ color: RENDER.ink, side: THREE.BackSide });
  applyCurvedWorld(mat, OUTLINE_PATCH);
  return mat;
}
