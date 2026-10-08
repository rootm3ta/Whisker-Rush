import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { DOGS } from '../data/dogs';
import { ADA, COMIC, STORY_COLORS as K } from '../data/story';
import { Cat, type CatDrive } from '../entities/Cat';
import { Dog } from '../entities/Dog';
import { createToonMaterial } from './ToonMaterial';

export interface Panel {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** `t` is seconds since the panel started. */
  update(t: number, dt: number): void;
}

function box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), createToonMaterial(color));
  m.position.set(x, y, z);
  return m;
}

function baseScene(bg: number): THREE.Scene {
  const s = new THREE.Scene();
  s.background = new THREE.Color(bg);
  s.add(new THREE.HemisphereLight(0xfff1dc, 0x8a6a4f, 1.2));
  const sun = new THREE.DirectionalLight(0xffd9a8, 2.3);
  sun.position.set(3, 6, 4);
  s.add(sun);
  return s;
}

function drive(): CatDrive {
  return {
    x: 0, y: 0, vy: 0, speed: 0, grounded: true, sliding: false, grinding: false, running: false,
    hidden: false, dizzy: false, flicker: false, boxed: false, nap: false, loaf: false, lift: 0,
  };
}

function textPlane(text: string, w: number, h: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbf6ec';
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#2a201c';
  g.lineWidth = 8;
  g.strokeRect(4, 4, 248, 120);
  g.fillStyle = '#2a201c';
  g.font = 'bold 34px Fredoka, Nunito, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const words = text.split(': ');
  g.fillText(words[0] + (words[1] ? ':' : ''), 128, 44);
  if (words[1]) g.fillText(words[1], 128, 88);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

/** Ada: a simple person built from primitives (body, head, hair bun, arms). */
function buildAda(): { root: THREE.Group; torso: THREE.Group; arm: THREE.Group } {
  const root = new THREE.Group();
  const legs = box(0.34, 0.8, 0.2, ADA.pants, 0, 0.4, 0);
  const torso = new THREE.Group();
  torso.position.y = 0.8;
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), createToonMaterial(ADA.sweater));
  chest.position.y = 0.32;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), createToonMaterial(ADA.skin));
  head.position.y = 0.82;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI / 1.8), createToonMaterial(ADA.hair));
  hair.position.y = 0.85;
  hair.rotation.x = 0.3;
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), createToonMaterial(ADA.hair));
  bun.position.set(0, 0.98, 0.12);
  const arm = new THREE.Group();
  arm.position.set(0.24, 0.55, 0);
  const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.45, 3, 8), createToonMaterial(ADA.sweater));
  a.position.y = -0.25;
  arm.add(a);
  const arm2 = arm.clone();
  arm2.position.x = -0.24;
  torso.add(chest, head, hair, bun, arm, arm2);
  root.add(legs, torso);
  return { root, torso, arm };
}

