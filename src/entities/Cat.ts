import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { Rng } from '../core/Rng';
import { CAT_ANIM as A, CAT_SHAPE } from '../data/cat';
import * as THREE from 'three';
import type { Slot } from '../data/accessories';
import { CATS, type CatId } from '../data/cats';
import { dressCat } from '../procgen/accessories';
import { POWERUP_IDS } from '../data/powerups';
import { buildCat, buildShadow, type CatRig } from '../procgen/cat';

const TAU = Math.PI * 2;
const MAX_SUBSTEP = 1 / 60;

/** Per-frame inputs from the simulation (interpolated), reused by the caller. */
export interface CatDrive {
  x: number;
  y: number;
  vy: number;
  speed: number;
  grounded: boolean;
  sliding: boolean;
  grinding: boolean;
  running: boolean;
  hidden: boolean;
  dizzy: boolean;
  /** Blink while invulnerable after a revive. */
  flicker: boolean;
  /** Inside the Cardboard Box: only the feet show. */
  boxed: boolean;
  /** Nap Time: curled up. */
  nap: boolean;
  /** Mystery Fish gag: loaf mode. */
  loaf: boolean;
  /** Visual lift (riding the Roomba). */
  lift: number;
  /** Home idle: groom (lick paw, wipe face). */
  groom?: boolean;
}

function damp(cur: number, target: number, rate: number, dt: number): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

/** Miso: procedural gallop, jump, slide, land, squash/stretch, spring tail, blink and ear flicks. */
export class Cat {
  rig: CatRig;
  /** Stays in the scene while the rig inside is rebuilt for skins. */
  readonly holder = new THREE.Group();
  readonly shadow = buildShadow();
  private skin: CatId = 'miso';
  private readonly rng = new Rng(99);
  private phase = 0;
  private time = 0;
  private air = 0;
  private slide = 0;
  private run = 0;
  private grind = 0;
  private squash = 0;
  private squashV = 0;
  private lastX = 0;
  private latVel = 0;
  private blinkIn = 3;
  private blinkT = 0;
  private earIn = 2;
  private earT = 0;
  private earSide = 0;
  private readonly tailPitch: Float32Array;
  private readonly tailPitchV: Float32Array;
  private readonly tailYaw: Float32Array;
  private readonly tailYawV: Float32Array;
  private pupil: number = A.pupil.day;
  private pupilTarget: number = A.pupil.day;
  private daylight = true;
  private catnip = false;
  private kickT = 0;
  private kickDir = 1;
  private groomT = 0;

  constructor(bus: EventBus<GameEvents>) {
    this.rig = buildCat(CATS.miso);
    this.holder.add(this.rig.root);
    const n = CAT_SHAPE.tailSegments;
    this.tailPitch = Float32Array.from(A.tailBaseCurve);
    this.tailPitchV = new Float32Array(n);
    this.tailYaw = new Float32Array(n);
    this.tailYawV = new Float32Array(n);
    bus.on('jump', () => (this.squashV += A.jumpStretch));
    bus.on('land', (impact) => (this.squashV -= impact * A.landSquashPerVy));
    bus.on('laneChange', () => (this.squashV += A.laneSquash));
    bus.on('wallKick', (n) => {
      this.squashV += A.jumpStretch * 1.2;
      this.kickT = A.kickRollSec;
      this.kickDir = n % 2 ? 1 : -1;
    });
    bus.on('powerStart', (i) => {
      if (POWERUP_IDS[i] === 'catnip') this.catnip = true;
    });
    bus.on('powerEnd', (i) => {
      if (POWERUP_IDS[i] === 'catnip') this.catnip = false;
    });
    bus.on('stumble', () => (this.squashV -= A.jumpStretch));
  }

  /** Bright light narrows the pupils to slits; dusk and night open them up. */
  setDaylight(on: boolean): void {
    this.daylight = on;
  }

  /** Swaps the skin (rebuilds the rig) and dresses the outfit. */
  setLook(skin: CatId, outfit: Partial<Record<Slot, string>>): void {
    if (skin !== this.skin) {
      this.skin = skin;
      this.holder.remove(this.rig.root);
      this.rig = buildCat(CATS[skin]);
      this.holder.add(this.rig.root);
    }
    dressCat(this.rig, outfit);
  }

