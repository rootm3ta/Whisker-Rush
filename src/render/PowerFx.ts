import * as THREE from 'three';
import { ABILITY } from '../data/abilities';
import { POWERUP_FX, POWERUPS, ROOMBA } from '../data/powerups';
import type { PowerUps } from '../gameplay/PowerUps';
import { createToonMaterial } from './ToonMaterial';

/** State the power-up visuals read each frame (interpolated cat pose). */
export interface PowerFxDrive {
  x: number;
  y: number;
  purr: boolean;
}

function basic(color: number, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
}

/**
 * Visuals for active power-ups and rides: yarn ball, catnip swirl, balloon, cardboard box,
 * laser dot, milk bubble, fish rocket, Roomba and the Purr Field ring.
 */
export class PowerFx {
  readonly root = new THREE.Group();
  private readonly onCat = new THREE.Group();
  private readonly yarn = new THREE.Group();
  private readonly swirl = new THREE.Group();
  private readonly balloon = new THREE.Group();
  private readonly box = new THREE.Group();
  private readonly bubble: THREE.Mesh;
  private readonly rocket = new THREE.Group();
  /** Tbilisi: the Fish Rocket is a cable car gondola gliding on its cable. */
  private readonly gondola = new THREE.Group();
  cableCar = false;
  private readonly flame: THREE.Mesh;
  private readonly roomba = new THREE.Group();
  private readonly laser = new THREE.Group();
  private readonly purr: THREE.Mesh;
  private readonly purrMat: THREE.MeshBasicMaterial;
  private t = 0;
  private laserX = 0;
  private flyOff = 0;
  private readonly roombaHome = new THREE.Vector3();

