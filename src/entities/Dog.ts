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

  get style(): DogDef['style'] {
    return this.def.style;
  }

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
    const G = A.gallopPhase;
    for (let i = 0; i < 4; i++) {
      const lp = p + G[i];
      r.legs[i].rotation.x = sw * Math.sin(lp);
      const fold = Math.max(0, Math.cos(lp)) * A.kneeFold * this.run;
      r.knees[i].rotation.x = i < 2 ? fold : -fold;
    }
    const spring = A.springy[this.def.build] ?? 1;
    r.body.position.y = r.bodyHeight + A.bobAmp * spring * this.run * Math.abs(Math.sin(p));
    r.body.rotation.x = 0.06 * this.run * Math.cos(p);
    const flex = A.spineFlex * this.run * Math.cos(p);
    r.chest.rotation.x = flex;
    r.hips.rotation.x = -flex;
    const flop = A.earFlop * (this.run * Math.sin(p + 1) + (1 - this.run) * 0.3 * Math.sin(this.time * A.idleHz * TAU));
    if (this.def.ears === 'long') {
      // Long ears flap out to the sides.
      r.ears[0].rotation.z = -Math.abs(flop) * 1.6;
      r.ears[1].rotation.z = Math.abs(flop) * 1.6;
    } else {
      r.ears[0].rotation.x = r.ears[1].rotation.x = flop * (this.def.ears === 'pointy' ? 0.25 : 0.8);
    }
    for (let i = 0; i < r.jowls.length; i++) r.jowls[i].rotation.x = A.jowlBounce * this.run * Math.sin(p * 2 + 0.6);
    const wag = A.tailWag * Math.sin(this.time * A.tailWagHz * TAU);
    for (let i = 0; i < r.tails.length; i++) r.tails[i].rotation.y = wag * (0.6 + i * 0.3) * Math.cos(i * 0.5);

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
