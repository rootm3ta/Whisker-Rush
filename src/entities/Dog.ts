import { DOG_ANIM as A, type DogDef } from '../data/dogs';
import { buildDog, type DogRig } from '../procgen/dog';

const TAU = Math.PI * 2;

function damp(cur: number, target: number, rate: number, dt: number): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

/** One animated dog: gallop, ear flop, tail wag, taunt head shake, turn to face the camera. */
export class Dog {
  readonly rig: DogRig;
  private phase = Math.random() * TAU;
  private time = 0;
  private run = 1;
  private taunt = 0;
  private face = 0;

  constructor(private readonly def: DogDef) {
    this.rig = buildDog(def);
  }

  startTaunt(): void {
    this.taunt = A.tauntSec;
  }

  /** `running` 0..1 blends gallop vs idle; `faceCamera` turns the dog around to gloat. */
  update(dt: number, speedRatio: number, running: boolean, faceCamera: boolean): void {
    const r = this.rig;
    this.time += dt;
    this.run = damp(this.run, running ? 1 : 0, 6, dt);
    this.face = damp(this.face, faceCamera ? 1 : 0, 6, dt);
    this.phase = (this.phase + this.def.gallopHz * Math.max(0.6, speedRatio) * this.run * dt * TAU) % TAU;
    const p = this.phase;
    const sw = A.legSwing * this.run;
    r.legs[0].rotation.x = sw * Math.sin(p);
    r.legs[1].rotation.x = sw * Math.sin(p + 0.4);
    r.legs[2].rotation.x = sw * Math.sin(p + Math.PI);
    r.legs[3].rotation.x = sw * Math.sin(p + Math.PI + 0.4);
    r.body.position.y = r.bodyHeight + A.bobAmp * this.run * Math.abs(Math.sin(p));
    r.body.rotation.x = 0.06 * this.run * Math.cos(p);
    const flop = A.earFlop * (this.run * Math.sin(p + 1) + (1 - this.run) * 0.3 * Math.sin(this.time * A.idleHz * TAU));
    r.ears[0].rotation.y = flop;
    r.ears[1].rotation.y = -flop;
    r.tail.rotation.y = A.tailWag * Math.sin(this.time * A.tailWagHz * TAU);

    let shake = 0;
    if (this.taunt > 0) {
      this.taunt -= dt;
      shake = Math.sin(this.taunt * 40) * 0.35 * (this.taunt / A.tauntSec);
    }
    r.head.rotation.z = shake;
    r.head.rotation.x = -0.1 * shake;
    r.root.rotation.y = this.face * Math.PI;
  }
}
