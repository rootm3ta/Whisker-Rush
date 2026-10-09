import * as THREE from 'three';
import { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { Cat, type CatDrive } from '../entities/Cat';
import type { CatId } from '../data/cats';
import type { Slot } from '../data/accessories';
import { createToonMaterial } from './ToonMaterial';

/**
 * A cat on a little boutique turntable, for shop previews. One small WebGL context, created on
 * first use; the live view spins while the shop is open, and `snapshot` renders still images
 * for carousel cards so only one canvas is ever live.
 */
export class Turntable {
  readonly canvas = document.createElement('canvas');
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  private readonly cat = new Cat(new EventBus<GameEvents>());
  private readonly disk: THREE.Group;
  private readonly sz = new THREE.Vector2();
  private raf = 0;
  private last = 0;
  private spin = Math.PI - 0.5;
  private skin: CatId = 'miso';
  private outfit: Partial<Record<Slot, string>> = {};
  private readonly drive: CatDrive = {
    x: 0, y: 0, vy: 0, speed: 0, grounded: true, sliding: false, grinding: false, running: false,
    hidden: false, dizzy: false, flicker: false, boxed: false, nap: false, loaf: false, lift: 0,
  };

  constructor() {
    this.canvas.className = 'bq-turntable';
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xfff6ec, 0xe8b4b0, 1.3));
    const key = new THREE.DirectionalLight(0xffe6c8, 2.2);
    key.position.set(1.5, 3, 2.5);
    s.add(key);
    const rim = new THREE.DirectionalLight(0xffd0e0, 1.2);
    rim.position.set(-2, 1.5, -2);
    s.add(rim);
    this.disk = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 40), createToonMaterial(0xf6c9c4));
    const rimRing = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.68, 0.08, 40), createToonMaterial(0xd9a441));
    rimRing.position.y = -0.04;
    this.disk.add(rimRing, top);
    s.add(this.disk);
    this.cat.shadow.visible = false;
    this.cat.holder.position.y = 0.03;
    this.cat.holder.scale.setScalar(0.5);
    s.add(this.cat.holder);
    this.camera.position.set(0, 1.1, 3.3);
    this.camera.lookAt(0, 0.3, 0);
  }

  private ensure(): THREE.WebGLRenderer {
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    return this.renderer;
  }

  setLook(skin: CatId, outfit: Partial<Record<Slot, string>>): void {
    this.skin = skin;
    this.outfit = outfit;
    this.cat.setLook(skin, outfit);
  }

  private size(w: number, h: number): void {
    const r = this.ensure();
    const c = r.getSize(this.sz);
    if (c.x !== w || c.y !== h) {
      r.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Starts the live spin at the canvas's CSS size. */
  start(): void {
    if (this.raf) return;
    this.last = performance.now();
    const tick = (t: number) => {
      this.raf = requestAnimationFrame(tick);
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (!w || !h) return;
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.spin += dt * 0.7;
      this.size(w, h);
      this.cat.holder.rotation.y = this.spin;
      this.disk.rotation.y = this.spin;
      this.cat.update(dt, this.drive);
      this.renderer!.render(this.scene, this.camera);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  /** A still image (data URL) of a cat in an outfit, three-quarter view. Restores the live look. */
  snapshot(skin: CatId, outfit: Partial<Record<Slot, string>>, w = 220, h = 200): string {
    const r = this.ensure();
    const keepSkin = this.skin;
    const keepOutfit = this.outfit;
    const keepW = this.canvas.width;
    const keepH = this.canvas.height;
    this.cat.setLook(skin, outfit);
    this.size(w, h);
    // Three-quarter front view (the model faces -z).
    this.cat.holder.rotation.y = Math.PI - 0.55;
    this.disk.rotation.y = 0;
    this.cat.update(0.016, this.drive);
    r.render(this.scene, this.camera);
    const url = this.canvas.toDataURL('image/png');
    this.cat.setLook(keepSkin, keepOutfit);
    if (keepW && keepH) this.size(keepW / r.getPixelRatio(), keepH / r.getPixelRatio());
    return url;
  }
}
