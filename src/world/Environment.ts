import * as THREE from 'three';
import { FOG, type BasePalette } from '../data/cities';
import { RENDER } from '../data/render';
import { createSkyTexture } from '../render/Sky';

/** Sky gradient, fog and golden-hour lighting; swaps palettes when the city changes. */
export class Environment {
  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  readonly fog: THREE.Fog;
  sky: THREE.Texture | null = null;

  constructor(private readonly scene: THREE.Scene, p: BasePalette) {
    this.fog = new THREE.Fog(p.fog, FOG.near, FOG.far);
    scene.fog = this.fog;
    this.hemi = new THREE.HemisphereLight(p.hemiSky, p.hemiGround, RENDER.hemiIntensity);
    this.sun = new THREE.DirectionalLight(p.sun, RENDER.sunIntensity);
    this.sun.position.set(...RENDER.sunPos);
    scene.add(this.hemi, this.sun);
    this.setPalette(p);
  }

  setPalette(p: BasePalette): void {
    this.sky?.dispose();
    this.sky = createSkyTexture(p);
    this.scene.background = this.sky;
    this.fog.color.setHex(p.fog);
    this.hemi.color.setHex(p.hemiSky);
    this.hemi.groundColor.setHex(p.hemiGround);
    this.sun.color.setHex(p.sun);
  }
}
