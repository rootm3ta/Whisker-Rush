import * as THREE from 'three';
import { DOGS } from '../data/dogs';
import { Dog } from '../entities/Dog';
import { BossPhase, type Boss } from '../gameplay/Boss';
import { OBSTACLE_GEOMETRY } from '../procgen/obstacles';
import { CrashFx } from './CrashFx';
import { createToonMaterial } from './ToonMaterial';

/** Duke on the mail truck during a Boss Chase, plus his comic wipe-out. */
export class BossView {
  readonly root = new THREE.Group();
  private readonly truck = new THREE.Group();
  private readonly duke = new Dog(DOGS.duke);
  private readonly fx = new CrashFx();
  private wasSwerve = false;
  /** After the swerve the truck stays put at a fixed track distance. */
  private parkedS = -1;
  private parkedX = 0;

  constructor() {
    const mesh = new THREE.Mesh(OBSTACLE_GEOMETRY.mailTruck(), createToonMaterial(0xffffff, { vertexColors: true }));
    this.truck.add(mesh);
    this.duke.rig.root.position.set(0, 2.5, -3);
    this.truck.add(this.duke.rig.root);
    this.truck.visible = false;
    this.root.add(this.truck, this.fx.root);
  }

  update(dt: number, boss: Boss, distance: number): void {
    const t = this.truck;
    const swerving = boss.phase === BossPhase.Swerve;
    if (boss.active) {
      this.parkedS = -1;
      t.visible = true;
      t.position.set(boss.truckX, 0, -boss.ahead);
      t.rotation.set(0, swerving ? boss.swerve * 1.2 * Math.sign(boss.truckX || 1) : 0, swerving ? boss.swerve * 0.25 : 0);
      if (boss.throwAnim < 0.1) this.duke.startTaunt();
      this.duke.update(dt, 1, false, true);
      if (swerving && !this.wasSwerve) this.fx.startCloud(boss.truckX + 2, 0.5, -boss.ahead);
      if (swerving && boss.swerve > 0.95) {
        this.parkedS = distance + boss.ahead;
        this.parkedX = boss.truckX;
      }
    } else if (this.parkedS >= 0) {
      const z = distance - this.parkedS;
      t.position.set(this.parkedX, 0, z);
      this.duke.update(dt, 1, false, true);
      if (z > 12) {
        this.parkedS = -1;
        t.visible = false;
        this.fx.stopCloud();
      }
    } else {
      t.visible = false;
    }
    this.wasSwerve = swerving;
    this.fx.update(dt, 0, 0);
  }
}