  update(frameDt: number, d: CatDrive): void {
    if (frameDt <= 0) return;
    const r = this.rig;
    this.time += frameDt;

    this.air = damp(this.air, d.grounded ? 0 : 1, A.blendRate, frameDt);
    this.slide = damp(this.slide, d.sliding ? 1 : 0, A.blendRate, frameDt);
    this.run = damp(this.run, d.running ? 1 : 0, A.runBlendRate, frameDt);
    this.grind = damp(this.grind, d.grinding ? 1 : 0, A.blendRate, frameDt);

    const hz = Math.min(d.speed / A.strideLength, A.maxGallopHz) * this.run;
    this.phase = (this.phase + hz * frameDt * TAU) % TAU;
    const p = this.phase;
    const gait = this.run * (1 - this.air) * (1 - this.slide) * (1 - this.grind);

    // Legs: gallop pairs half a cycle apart, blended toward air and slide poses.
    const sw = A.legSwing * gait;
    const airF = A.airFront * this.air;
    const airB = A.airBack * this.air;
    const slF = A.slideFront * this.slide;
    const slB = A.slideBack * this.slide;
    // Rotary gallop: each leg has its own phase; elbows and hocks fold on the forward swing.
    const G = A.gallopPhase;
    for (let i = 0; i < 4; i++) {
      const front = i < 2;
      const lp = p + G[i];
      r.legs[i].rotation.x = sw * Math.sin(lp) + (front ? airF + slF : airB + slB);
      const fold = Math.max(0, Math.cos(lp)) * A.kneeFold * gait;
      r.knees[i].rotation.x = front ? fold + A.airKneeFront * this.air - slF * 0.2 : -fold + A.airKneeBack * this.air;
      r.legs[i].scale.setScalar(1);
      r.legs[i].rotation.z = 0;
    }
    r.head.rotation.y = 0;
    // Grind: balance pose, paws gathered under the body, slight side-to-side wobble.
    const gr = this.grind;
    for (let i = 0; i < 4; i++) r.legs[i].rotation.x += (i < 2 ? A.grindFront : A.grindBack) * gr;

    // Squash and stretch spring (positive = tall and thin).
    let t = frameDt;
    while (t > 0) {
      const h = Math.min(t, MAX_SUBSTEP);
      this.squashV += (-A.squashStiffness * this.squash - A.squashDamping * this.squashV) * h;
      this.squash += this.squashV * h;
      this.stepTail(h, d);
      t -= h;
    }
    const breath = (1 - this.run) * 0.02 * Math.sin(this.time * A.idleBreathHz * TAU);
    const spine = 1 + A.spineStretch * gait * Math.sin(p);
    const sy = (1 + this.squash + breath) * (1 - A.slideFlatten * this.slide);
    const sxz = 1 - this.squash * 0.5;
    r.body.scale.set(sxz, sy, sxz * spine);

    const bob = A.bobAmp * gait * Math.abs(Math.sin(p));
    r.body.position.y = r.bodyHeight + bob - A.slideDrop * this.slide;
    const pitch = A.pitchAmp * gait * Math.cos(p) + this.air * d.vy * A.airPitchPerVy;
    r.body.rotation.x = pitch;
    // Spine flexes (gathered) and extends (stretched) once per stride; the air pose stretches out.
    const flex = A.spineFlex * (gait * Math.cos(p) - this.air * 0.6 + this.slide * 0.4);
    r.chest.rotation.x = flex;
    r.hips.rotation.x = -flex;
    r.neck.rotation.x = -flex * 0.5;
    // Head stays level so the eyes stay on the road.
    r.head.rotation.x = -(pitch + flex * 0.5) * A.headStabilize + this.slide * 0.25;
    // Slide: ears pinned back.
    r.ears[0].rotation.x = r.ears[1].rotation.x = 0.9 * this.slide;

    // Lean into lane changes.
    const vx = (d.x - this.lastX) / frameDt;
    this.lastX = d.x;
    this.latVel = damp(this.latVel, vx, A.latVelRate, frameDt);
    r.root.rotation.z = -this.latVel * A.leanRoll + this.grind * A.grindWobble * Math.sin(this.time * A.grindWobbleHz * TAU);
    r.root.rotation.y = -this.latVel * A.leanYaw;
    r.root.position.set(d.x, d.y, 0);
    this.shadow.position.x = d.x;
    const s = 1 / (1 + d.y * 0.35);
    this.shadow.scale.set(s, 1, 1.6 * s);

    this.blinkAndEars(frameDt);

    // Dizzy after a crash: woozy sway and squinted eyes.
    if (d.dizzy) {
      r.root.rotation.y += Math.sin(this.time * 2.3) * 0.3;
      r.head.rotation.z = Math.sin(this.time * 4.6) * 0.3;
      r.eyes[0].scale.y = r.eyes[1].scale.y = 0.25;
    } else {
      r.head.rotation.z = 0;
    }
    // Nap: curled up, paws tucked. Loaf: paws hidden, body wide and low.
    if (d.nap || d.loaf) {
      r.body.scale.set(1.18, 0.62, d.nap ? 0.85 : 1.05);
      r.body.position.y = r.bodyHeight * 0.55;
      r.body.rotation.x = 0;
      r.head.rotation.x = d.nap ? 0.5 : 0;
      r.chest.rotation.x = r.hips.rotation.x = 0;
      for (let i = 0; i < 4; i++) {
        r.legs[i].rotation.x = i < 2 ? -1.5 : 1.5;
        r.knees[i].rotation.x = 0;
      }
    }
    // Loaf: paws tucked out of sight (collapsed into the body).
    if (d.loaf) for (let i = 0; i < 4; i++) r.legs[i].scale.setScalar(0.05);
    this.updateGroom(frameDt, !!d.groom && !d.running);
    // Wall-kick: a quick barrel roll off the wall.
    if (this.kickT > 0) {
      this.kickT = Math.max(0, this.kickT - frameDt);
      r.root.rotation.z += this.kickDir * TAU * THREE.MathUtils.smootherstep(1 - this.kickT / A.kickRollSec, 0, 1);
    }
    r.torso.visible = r.head.visible = r.tail[0].visible = !d.boxed;
    r.root.position.y = d.y + d.lift;

    const show = !d.hidden && !(d.flicker && Math.floor(this.time * 12) % 2 === 0);
    r.root.visible = show;
    this.shadow.visible = !d.hidden;
  }

