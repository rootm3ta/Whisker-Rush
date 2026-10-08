import * as THREE from 'three';
import { RENDER } from '../data/render';

/** Shared uniforms so every toon material bends identically. */
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

/** Applies the curved-world bend in view space (bends down and sideways with distance). */
export function applyCurvedWorld(mat: THREE.Material): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCurveDown = curveUniforms.uCurveDown;
    shader.uniforms.uCurveSide = curveUniforms.uCurveSide;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uCurveDown;\nuniform float uCurveSide;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        float wrDepth = max(-mvPosition.z, 0.0);
        float wrD2 = wrDepth * wrDepth;
        mvPosition.y -= uCurveDown * wrD2;
        mvPosition.x += uCurveSide * wrD2;
        gl_Position = projectionMatrix * mvPosition;`,
      );
  };
  mat.customProgramCacheKey = () => 'curvedWorld';
}

export function createToonMaterial(color: number): THREE.MeshToonMaterial {
  const mat = new THREE.MeshToonMaterial({ color, gradientMap: getGradientMap() });
  applyCurvedWorld(mat);
  return mat;
}
