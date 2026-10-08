import * as THREE from 'three';
import type { CityPalette } from '../data/cities';

/** Vertical gradient sky as a tiny canvas texture used for scene.background. */
export function createSkyTexture(p: CityPalette): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, hex(p.skyTop));
  grad.addColorStop(0.62, hex(p.skyHorizon));
  grad.addColorStop(1, hex(p.fog));
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function hex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}
