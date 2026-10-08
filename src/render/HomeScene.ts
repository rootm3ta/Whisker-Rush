import * as THREE from 'three';
import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { HOME, WINDOW, type HomeAction, type TimeOfDay } from '../data/home';
import { Cat, type CatDrive } from '../entities/Cat';
import { createToonMaterial } from './ToonMaterial';
import { WindowView, glowTexture } from './WindowView';
import { CAT_ANIM } from '../data/cat';

const HS = HOME.hotspot;
const SPARKS = 24;

interface Hotspot {
  action: HomeAction;
  obj: THREE.Object3D;
  base: THREE.Vector3;
  halo: THREE.Sprite;
  /** Halo centre relative to the object (refreshed for Miso, who moves). */
  bounce: number;
  flash: number;
  attention: boolean;
}

type MisoSpot = 'couch' | 'up' | 'sill' | 'down';

const K = HOME.colors;

function box(w: number, h: number, d: number, color: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), createToonMaterial(color));
  m.position.set(x, y, z);
  return m;
}

/**
 * Miso's living room: tappable furniture (with glowing halos, sparkles and a press bounce) opens the
 * meta screens; the back window shows a living street lit by the local time of day, and Miso hops
 * onto the sill to watch whatever passes.
 */
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
  readonly windowView = new WindowView();
  private readonly hemi: THREE.HemisphereLight;
  private readonly sun: THREE.DirectionalLight;
  private readonly lampLight = new THREE.PointLight(0xffd27a, 0, 4, 1.5);
  private readonly shadeMat: THREE.MeshBasicMaterial;
  private readonly hotspots: Hotspot[] = [];
  private readonly sparks: THREE.Points;
  private readonly sparkPos = new Float32Array(SPARKS * 3);
  private readonly sparkCol = new Float32Array(SPARKS * 3);
  private readonly sparkLife = new Float32Array(SPARKS);
  private readonly sparkVel = new Float32Array(SPARKS);
  private sparkNext = 0;
  private sparkI = 0;
  private readonly tmpV = new THREE.Vector3();
  private readonly tmpB = new THREE.Box3();
  /** Miso's windowsill trip: spot, phase time, time left on the sill after the event, cue timers. */
  private miso: MisoSpot = 'couch';
  private misoT = 0;
  private stayT = 0;
  private chatterT = 0;
  private puffT = 0;
  hotspotsOn = true;
  private headYaw = 0;
  /** Grooming comes and goes while Miso sits on the couch. */
  private groomIn = 6;
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
    this.hemi = new THREE.HemisphereLight(HOME.ambient, 0x8a6a4f, 1.1);
    s.add(this.hemi);
    const sun = new THREE.DirectionalLight(HOME.sunColor, 2.4);
    sun.position.set(2, 5, 3);
    s.add(sun);
    this.sun = sun;

    // Room shell: the back wall has a hole for the living window.
    const Hh = WINDOW.hole;
    const hl = Hh.x - Hh.w / 2;
    const hr = Hh.x + Hh.w / 2;
    const hb = Hh.y - Hh.h / 2;
    const ht = Hh.y + Hh.h / 2;
    s.add(box(hl + 6, 7, 0.2, K.wall, (hl - 6) / 2, 3.4, -3));
    s.add(box(6 - hr, 7, 0.2, K.wall, (hr + 6) / 2, 3.4, -3));
    s.add(box(Hh.w, 6.9 - ht, 0.2, K.wall, Hh.x, (ht + 6.9) / 2, -3));
    s.add(box(Hh.w, hb + 0.1, 0.2, K.wall, Hh.x, (hb - 0.1) / 2, -3));
    s.add(this.windowView.root);
    s.add(box(12, 0.25, 0.25, K.wallTrim, 0, 0.12, -2.85));
    s.add(box(12, 0.1, 10, K.floor, 0, -0.05, 1.5));
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.02, 28), createToonMaterial(K.rug));
    rug.scale.z = 0.55;
    rug.position.set(0, 0.01, 0.4);
    s.add(rug);

    // Window frame and a faint pane (also the tap target for Old Tom's, whose cart is outside).
    const win = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06, depthWrite: false }));
    win.add(glass);
    win.add(box(2.4, 0.1, 0.12, K.windowFrame, 0, 0.78, 0.02), box(2.4, 0.12, 0.2, K.windowFrame, 0, -0.78, 0.06));
    win.add(box(0.1, 1.6, 0.12, K.windowFrame, -1.15, 0, 0.02), box(0.1, 1.6, 0.12, K.windowFrame, 1.15, 0, 0.02), box(0.06, 1.5, 0.08, K.windowFrame, 0, 0, 0.02));
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
    s.add(notebook);
    this.addTargetObject(notebook, 'missions');

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
    this.shadeMat = new THREE.MeshBasicMaterial({ color: K.lamp, side: THREE.DoubleSide });
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 12, 1, true), this.shadeMat);
    shade.position.y = 1.85;
    lamp.add(shade);
    lamp.position.set(L.lamp[0], 0, L.lamp[1]);
    s.add(lamp);
    this.lampLight.position.set(L.lamp[0], 1.7, L.lamp[1] + 0.3);
    s.add(this.lampLight);

    this.cat = new Cat(bus);
    this.cat.holder.position.set(...HOME.misoSeat);
    this.cat.holder.scale.setScalar(HOME.misoScale);
    this.cat.shadow.visible = false;
    s.add(this.cat.holder);
    // Miso on the couch is the Missions hotspot (the notebook too).
    this.addTargetObject(this.cat.holder, 'missions');
    this.anchors.push({ action: 'missions', pos: new THREE.Vector3(0, 1.3, -1.15) });

    // Halos sit just behind each hotspot object so they read as a glowing rim.
    const glow = glowTexture();
    for (const a of HOME.hotspotOrder) {
      const obj = a === 'missions' ? this.cat.holder : this.targets.find((o) => o.userData.action === a)!;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: HS.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
      halo.scale.setScalar(HS.halo[a]);
      s.add(halo);
      this.hotspots.push({ action: a, obj, base: obj.scale.clone(), halo, bounce: 0, flash: 0, attention: false });
    }
    this.placeHalos();

    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.sparkPos, 3));
    sg.setAttribute('color', new THREE.BufferAttribute(this.sparkCol, 3));
    this.sparks = new THREE.Points(sg, new THREE.PointsMaterial({ map: glow, size: 0.09, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.sparks.frustumCulled = false;
    s.add(this.sparks);
    this.windowView.onEvent = () => this.watchWindow();
    this.setTime('golden');
  }

  /** Halo at the object's bounding-box centre, pushed back so the object occludes its middle. */
  private placeHalos(): void {
    for (const h of this.hotspots) {
      this.tmpB.setFromObject(h.obj);
      this.tmpB.getCenter(this.tmpV);
      const depth = this.tmpB.max.z - this.tmpB.min.z;
      h.halo.position.set(this.tmpV.x, this.tmpV.y, Math.max(this.tmpV.z - depth / 2 - 0.05, -2.89));
    }
  }

  /** Room and window lighting for the local time of day. */
  setTime(tod: TimeOfDay): void {
    const T = WINDOW.times[tod];
    this.windowView.setTime(tod);
    this.sun.color.setHex(T.sun);
    this.sun.intensity = T.sunI;
    this.hemi.color.setHex(T.amb);
    this.hemi.intensity = T.ambI;
    const night = T.lamp !== 0;
    this.cat.setDaylight(!night);
    this.lampLight.intensity = night ? 6 : 0;
    this.shadeMat.color.setHex(night ? 0xfff0c0 : HOME.colors.lamp);
  }

  /** Tap feedback: the object bounces and its halo flashes. */
  press(action: HomeAction): void {
    const h = this.hotspots.find((x) => x.action === action);
    if (!h) return;
    h.bounce = HS.bounceSec;
    h.flash = 1;
  }

  /** Something new behind this hotspot: brighter glow and a periodic hop. */
  setAttention(action: HomeAction, on: boolean): void {
    const h = this.hotspots.find((x) => x.action === action);
    if (h) h.attention = on;
  }

  /** Screen-space centre of a hotspot object (for the tour spotlight). */
  hotspotCenter(action: HomeAction, out: THREE.Vector3): THREE.Vector3 {
    const h = this.hotspots.find((x) => x.action === action)!;
    return out.copy(h.halo.position);
  }

  private watchWindow(): void {
    if (this.previewOn) return;
    if (this.miso === 'couch' || this.miso === 'down') {
      this.miso = 'up';
      this.misoT = 0;
    }
    this.stayT = WINDOW.stayAfterSec;
  }

  /** Window cue reached: birds make her chatter, Duke makes her puff up and hiss. */
  cue(c: 'chatter' | 'hiss'): void {
    if (c === 'chatter') this.chatterT = 1.2;
    else this.puffT = 2.2;
  }

  /** Sends Miso back to the couch at once (leaving Home, wardrobe preview). */
  settleMiso(): void {
    this.miso = 'couch';
    this.chatterT = this.puffT = 0;
    this.windowView.reset();
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

  private updateMiso(dt: number): void {
    const h = this.cat.holder;
    const seat = HOME.misoSeat;
    const sill = WINDOW.sill;
    if (this.previewOn && this.miso !== 'couch') this.settleMiso();
    this.misoT += dt;
    const k = Math.min(1, this.misoT / WINDOW.hopSec);
    const arc = Math.sin(k * Math.PI) * 0.45;
    switch (this.miso) {
      case 'couch':
        // Idles facing the camera, rotating in the wardrobe preview.
        h.position.set(seat[0], seat[1], seat[2]);
        h.rotation.y = Math.PI + this.spin * this.preview + Math.sin(this.t * 0.4) * 0.15 * (1 - this.preview);
        break;
      case 'up':
        h.position.set(seat[0] + (sill[0] - seat[0]) * k, seat[1] + (sill[1] - seat[1]) * k + arc, seat[2] + (sill[2] - seat[2]) * k);
        h.rotation.y = Math.PI * (1 - k);
        if (k >= 1) {
          this.miso = 'sill';
          this.misoT = 0;
        }
        break;
      case 'sill':
        h.position.set(sill[0], sill[1], sill[2]);
        h.rotation.y = 0;
        if (!this.windowView.event) {
          this.stayT -= dt;
          if (this.stayT <= 0) {
            this.miso = 'down';
            this.misoT = 0;
          }
        }
        break;
      case 'down':
        h.position.set(sill[0] + (seat[0] - sill[0]) * k, sill[1] + (seat[1] - sill[1]) * k + arc, sill[2] + (seat[2] - sill[2]) * k);
        h.rotation.y = Math.PI * k;
        if (k >= 1) this.miso = 'couch';
        break;
    }
    // Groom now and then while sitting on the couch with nothing to watch.
    this.groomIn -= dt;
    if (this.groomIn < -CAT_ANIM.groomSec) this.groomIn = 8 + Math.random() * 6;
    this.drive.groom = this.miso === 'couch' && !this.previewOn && this.groomIn < 0;
    this.cat.update(dt, this.drive);
    const r = this.cat.rig;
    if (this.miso === 'sill' || this.miso === 'up') {
      // Ears forward, tail tip twitching, head tracking whatever is outside.
      for (const e of r.ears) e.rotation.x = -0.35;
      const n = r.tail.length;
      r.tail[n - 1].rotation.y += Math.sin(this.t * 13) * 0.35;
      r.tail[n - 2].rotation.y += Math.sin(this.t * 13 - 0.6) * 0.2;
      if (this.windowView.event && this.miso === 'sill') {
        r.head.getWorldPosition(this.tmpV);
        const f = this.windowView.focus;
        const dx = f.x - this.tmpV.x;
        const dz = f.z - this.tmpV.z;
        const yaw = Math.max(-0.9, Math.min(0.9, Math.atan2(-dx, -dz)));
        const pitch = Math.max(-0.3, Math.min(0.5, Math.atan2(f.y - this.tmpV.y, Math.hypot(dx, dz))));
        this.headYaw += (yaw - this.headYaw) * Math.min(1, dt * 8);
        r.head.rotation.x += pitch;
      }
    } else this.headYaw *= 1 - Math.min(1, dt * 6);
    r.head.rotation.y += this.headYaw;
    if (this.chatterT > 0) {
      this.chatterT -= dt;
      r.head.rotation.z = Math.sin(this.t * 48) * 0.06;
      r.head.position.y += Math.sin(this.t * 60) * 0.004;
    }
    if (this.puffT > 0) {
      this.puffT -= dt;
      const p = Math.min(1, this.puffT * 3, (2.2 - this.puffT) * 6);
      r.body.scale.multiplyScalar(1 + 0.16 * p);
      for (const e of r.ears) e.rotation.x = 0.8 * p;
      for (let i = 0; i < r.tail.length; i++) r.tail[i].rotation.x -= 0.25 * p;
    }
  }

  private updateHotspots(dt: number): void {
    const show = this.hotspotsOn && this.preview < 0.05;
    const pulse = 0.75 + 0.25 * Math.sin(this.t * HS.pulseHz * Math.PI * 2);
    const misoHalo = this.hotspots[this.hotspots.length - 1];
    if (misoHalo.action === 'missions') {
      this.cat.holder.getWorldPosition(this.tmpV);
      misoHalo.halo.position.set(this.tmpV.x, this.tmpV.y + 0.25, this.tmpV.z - 0.3);
      const a = this.anchors[this.anchors.length - 1];
      a.pos.set(this.tmpV.x, this.tmpV.y + 0.68, this.tmpV.z);
    }
    for (const h of this.hotspots) {
      h.flash = Math.max(0, h.flash - dt * 2.5);
      const base = h.attention ? HS.attention : HS.calm;
      h.halo.visible = show;
      h.halo.material.opacity = base * pulse + h.flash * HS.flash;
      // Attention hotspots hop every 2.4 s.
      if (h.attention && h.bounce <= 0 && (this.t % 2.4) < dt) h.bounce = HS.bounceSec;
      if (h.bounce > 0 && h.action !== 'missions') {
        h.bounce = Math.max(0, h.bounce - dt);
        const k = Math.sin((1 - h.bounce / HS.bounceSec) * Math.PI);
        h.obj.scale.set(h.base.x * (1 + 0.05 * k), h.base.y * (1 + 0.1 * k), h.base.z * (1 + 0.05 * k));
      } else if (h.action === 'missions' && h.bounce > 0) {
        h.bounce = Math.max(0, h.bounce - dt);
        this.cat.rig.body.position.y += Math.sin((1 - h.bounce / HS.bounceSec) * Math.PI) * 0.12;
      }
    }
  }

  private updateSparks(dt: number): void {
    const show = this.hotspotsOn && this.preview < 0.05;
    this.sparks.visible = show;
    if (!show) return;
    this.sparkNext -= dt;
    if (this.sparkNext <= 0) {
      this.sparkNext = HS.sparkleEverySec * (0.6 + Math.random() * 0.8);
      const h = this.hotspots[Math.floor(Math.random() * this.hotspots.length)];
      const i = this.sparkI++ % SPARKS;
      const r = h.halo.scale.x * 0.35;
      this.sparkPos[i * 3] = h.halo.position.x + (Math.random() - 0.5) * r * 2;
      this.sparkPos[i * 3 + 1] = h.halo.position.y + (Math.random() - 0.3) * r;
      this.sparkPos[i * 3 + 2] = h.halo.position.z + 0.4;
      this.sparkLife[i] = HS.sparkleLife;
      this.sparkVel[i] = 0.12 + Math.random() * 0.15;
    }
    for (let i = 0; i < SPARKS; i++) {
      const l = this.sparkLife[i];
      if (l <= 0) {
        this.sparkCol[i * 3] = this.sparkCol[i * 3 + 1] = this.sparkCol[i * 3 + 2] = 0;
        continue;
      }
      this.sparkLife[i] = l - dt;
      this.sparkPos[i * 3 + 1] += this.sparkVel[i] * dt;
      const a = Math.sin((l / HS.sparkleLife) * Math.PI) * 0.9;
      this.sparkCol[i * 3] = a;
      this.sparkCol[i * 3 + 1] = a * 0.9;
      this.sparkCol[i * 3 + 2] = a * 0.6;
    }
    const g = this.sparks.geometry;
    g.getAttribute('position').needsUpdate = true;
    g.getAttribute('color').needsUpdate = true;
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

    this.windowView.update(dt);
    this.updateMiso(dt);
    this.updateHotspots(dt);
    this.updateSparks(dt);
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
