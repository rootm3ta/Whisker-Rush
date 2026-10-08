import * as THREE from 'three';
import { RENDER, SIM } from './data/render';
import { TEST_SCENE } from './data/testScene';
import { TestScene } from './world/TestScene';

const host = document.getElementById('app')!;
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.maxDpr));
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(RENDER.fov, 1, RENDER.near, RENDER.far);
camera.position.set(...TEST_SCENE.cameraPos);
camera.lookAt(...TEST_SCENE.cameraLookAt);

const world = new TestScene();

function resize(): void {
  const w = host.clientWidth;
  const h = host.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Fixed-step simulation with accumulator; render every frame.
const stepSec = 1 / SIM.hz;
let acc = 0;
let last = performance.now();
function frame(now: number): void {
  acc += Math.min((now - last) / 1000, SIM.maxFrameSec);
  last = now;
  while (acc >= stepSec) {
    world.step(stepSec);
    acc -= stepSec;
  }
  renderer.render(world.scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