  constructor() {
    this.root.add(this.onCat, this.laser, this.roomba);
    this.onCat.add(this.yarn, this.swirl, this.balloon, this.box, this.rocket);

    // Yarn ball with wraps.
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), createToonMaterial(POWERUPS.magnet.color));
    const wrapMat = createToonMaterial(0xf7c6d6);
    ball.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 4, 16), wrapMat));
    const w2 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 4, 16), wrapMat);
    w2.rotation.y = Math.PI / 2;
    ball.add(w2);
    this.yarn.add(ball);

    const leaf = new THREE.IcosahedronGeometry(0.09, 0);
    const leafMat = createToonMaterial(POWERUPS.catnip.color);
    for (let i = 0; i < 10; i++) this.swirl.add(new THREE.Mesh(leaf, leafMat));

    const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), createToonMaterial(POWERUPS.balloon.color));
    b.scale.y = 1.15;
    b.position.y = 3.1;
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 6), b.material);
    knot.position.y = 2.45;
    const stringGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 1.1, 0), new THREE.Vector3(0, 2.4, 0)]);
    this.balloon.add(b, knot, new THREE.Line(stringGeo, new THREE.LineBasicMaterial({ color: 0x2a201c })));

    const cardboard = createToonMaterial(POWERUPS.box.color);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.85, 1.6), cardboard);
    body.position.y = 0.88;
    const dark = createToonMaterial(0x2a201c);
    for (const sx of [-0.22, 0.22]) {
      const hole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.02), dark);
      hole.position.set(sx, 1.05, 0.81);
      this.box.add(hole);
    }
    for (const sx of [-1, 1]) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 1.6), cardboard);
      flap.position.set(sx * 0.75, 1.3, 0);
      flap.rotation.z = sx * 0.5;
      this.box.add(flap);
    }
    const tape = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.86, 1.62), createToonMaterial(0xe8d4b8));
    tape.position.y = 0.88;
    this.box.add(body, tape);

    this.bubble = new THREE.Mesh(new THREE.SphereGeometry(1.15, 20, 14), basic(POWERUPS.bubble.color, 0.28));
    this.bubble.position.y = 0.8;
    this.onCat.add(this.bubble);

    const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), createToonMaterial(POWERUPS.fishRocket.color));
    fishBody.scale.set(0.8, 0.7, 2.2);
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 3), fishBody.material);
    fin.rotation.x = Math.PI / 2;
    fin.position.z = 1.0;
    this.flame = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.9, 8), basic(0xffb03a));
    this.flame.rotation.x = Math.PI / 2;
    this.flame.position.z = 1.6;
    this.rocket.add(fishBody, fin, this.flame);
    this.rocket.position.y = 0.05;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 1.9), createToonMaterial(0xd9483b));
    cabin.position.y = 0.55;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.55, 1.6), createToonMaterial(0xbfe0f0));
    glass.position.y = 0.85;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 2.0), createToonMaterial(0xfbf6ec));
    roof.position.y = 1.26;
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), createToonMaterial(0x3a3a40));
    arm.position.y = 1.9;
    const cable = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 60), createToonMaterial(0x2a2a30));
    cable.position.y = 2.55;
    this.gondola.add(cabin, glass, roof, arm, cable);
    this.gondola.position.y = -0.55;
    this.onCat.add(this.gondola);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.16, 20), createToonMaterial(ROOMBA.color));
    disc.position.y = 0.08;
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), basic(ROOMBA.light));
    light.position.set(0, 0.17, 0.4);
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.04, 4, 20), createToonMaterial(0x8a8f99));
    bumper.rotation.x = Math.PI / 2;
    bumper.position.y = 0.08;
    this.roomba.add(disc, light, bumper);

    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.38, 18), basic(POWERUPS.laser.color));
    dot.rotation.x = -Math.PI / 2;
    const halo = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), basic(POWERUPS.laser.color, 0.3));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.005;
    this.laser.add(dot, halo);
    this.laser.position.y = 0.04;

    this.purrMat = basic(0xe8a6d8, 0.25);
    const ring = new THREE.RingGeometry(ABILITY.purrReachX - 0.25, ABILITY.purrReachX, 40);
    ring.rotateX(-Math.PI / 2);
    this.purr = new THREE.Mesh(ring, this.purrMat);
    this.purr.position.y = 0.05;
    this.root.add(this.purr);
  }

  update(dt: number, pu: PowerUps, d: PowerFxDrive): void {
    this.t += dt;
    const t = this.t;
    this.onCat.position.set(d.x, d.y, 0);

    this.yarn.visible = pu.isOn('magnet');
    if (this.yarn.visible) {
      const a = t * 4;
      this.yarn.position.set(Math.cos(a) * 0.95, 0.8 + Math.sin(a * 2) * 0.15, Math.sin(a) * 0.95);
      this.yarn.rotation.set(t * 5, t * 3, 0);
    }

    this.swirl.visible = pu.isOn('catnip');
    if (this.swirl.visible) {
      const kids = this.swirl.children;
      for (let i = 0; i < kids.length; i++) {
        const a = t * 6 + i * 0.63;
        const h = ((t * 0.8 + i / kids.length) % 1) * 1.8;
        kids[i].position.set(Math.cos(a) * 0.9, h, Math.sin(a) * 0.9);
        kids[i].rotation.set(a, a * 0.5, 0);
      }
    }

    this.balloon.visible = pu.isOn('balloon');
    if (this.balloon.visible) this.balloon.rotation.z = Math.sin(t * 1.8) * 0.12;

    this.box.visible = pu.isOn('box');

    this.bubble.visible = pu.bubble;
    if (this.bubble.visible) {
      const w = 1 + 0.04 * Math.sin(t * 7);
      this.bubble.scale.set(w, 2 - w, w);
    }

    this.rocket.visible = pu.isOn('fishRocket') && !this.cableCar;
    this.gondola.visible = pu.isOn('fishRocket') && this.cableCar;
    if (this.gondola.visible) this.gondola.rotation.z = Math.sin(t * 1.3) * 0.05;
    if (this.rocket.visible) this.flame.scale.set(1, 0.8 + 0.4 * Math.abs(Math.sin(t * 30)), 1);

    // Roomba under the cat while riding; flies off spinning when it absorbs a crash.
    if (pu.riding) {
      this.roomba.visible = true;
      this.flyOff = 0;
      this.roomba.position.set(d.x, d.y, 0);
      this.roomba.rotation.set(0, Math.sin(t * 3) * 0.2, 0);
      this.roombaHome.set(d.x, d.y, 0);
    } else if (pu.roombaFlyOff > 0) {
      this.roomba.visible = true;
      this.flyOff += dt;
      const k = this.flyOff;
      this.roomba.position.set(this.roombaHome.x + k * 6, this.roombaHome.y + k * 5 - k * k * 4, k * 4);
      this.roomba.rotation.set(k * 9, k * 12, 0);
    } else {
      this.roomba.visible = false;
    }

    const laserOn = pu.isOn('laser');
    this.laser.visible = laserOn;
    if (laserOn) {
      this.laserX += (pu.laserX - this.laserX) * (1 - Math.exp(-8 * dt));
      this.laser.position.set(this.laserX, 0.04, -POWERUP_FX.laserDotAhead);
      const s = 1 + 0.2 * Math.sin(t * 12);
      this.laser.scale.set(s, 1, s);
    } else {
      this.laserX = pu.laserX;
    }

    this.purr.visible = d.purr;
    if (d.purr) {
      this.purr.position.x = d.x;
      this.purrMat.opacity = 0.18 + 0.12 * Math.sin(t * 6);
    }
  }
}
