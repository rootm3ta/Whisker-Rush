import * as THREE from 'three';
import { CITIES, FOG } from '../data/cities';
import { TEST_SCENE as T } from '../data/testScene';
import { Rng } from '../core/Rng';
import { createToonMaterial } from '../render/ToonMaterial';
import { createSkyTexture } from '../render/Sky';

/** Curved-world sanity scene: long ground strip, receding instanced boxes, sky, fog. */
export class TestScene {
  readonly scene = new THREE.Scene();
  private readonly boxes: THREE.InstancedMesh;
  private readonly sides: THREE.InstancedMesh;
  private readonly boxZ: Float32Array;
  private readonly boxX: Float32Array;
  private readonly boxS: Float32Array;
  private readonly sideZ: Float32Array;
  private readonly sideX: Float32Array;
  private readonly sideS: Float32Array;
  private readonly dummy = new THREE.Object3D();
  private readonly loop = T.boxCount * T.boxSpacing;

  constructor() {
    const p = CITIES.mapleLane.palette;
    const rng = new Rng(T.seed);
    this.scene.background = createSkyTexture(p);
    this.scene.fog = new THREE.Fog(p.fog, FOG.near, FOG.far);

    this.scene.add(new THREE.HemisphereLight(p.sun, p.ambient, 1.2));
    const sun = new THREE.DirectionalLight(p.sun, 2.2);
    sun.position.set(-6, 12, 4);
    this.scene.add(sun);

    // Ground: subdivided along length so the vertex bend is smooth.
    const groundGeo = new THREE.PlaneGeometry(T.groundWidth * 4, T.groundLength, 4, T.groundSegments);
    groundGeo.rotateX(-Math.PI / 2);
    groundGeo.translate(0, 0, -T.groundLength / 2 + 20);
    this.scene.add(new THREE.Mesh(groundGeo, createToonMaterial(p.ground)));

    const roadGeo = new THREE.PlaneGeometry(T.groundWidth, T.groundLength, 1, T.groundSegments);
    roadGeo.rotateX(-Math.PI / 2);
    roadGeo.translate(0, 0.01, -T.groundLength / 2 + 20);
    this.scene.add(new THREE.Mesh(roadGeo, createToonMaterial(p.props[3])));

    const stripeMat = createToonMaterial(p.lane);
    for (const x of [-T.laneWidth / 2, T.laneWidth / 2]) {
      const g = new THREE.PlaneGeometry(T.stripeWidth, T.groundLength, 1, T.groundSegments);
      g.rotateX(-Math.PI / 2);
      g.translate(x, 0.02, -T.groundLength / 2 + 20);
      this.scene.add(new THREE.Mesh(g, stripeMat));
    }

    // Obstacle-like boxes in lanes.
    const boxGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6, 1, 1, 2);
    this.boxes = new THREE.InstancedMesh(boxGeo, createToonMaterial(0xffffff), T.boxCount);
    this.boxZ = new Float32Array(T.boxCount);
    this.boxX = new Float32Array(T.boxCount);
    this.boxS = new Float32Array(T.boxCount);
    const col = new THREE.Color();
    for (let i = 0; i < T.boxCount; i++) {
      this.boxZ[i] = -i * T.boxSpacing - 10;
      this.boxX[i] = (rng.int(0, 3) - 1) * T.laneWidth;
      this.boxS[i] = rng.range(0.6, 1.1);
      this.boxes.setColorAt(i, col.setHex(rng.pick(p.props)));
    }
    this.scene.add(this.boxes);

    // Tall "house" blocks lining both sides.
    const sideGeo = new THREE.BoxGeometry(5, 6, 6, 1, 2, 3);
    sideGeo.translate(0, 3, 0);
    this.sides = new THREE.InstancedMesh(sideGeo, createToonMaterial(0xffffff), T.sideBoxCount);
    this.sideZ = new Float32Array(T.sideBoxCount);
    this.sideX = new Float32Array(T.sideBoxCount);
    this.sideS = new Float32Array(T.sideBoxCount);
    for (let i = 0; i < T.sideBoxCount; i++) {
      const left = i % 2 === 0;
      this.sideZ[i] = -Math.floor(i / 2) * (this.loop / (T.sideBoxCount / 2)) - 5;
      this.sideX[i] = (left ? -1 : 1) * (T.sideOffset + rng.range(0, 2));
      this.sideS[i] = rng.range(0.7, 1.4);
      this.sides.setColorAt(i, col.setHex(rng.pick(p.props)));
    }
    this.scene.add(this.sides);
    this.step(0);
  }

  /** Fixed-step update: scroll world toward the camera. Allocation-free. */
  step(dt: number): void {
    const dz = T.scrollSpeed * dt;
    this.scroll(this.boxes, this.boxZ, this.boxX, this.boxS, dz);
    this.scroll(this.sides, this.sideZ, this.sideX, this.sideS, dz);
  }

  private scroll(mesh: THREE.InstancedMesh, z: Float32Array, x: Float32Array, s: Float32Array, dz: number): void {
    const d = this.dummy;
    for (let i = 0; i < z.length; i++) {
      z[i] += dz;
      if (z[i] > 15) z[i] -= this.loop;
      d.position.set(x[i], (s[i] * 1.6) / 2, z[i]);
      if (mesh === this.sides) d.position.y = 0;
      d.scale.set(1, s[i], 1);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
}