/** Panel 1, "Sunday.": Miso dozes on the sill, Ada packs, kisses her head, a postcard falls unnoticed. */
function panelSunday(): Panel {
  const s = baseScene(K.sky);
  const cam = new THREE.PerspectiveCamera(42, 1.4, 0.1, 40);
  s.add(box(10, 6, 0.2, K.houseWall, 0, 2, -3));
  s.add(box(10, 0.1, 8, 0xc08a5a, 0, -0.05, 0));
  // Window frame and sill.
  s.add(box(2.6, 0.12, 0.7, K.sill, -0.4, 0.9, -1.6), box(2.6, 0.1, 0.1, K.sill, -0.4, 2.6, -2.85));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshBasicMaterial({ color: K.sky }));
  glass.position.set(-0.4, 1.8, -2.88);
  s.add(glass);
  // Table with suitcase and postcard.
  s.add(box(1.4, 0.08, 0.8, K.table, 1.6, 0.8, -1.4));
  for (const x of [1.0, 2.2]) s.add(box(0.07, 0.8, 0.07, K.table, x, 0.4, -1.4));
  const suitcase = box(0.7, 0.35, 0.45, ADA.suitcase, 1.7, 1.02, -1.5);
  const lid = box(0.7, 0.06, 0.45, ADA.suitcase, 0, 0, 0);
  const lidPivot = new THREE.Group();
  lidPivot.position.set(1.7, 1.2, -1.72);
  lid.position.set(0, 0, 0.22);
  lidPivot.add(lid);
  lidPivot.rotation.x = -1.6;
  s.add(suitcase, lidPivot);
  const postcard = box(0.22, 0.01, 0.15, K.postcard, 1.05, 0.85, -1.25);
  s.add(postcard);

  const cat = new Cat(new EventBus<GameEvents>());
  cat.holder.position.set(-0.55, 0.96, -1.6);
  cat.holder.scale.setScalar(0.7);
  cat.holder.rotation.y = -1.2;
  cat.shadow.visible = false;
  s.add(cat.holder);
  const d = drive();
  d.nap = true;

  const ada = buildAda();
  ada.root.position.set(0.7, 0, -1.9);
  ada.root.rotation.y = -0.6;
  s.add(ada.root);

  return {
    scene: s,
    camera: cam,
    update(t, dt) {
      cam.position.set(0.1 + Math.sin(t * 0.3) * 0.12, 1.55, 1.3);
      cam.lookAt(0.2, 1.15, -1.7);
      cat.update(dt, d);
      // Packing, then leaning over to kiss Miso's head, then closing the suitcase.
      const lean = t > 1.4 && t < 3.6 ? Math.sin(((t - 1.4) / 2.2) * Math.PI) : 0;
      ada.root.position.x = 0.7 - lean * 0.75;
      ada.torso.rotation.z = lean * 0.55;
      ada.arm.rotation.z = t < 1.4 ? -0.6 + Math.sin(t * 6) * 0.3 : -0.2;
      lidPivot.rotation.x = t > 4.2 ? -1.6 + Math.min(1, (t - 4.2) / 0.5) * 1.6 : -1.6;
      // The postcard slides off the table behind Miso, unnoticed.
      if (t > 5.4) {
        const f = Math.min(1, (t - 5.4) / 0.6);
        postcard.position.set(1.05 - f * 0.3, 0.85 - f * f * 0.82, -1.25 + f * 0.1);
        postcard.rotation.z = f * 2.2;
      }
    },
  };
}

/** Panel 2, "The Sausage.": the reserved sausage on a gold hook, huge pupils, then an empty hook. */
function panelSausage(): Panel {
  const s = baseScene(K.sky);
  const cam = new THREE.PerspectiveCamera(42, 1.4, 0.1, 40);
  s.add(box(10, 5, 0.3, K.shopWall, 0, 2, -3));
  s.add(box(10, 0.1, 8, K.street, 0, -0.05, 0));
  const awning = box(3.4, 0.12, 1.0, K.awning, 0, 2.9, -2.5);
  awning.rotation.x = 0.35;
  s.add(awning);
  s.add(box(2.6, 1.7, 0.05, K.window, 0, 1.75, -2.82));
  for (let i = 0; i < 4; i++) s.add(box(0.35, 0.12, 0.2, 0xe8a07a, -0.9 + i * 0.6, 1.05, -2.75));
  s.add(box(0.06, 0.06, 0.6, K.hook, 0, 2.45, -2.6));
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 14, Math.PI * 1.4), createToonMaterial(K.hook));
  hook.position.set(0, 2.32, -2.4);
  hook.rotation.z = Math.PI * 0.8;
  s.add(hook);
  const sausage = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.7, 6, 10), createToonMaterial(K.sausage));
  sausage.position.set(0, 1.9, -2.4);
  sausage.rotation.z = 0.15;
  s.add(sausage);
  const tag = textPlane(COMIC.tag, 0.75, 0.38);
  tag.position.set(0.42, 1.95, -2.38);
  tag.rotation.z = -0.15;
  s.add(tag);

  const cat = new Cat(new EventBus<GameEvents>());
  // Side-on so we can see her face while she stares at the window.
  cat.holder.position.set(-0.6, 0, -0.9);
  cat.holder.scale.setScalar(0.85);
  cat.holder.rotation.y = -0.95;
  cat.shadow.visible = false;
  s.add(cat.holder);
  const d = drive();

  return {
    scene: s,
    camera: cam,
    update(t, dt) {
      cam.position.set(0.0 + Math.sin(t * 0.35) * 0.1, 1.15, 2.4);
      cam.lookAt(-0.15, 1.15, -1.8);
      const swiped = t > 4.6;
      sausage.visible = !swiped;
      tag.rotation.z = -0.15 + (swiped ? Math.sin(t * 9) * 0.25 * Math.max(0, 1 - (t - 4.6)) : 0);
      d.running = swiped;
      d.speed = swiped ? 4 : 0;
      if (swiped) {
        // Next frame: Miso strolls off with it, tail high.
        cat.holder.rotation.y = -Math.PI / 2;
        cat.holder.position.x = -0.6 + (t - 4.6) * 0.6;
      }
      cat.update(dt, d);
      // Pupils go huge.
      const big = t > 1.5 && !swiped ? 2.2 : 1;
      cat.rig.eyes[0].scale.set(big, big * 1.15, 0.5);
      cat.rig.eyes[1].scale.set(big, big * 1.15, 0.5);
      if (swiped) {
        if (!cat.rig.head.userData.sausage) {
          const held = sausage.clone();
          held.visible = true;
          held.position.set(0, -0.08, -0.25);
          held.rotation.set(0, 0, Math.PI / 2);
          held.scale.setScalar(0.55);
          cat.rig.head.add(held);
          cat.rig.head.userData.sausage = held;
        }
        cat.rig.tail[0].rotation.x = -1.3;
      }
    },
  };
}