  /** Home grooming: sit back, lift a front paw, lick it, wipe the face. */
  private updateGroom(dt: number, on: boolean): void {
    if (!on) {
      this.groomT = 0;
      return;
    }
    this.groomT += dt;
    const k = this.groomT % A.groomSec;
    const w = Math.min(1, k * 4, (A.groomSec - k) * 4);
    const r = this.rig;
    const lick = Math.sin(k * 14) * 0.12;
    const wipe = k > A.groomSec * 0.55 ? Math.sin((k - A.groomSec * 0.55) * 7) * 0.25 : 0;
    r.legs[0].rotation.x += (-1.9 + lick) * w;
    r.knees[0].rotation.x += 1.9 * w;
    r.legs[0].rotation.z = 0.25 * w;
    r.head.rotation.x += (0.45 + lick * 0.6) * w;
    r.head.rotation.y += (-0.35 + wipe) * w;
    r.chest.rotation.x += -0.25 * w;
  }

  /** Squash-pop when Miso bursts out of the dust cloud or revives. */
  pop(): void {
    this.squashV += A.jumpStretch * 1.6;
  }

  private stepTail(h: number, d: CatDrive): void {
    const n = this.tailPitch.length;
    for (let i = 0; i < n; i++) {
      const k = A.tailStiffness[i];
      const w = (i + 1) / n;
      const sway = A.tailSway * Math.sin(this.time * A.tailSwayHz * TAU - i * 0.6) * (1 - 0.6 * this.run);
      const tp = A.tailBaseCurve[i] + d.vy * A.tailVyLag * w + this.slide * 0.15;
      const ty = sway + this.latVel * A.tailLatLag * w;
      this.tailPitchV[i] += (k * (tp - this.tailPitch[i]) - A.tailDamping * this.tailPitchV[i]) * h;
      this.tailPitch[i] += this.tailPitchV[i] * h;
      this.tailYawV[i] += (k * (ty - this.tailYaw[i]) - A.tailDamping * this.tailYawV[i]) * h;
      this.tailYaw[i] += this.tailYawV[i] * h;
      const seg = this.rig.tail[i];
      seg.rotation.x = this.tailPitch[i];
      seg.rotation.y = this.tailYaw[i];
    }
  }

  private blinkAndEars(dt: number): void {
    const r = this.rig;
    this.blinkIn -= dt;
    if (this.blinkIn <= 0) {
      this.blinkT = A.blinkSec;
      this.blinkIn = this.rng.range(A.blinkEvery[0], A.blinkEvery[1]);
    }
    let eyeY = 1.15;
    if (this.blinkT > 0) {
      this.blinkT -= dt;
      eyeY = 0.1 + 1.05 * Math.abs(1 - (2 * Math.max(this.blinkT, 0)) / A.blinkSec);
    }
    r.eyes[0].scale.y = eyeY;
    r.eyes[1].scale.y = eyeY;

    this.earIn -= dt;
    if (this.earIn <= 0) {
      this.earT = A.earFlickSec;
      this.earSide = this.rng.int(0, 2);
      this.earIn = this.rng.range(A.earFlickEvery[0], A.earFlickEvery[1]);
    }
    let flick = 0;
    if (this.earT > 0) {
      this.earT -= dt;
      flick = Math.sin((1 - Math.max(this.earT, 0) / A.earFlickSec) * Math.PI) * A.earFlickAngle;
    }
    r.ears[0].rotation.x += this.earSide === 0 ? -flick : 0;
    r.ears[1].rotation.x += this.earSide === 1 ? -flick : 0;

    // Pupils: slits in daylight, round at dusk, huge on Catnip.
    this.pupilTarget = this.catnip ? A.pupil.catnip : this.daylight ? A.pupil.day : A.pupil.dim;
    this.pupil += (this.pupilTarget - this.pupil) * Math.min(1, dt * A.pupil.rate);
    r.pupils[0].scale.x = r.pupils[1].scale.x = this.pupil;
  }
}
