import { describe, expect, it } from 'vitest';
import { CATS, CAT_IDS } from '../src/data/cats';
import { buildCat } from '../src/procgen/cat';
import * as THREE from 'three';

function stats(root: THREE.Object3D) {
  let tris = 0;
  let skinned = 0;
  let weightsOk = true;
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh || m.userData.ink === undefined) return;
    skinned++;
    tris += (m.geometry.index?.count ?? 0) / 3;
    const w = m.geometry.getAttribute('skinWeight');
    for (let i = 0; i < w.count; i++) {
      const s = w.getX(i) + w.getY(i) + w.getZ(i) + w.getW(i);
      if (Math.abs(s - 1) > 1e-3) weightsOk = false;
    }
  });
  return { tris, skinned, weightsOk };
}

describe('procedural cats', () => {
  for (const id of CAT_IDS) {
    it(`${id}: one smooth skinned body under 6k triangles`, () => {
      const t0 = performance.now();
      const rig = buildCat(CATS[id]);
      const ms = performance.now() - t0;
      const s = stats(rig.root);
      expect(s.skinned).toBe(1);
      expect(s.tris).toBeGreaterThan(1500);
      expect(s.tris).toBeLessThan(6000);
      expect(s.weightsOk).toBe(true);
      expect(rig.legs).toHaveLength(4);
      expect(rig.knees).toHaveLength(4);
      expect(ms).toBeLessThan(2000);
      // Second build reuses the cached geometry.
      const t1 = performance.now();
      buildCat(CATS[id]);
      expect(performance.now() - t1).toBeLessThan(50);
      console.info(`${id}: ${s.tris} tris, ${ms.toFixed(0)} ms`);
    });
  }
});

import { DOGS } from '../src/data/dogs';
import { buildDog } from '../src/procgen/dog';

describe('procedural dogs', () => {
  for (const id of Object.keys(DOGS)) {
    it(`${id}: one smooth skinned body under 6k triangles`, () => {
      const rig = buildDog(DOGS[id]);
      const s = stats(rig.root);
      expect(s.skinned).toBe(1);
      expect(s.tris).toBeGreaterThan(1500);
      expect(s.tris).toBeLessThan(6000);
      expect(s.weightsOk).toBe(true);
      expect(rig.knees).toHaveLength(4);
      expect(rig.tails.length).toBeGreaterThan(1);
    });
  }
  it('has the Tokyo and Tbilisi breeds ready', () => {
    for (const id of ['shiba', 'akita', 'nagazi', 'streetDog']) expect(DOGS[id]).toBeDefined();
    expect(DOGS.streetDog.accessories).toContain('earTag');
  });
});
