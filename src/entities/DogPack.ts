import * as THREE from 'three';
import { CHASE, PACK_RUSH } from '../data/chase';
import { DOGS } from '../data/dogs';
import { SPEED } from '../data/runner';
import { RushPhase, type Chase } from '../gameplay/Chase';
import { Dog } from './Dog';

export const PackMode = { Run: 0, Pounce: 1, Gloat: 2 } as const;

/** Duke, Pickle and Bolt placed from the Chase state. Dogs hide when far behind the camera. */
export class DogPack {
  readonly root = new THREE.Group();
  readonly duke = new Dog(DOGS.duke);
  /** The lunging pup (Pickle at home) and the Pack Rush runner (Bolt at home). */
  private pickle = new Dog(DOGS.pickle);
  private bolt = new Dog(DOGS.bolt);
  private x = 0;
  private t = 0;
  /** Tbilisi's Street Pals: two friendly tagged dogs that run beside Miso and bark at Duke. */
  private readonly pals = [new Dog(DOGS.streetDog), new Dog(DOGS.streetDog)];
  private palT = 0;

  constructor() {
    this.root.add(this.duke.rig.root, this.pickle.rig.root, this.bolt.rig.root);
    for (const p of this.pals) {
      p.rig.root.visible = false;
      this.root.add(p.rig.root);
    }
  }

  /** Street Pals: seconds left of their visit (0 hides them). */
  updatePals(dt: number, left: number, catX: number, speed: number): void {
    this.palT = left > 0 ? this.palT + dt : 0;
    const ratio = speed / SPEED.start;
    this.pals.forEach((p, i) => {
      const r = p.rig.root;
      r.visible = left > 0;
      if (!r.visible) return;
      // Trot up beside Miso, then drop back between her and Duke, barking.
      const k = Math.min(1, this.palT / 1.5);
      const side = i === 0 ? -1 : 1;
      r.position.set(catX + side * (1.6 + 0.2 * Math.sin(this.t * 3 + i)), 0, -0.8 + i * 0.6 + 1.4 * k);
      p.update(dt, ratio, speed > 0, false);
      if (Math.floor(this.t * 2.2 + i) % 3 === 0) p.startTaunt();
    });
  }

  /** Swaps the pups for a city's local breeds. `pups[1]` is assumed to be the rush dog. */
  setPups(lunger: string, rusher: string): void {
    this.root.remove(this.pickle.rig.root, this.bolt.rig.root);
    this.pickle = new Dog(DOGS[lunger]);
    this.bolt = new Dog(DOGS[rusher]);
    this.root.add(this.pickle.rig.root, this.bolt.rig.root);
  }

  taunt(): void {
    this.duke.startTaunt();
  }

  update(dt: number, chase: Chase, catX: number, speed: number, mode: number): void {
    this.x += (catX - this.x) * (1 - Math.exp(-CHASE.followRate * dt));
    this.t += dt;
    const gap = chase.gap;
    const ratio = speed / SPEED.start;
    const running = mode !== PackMode.Gloat;
    const face = mode === PackMode.Gloat;
    const visible = gap < CHASE.visibleGap;
    const push = this.pickle.style === 'push' ? 1.5 : 1;
    const lunge = chase.lunge > 0 ? Math.sin((chase.lunge / CHASE.lungeSec) * Math.PI) * CHASE.lungeDist * push : 0;

    const d = this.duke.rig.root;
    d.visible = visible;
    d.position.set(this.x, 0, gap);
    this.duke.update(dt, ratio, running, face);

    const p = this.pickle.rig.root;
    p.visible = visible;
    p.position.set(this.x - CHASE.flankX, 0, gap - 0.3 - lunge);
    this.pickle.update(dt, ratio * 1.1, running, face);

    const b = this.bolt.rig.root;
    let bx = this.x + CHASE.flankX;
    let bz = gap - 0.2;
    let bVisible = visible;
    if (mode === PackMode.Run && chase.rushPhase === RushPhase.Warn) {
      const t = 1 - chase.rushLeft / PACK_RUSH.warnSec;
      const e = t * t * (3 - 2 * t);
      bx = chase.boltSideX;
      bz = gap + (-PACK_RUSH.aheadStart - gap) * e;
      bVisible = true;
    } else if (mode === PackMode.Run && chase.rushPhase === RushPhase.Active) {
      bx = chase.boltX;
      bz = -chase.boltAhead;
      bVisible = true;
    }
    // Shibas feint: quick side-steps while they run.
    if (this.bolt.style === 'feint' && running) bx += Math.sin(this.t * 5.3) * 0.45 * Math.max(0, Math.sin(this.t * 1.7));
    b.visible = bVisible;
    b.position.set(bx, 0, bz);
    this.bolt.update(dt, ratio * 1.2, running, face);
  }
}
