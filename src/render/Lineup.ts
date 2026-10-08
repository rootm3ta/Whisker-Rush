import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { CATS, CAT_IDS } from '../data/cats';
import { DOGS } from '../data/dogs';
import { Cat, type CatDrive } from '../entities/Cat';
import { Dog } from '../entities/Dog';

/**
 * Dev-only character lineup (`?lineup`, add `&run` to gallop, `&dogs` for dogs only,
 * `&hat=beret` to dress the cats). Used for screenshots and model reviews.
 */
export function startLineup(host: HTMLElement): void {
  const q = new URLSearchParams(location.search);
  const running = q.has('run');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3e2c4);
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x8a6a4f, 1.2));
  const sun = new THREE.DirectionalLight(0xffc98a, 2.4);
  sun.position.set(2, 5, 4);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const bus = new EventBus<GameEvents>();
  const cats: Cat[] = [];
  const dogs: Dog[] = [];
  const onlyDogs = q.has('dogs');
  const hat = q.get('hat');
  if (!onlyDogs)
    CAT_IDS.forEach((id, i) => {
      const c = new Cat(bus);
      c.setLook(id, hat ? { head: hat, neck: q.get('neck') ?? undefined, back: q.get('back') ?? undefined, eyes: q.get('eyes') ?? undefined, tail: q.get('tail') ?? undefined } : {});
      c.holder.position.set((i % 3) * 2.2 - 2.2, 0, Math.floor(i / 3) * 2.4 - 1.2);
      c.holder.scale.setScalar(0.9);
      scene.add(c.holder);
      cats.push(c);
    });
  const dogIds = Object.keys(DOGS);
  dogIds.forEach((id, i) => {
    const d = new Dog(DOGS[id]);
    const cols = 4;
    d.rig.root.position.set((i % cols) * 2 - 3, 0, (onlyDogs ? -1.5 : 3.6) + Math.floor(i / cols) * 2.2);
    scene.add(d.rig.root);
    dogs.push(d);
  });
  const drive: CatDrive = {
    x: 0, y: 0, vy: 0, speed: running ? 14 : 0, grounded: true, sliding: false, grinding: false, running,
    hidden: false, dizzy: false, flicker: false, boxed: false, nap: false, loaf: false, lift: 0,
  };
  const label = document.createElement('div');
  label.style.cssText = 'position:fixed;left:8px;top:8px;font:12px monospace;color:#2a201c';
  label.textContent = `${CAT_IDS.map((i) => CATS[i].name).join(', ')} | ${dogIds.map((i) => DOGS[i].name).join(', ')}`;
  host.appendChild(label);
  const resize = () => {
    renderer.setSize(host.clientWidth, host.clientHeight);
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);
  const view = Number(q.get('view') ?? 0.6);
  let last = performance.now();
  let t = 0;
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    const ang = q.has('spin') ? t * 0.4 : view;
    camera.position.set(Math.sin(ang) * 12, 4.2, Math.cos(ang) * 12 + (onlyDogs ? -1 : 1.2));
    camera.lookAt(0, 0.4, onlyDogs ? -0.5 : 1.2);
    for (const c of cats) c.update(dt, drive);
    for (const d of dogs) d.update(dt, 1, running, false);
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
}
