import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { HOME, type HomeAction } from '../data/home';
import { Cat, type CatDrive } from '../entities/Cat';
import { createSkyTexture } from './Sky';
import { CITIES } from '../data/cities';
import { createToonMaterial } from './ToonMaterial';

const K = HOME.colors;

function box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), createToonMaterial(color));
  m.position.set(x, y, z);
  return m;
}

/** Miso's living room at golden hour: tappable furniture opens the meta screens. */
export class HomeScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(HOME.camera.fov, 1, 0.1, 60);
  readonly cat: Cat;
  /** Label anchors in world space for the DOM washi-tape tags. */
  readonly anchors: { action: HomeAction; pos: THREE.Vector3 }[] = [];
  private readonly targets: THREE.Object3D[] = [];
  private readonly ray = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly look = new THREE.Vector3();
  private readonly camPos = new THREE.Vector3();
  private readonly camLook = new THREE.Vector3();
  private readonly mug: THREE.Mesh;
  private mugFall = -1;
  private stretch = 0;
  private t = 0;
  /** 0 = room view, 1 = close-up wardrobe preview. */
  private preview = 0;
  previewOn = false;
  /** Wardrobe drag rotation of Miso (radians). */
  spin = 0;
  private readonly drive: CatDrive = {
    x: 0, y: 0, vy: 0, speed: 0, grounded: true, sliding: false, grinding: false, running: false,
    hidden: false, dizzy: false, flicker: false, boxed: false, nap: false, loaf: false, lift: 0,
  };

  constructor(bus: EventBus<GameEvents>) {
    const s = this.scene;
    s.background = new THREE.Color(K.wall);
    s.add(new THREE.HemisphereLight(HOME.ambient, 0x8a6a4f, 1.1));
    const sun = new THREE.DirectionalLight(HOME.sunColor, 2.4);
    sun.position.set(2, 5, 3);
    s.add(sun);

    // Room shell.
    s.add(box(12, 7, 0.2, K.wall, 0, 3.4, -3));
    s.add(box(12, 0.25, 0.25, K.wallTrim, 0, 0.12, -2.85));
    s.add(box(12, 0.1, 10, K.floor, 0, -0.05, 1.5));
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.02, 28), createToonMaterial(K.rug));
    rug.scale.z = 0.55;
    rug.position.set(0, 0.01, 0.4);
    s.add(rug);

    // Window to the street (Old Tom's stall is out there).
    const win = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshBasicMaterial({ map: createSkyTexture(CITIES.mapleLane.palette) }));
    win.add(glass);
    win.add(box(2.4, 0.1, 0.12, K.windowFrame, 0, 0.78, 0.02), box(2.4, 0.12, 0.2, K.windowFrame, 0, -0.78, 0.06));
    win.add(box(0.1, 1.6, 0.12, K.windowFrame, -1.15, 0, 0.02), box(0.1, 1.6, 0.12, K.windowFrame, 1.15, 0, 0.02), box(0.06, 1.5, 0.08, K.windowFrame, 0, 0, 0.02));
    for (let i = 0; i < 4; i++) win.add(box(0.45, 0.35 + (i % 2) * 0.2, 0.01, [0x9fdcc4, 0xf6c9a8, 0xbfe8d6, 0xf3e6c9][i], -0.8 + i * 0.52, -0.55, 0.005));
    win.add(box(0.5, 0.25, 0.02, K.closet, 0.55, -0.66, 0.012));
    win.position.set(0.25, 2.2, -2.88);
    win.scale.setScalar(0.85);
    this.addTarget(win, 'market', [0, 3.15, -2.8]);

    // Couch with Miso.
    const couch = new THREE.Group();
    couch.add(box(2.6, 0.45, 0.9, K.couch, 0, 0.3, 0), box(2.6, 0.8, 0.25, K.couch, 0, 0.75, -0.42));
    couch.add(box(0.25, 0.65, 0.9, K.couch, -1.3, 0.45, 0), box(0.25, 0.65, 0.9, K.couch, 1.3, 0.45, 0));
    couch.add(box(1.1, 0.12, 0.7, K.cushion, -0.6, 0.58, 0.05), box(1.1, 0.12, 0.7, K.cushion, 0.6, 0.58, 0.05));
    couch.position.set(0, 0, -1.3);
    s.add(couch);

    // Coffee table with mug and the missions notebook.
    const table = new THREE.Group();
    table.add(box(1.3, 0.08, 0.6, K.table, 0, 0.45, 0));
    for (const x of [-0.55, 0.55]) for (const z of [-0.22, 0.22]) table.add(box(0.07, 0.45, 0.07, K.table, x, 0.22, z));
    table.position.set(0.15, 0, 0.35);
    s.add(table);
    this.mug = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.16, 12), createToonMaterial(K.mug));
    this.mug.position.set(0.7, 0.57, 0.35);
    s.add(this.mug);
    const notebook = box(0.42, 0.05, 0.32, K.notebook, -0.1, 0.52, 0.35);
    notebook.rotation.y = 0.2;
    this.addTarget(notebook, 'missions', [-0.1, 0.8, 0.35]);

    // Front door (left) -> Run.
    const door = new THREE.Group();
    door.add(box(1.0, 2.1, 0.1, K.door, 0, 1.05, 0), box(0.08, 0.08, 0.08, K.knob, 0.36, 1.0, 0.07));
    door.add(box(0.25, 0.18, 0.02, K.knob, 0, 0.35, 0.06));
    const L = HOME.layout;
    door.position.set(L.door[0], 0, L.door[1]);
    this.addTarget(door, 'run', [L.door[0], 2.35, L.door[1] + 0.1]);

    // World map pinned on the wall above the couch-left.
    const map = new THREE.Group();
    map.add(box(0.8, 0.55, 0.02, K.map, 0, 0, 0));
    for (let i = 0; i < 3; i++) map.add(box(0.18 + i * 0.05, 0.1, 0.01, K.mapInk, -0.2 + i * 0.2, -0.05 + (i % 2) * 0.12, 0.015));
    map.add(box(0.04, 0.04, 0.03, K.calendarRed, -0.32, 0.22, 0.02));
    map.position.set(L.map[0], L.map[1], -2.86);
    this.addTarget(map, 'map', [L.map[0], L.map[1] + 0.4, -2.8]);

    // Closet (right back) -> Wardrobe.
    const closet = new THREE.Group();
    closet.add(box(1.1, 2.4, 0.6, K.closet, 0, 1.2, 0), box(0.02, 2.2, 0.02, 0x5e3a22, 0, 1.2, 0.31));
    closet.add(box(0.06, 0.25, 0.04, K.knob, -0.1, 1.25, 0.32), box(0.06, 0.25, 0.04, K.knob, 0.1, 1.25, 0.32));
    closet.position.set(L.closet[0], 0, L.closet[1]);
    this.addTarget(closet, 'wardrobe', [L.closet[0], 2.6, L.closet[1] + 0.2]);

    // Fridge with calendar (left front) -> Daily.
    const fridge = new THREE.Group();
    fridge.add(box(0.85, 1.9, 0.7, K.fridge, 0, 0.95, 0), box(0.04, 0.5, 0.05, 0xa9b2bc, 0.3, 1.35, 0.37));
    fridge.add(box(0.42, 0.5, 0.02, K.calendar, -0.08, 1.35, 0.36), box(0.42, 0.1, 0.025, K.calendarRed, -0.08, 1.55, 0.37));
    fridge.position.set(L.fridge[0], 0, L.fridge[1]);
    fridge.rotation.y = 0.45;
    this.addTarget(fridge, 'calendar', [L.fridge[0], 2.1, L.fridge[1]]);

    // Scratching post (right front) -> Upgrades.
    const post = new THREE.Group();
    post.add(box(0.7, 0.1, 0.7, K.post, 0, 0.05, 0));
    post.add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.5, 12), createToonMaterial(K.postRope)));
    post.children[1].position.y = 0.85;
    post.add(box(0.6, 0.08, 0.6, K.post, 0, 1.62, 0));
    const toy = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), createToonMaterial(0xe85d8a));
    toy.position.set(0.25, 1.3, 0);
    post.add(toy);
    post.position.set(L.post[0], 0, L.post[1]);
    this.addTarget(post, 'upgrades', [L.post[0], 2.0, L.post[1]]);

    // Floor lamp for warmth.
    const lamp = new THREE.Group();
    lamp.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6), createToonMaterial(0x3b4a45)));
    lamp.children[0].position.y = 0.9;
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 12, 1, true), new THREE.MeshBasicMaterial({ color: K.lamp, side: THREE.DoubleSide }));
    shade.position.y = 1.85;
    lamp.add(shade);
    lamp.position.set(L.lamp[0], 0, L.lamp[1]);
    s.add(lamp);

    this.cat = new Cat(bus);
    this.cat.holder.position.set(...HOME.misoSeat);
    this.cat.holder.scale.setScalar(HOME.misoScale);
    this.cat.shadow.visible = false;
    s.add(this.cat.holder);
    this.addTargetObject(this.cat.holder, 'miso');
  }

  private addTarget(obj: THREE.Object3D, action: HomeAction, label: [number, number, number]): void {
    this.scene.add(obj);
    this.addTargetObject(obj, action);
    this.anchors.push({ action, pos: new THREE.Vector3(...label) });
  }

  private addTargetObject(obj: THREE.Object3D, action: string): void {
    obj.userData.action = action;
    this.targets.push(obj);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  /** Returns the action under a click (or 'miso'), using normalized device coords. */
  pick(ndcX: number, ndcY: number): string | null {
    this.ndc.set(ndcX, ndcY);
    this.ray.setFromCamera(this.ndc, this.camera);
    const hits = this.ray.intersectObjects(this.targets, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && o.userData.action === undefined) o = o.parent;
      if (o) return o.userData.action as string;
    }
    return null;
  }

  /** Miso reacts to a tap: purr, chirp, stretch, or knock the mug off the table. Returns the line. */
  poke(i: number): string {
    const k = i % HOME.reactions.length;
    if (k === 0 || k === 1) this.cat.pop();
    if (k === 2) this.stretch = 1;
    if (k === 3 && this.mugFall < 0) this.mugFall = 0;
    return HOME.reactions[k];
  }

  update(dt: number): void {
    this.t += dt;
    const C = HOME.camera;
    this.preview += ((this.previewOn ? 1 : 0) - this.preview) * (1 - Math.exp(-5 * dt));
    const drift = Math.sin(this.t * C.driftHz * Math.PI * 2) * C.driftX * (1 - this.preview);
    const P = HOME.preview;
    this.camPos.set(C.pos[0] + drift, C.pos[1], C.pos[2]).lerp(this.look.set(...P.pos), this.preview);
    this.camLook.set(C.look[0], C.look[1], C.look[2]).lerp(this.look.set(...P.look), this.preview);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // Miso idles facing the camera, rotating in the wardrobe preview.
    const h = this.cat.holder;
    h.rotation.y = Math.PI + this.spin * this.preview + Math.sin(this.t * 0.4) * 0.15 * (1 - this.preview);
    this.cat.update(dt, this.drive);
    if (this.stretch > 0) {
      this.stretch = Math.max(0, this.stretch - dt * 0.8);
      const k = Math.sin(this.stretch * Math.PI);
      this.cat.rig.body.scale.z *= 1 + 0.25 * k;
      this.cat.rig.body.scale.y *= 1 - 0.15 * k;
    }
    if (this.mugFall >= 0) {
      this.mugFall += dt;
      const f = this.mugFall;
      if (f < 0.5) {
        this.mug.position.set(0.7 + f * 0.6, Math.max(0.08, 0.57 + f * 0.8 - f * f * 9), 0.35);
        this.mug.rotation.z = -f * 6;
      } else if (f > 3) {
        this.mugFall = -1;
        this.mug.position.set(0.7, 0.57, 0.35);
        this.mug.rotation.z = 0;
      }
    }
  }
}
