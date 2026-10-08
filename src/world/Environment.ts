import * as THREE from 'three';
import { FOG, type CityPalette } from '../data/cities';
import { RENDER } from '../data/render';
import { createSkyTexture } from '../render/Sky';

/** Sky gradient, fog and golden-hour lighting for a city palette. */
export function applyEnvironment(scene: THREE.Scene, p: CityPalette): void {
  scene.background = createSkyTexture(p);
  scene.fog = new THREE.Fog(p.fog, FOG.near, FOG.far);
  scene.add(new THREE.HemisphereLight(p.hemiSky, p.hemiGround, RENDER.hemiIntensity));
  const sun = new THREE.DirectionalLight(p.sun, RENDER.sunIntensity);
  sun.position.set(...RENDER.sunPos);
  scene.add(sun);
}