/** Panel 3, "Run.": the door bursts open, Duke and the pups, a whistle, Miso drops into a sprint. */
function panelRun(): Panel {
  const s = baseScene(K.sky);
  const cam = new THREE.PerspectiveCamera(46, 1.4, 0.1, 40);
  s.add(box(10, 5, 0.3, K.shopWall, 0, 2, -4));
  s.add(box(10, 0.1, 10, K.street, 0, -0.05, 0));
  const doorPivot = new THREE.Group();
  doorPivot.position.set(-0.6, 0, -3.8);
  const door = box(1.2, 2.2, 0.1, K.door, 0.6, 1.1, 0);
  doorPivot.add(door);
  s.add(doorPivot, box(1.4, 0.15, 0.2, K.awning, 0, 2.3, -3.8));
  for (let i = 0; i < 6; i++) s.add(box(0.12, 0.8, 0.06, K.fence, -3 + i * 0.3, 0.4, -2.6), box(0.12, 0.8, 0.06, K.fence, 1.6 + i * 0.3, 0.4, -2.6));

  const duke = new Dog(DOGS.duke);
  const pickle = new Dog(DOGS.pickle);
  const bolt = new Dog(DOGS.bolt);
  const dogs = [duke, pickle, bolt];
  duke.rig.root.position.set(0, 0, -3.3);
  pickle.rig.root.position.set(-0.9, 0, -3.1);
  bolt.rig.root.position.set(0.9, 0, -3.1);
  for (const dg of dogs) s.add(dg.rig.root);
  // Neighborhood dogs peeking over the fences.
  const peekers = [new Dog(DOGS.bolt), new Dog(DOGS.pickle), new Dog(DOGS.duke)];
  peekers.forEach((p, i) => {
    p.rig.root.scale.multiplyScalar(0.7);
    p.rig.root.position.set(i === 1 ? -2.4 : 2.0 + i * 0.4, -0.6, -2.9);
    s.add(p.rig.root);
  });

  const cat = new Cat(new EventBus<GameEvents>());
  cat.holder.position.set(-1.0, 0, -0.6);
  cat.holder.scale.setScalar(0.8);
  cat.holder.rotation.y = Math.PI * 0.75;
  cat.shadow.visible = false;
  s.add(cat.holder);
  const d = drive();

  return {
    scene: s,
    camera: cam,
    update(t, dt) {
      const shake = t > 0.5 && t < 0.9 ? (Math.random() - 0.5) * 0.08 : 0;
      cam.position.set(0.1 + Math.sin(t * 0.4) * 0.1 + shake, 1.1 + shake, 1.6);
      cam.lookAt(0, 0.7, -2.2);
      doorPivot.rotation.y = t > 0.5 ? Math.min(1, (t - 0.5) / 0.15) * 1.9 : 0;
      for (const dg of dogs) {
        const out = t > 0.7 ? Math.min(1, (t - 0.7) / 0.6) : 0;
        dg.rig.root.position.z = -3.3 + out * 1.2;
        dg.update(dt, 1, false, true);
      }
      if (t > 1.6 && t < 1.7) duke.startTaunt();
      peekers.forEach((p, i) => {
        p.rig.root.position.y = t > 2 + i * 0.2 ? -0.6 + Math.min(1, (t - 2 - i * 0.2) / 0.3) * 0.62 : -0.6;
        p.update(dt, 1, false, true);
      });
      d.sliding = t > 3.4;
      cat.update(dt, d);
    },
  };
}

export function buildComicPanels(): Panel[] {
  return [panelSunday(), panelSausage(), panelRun()];
}
