import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { Rng } from '../core/Rng';
import { BOSS } from '../data/boss';
import { LANES } from '../data/runner';
import { OBSTACLES } from '../data/obstacles';
import { HITBOX } from '../data/spawner';
import { PickupKind, type Field } from './Field';
import type { Runner } from './Runner';

export const BossPhase = { Idle: 0, Intro: 1, Throwing: 2, Swerve: 3 } as const;

/** Boss Chase: Duke rides the mail truck ahead and throws parcels into the cat's path. */
export class Boss {
  phase: number = BossPhase.Idle;
  /** Truck offset ahead of the cat (m) and lateral x. */
  ahead = 60;
  truckX = 0;
  dodges = 0;
  /** Seconds since the current throw started (for Duke's throw animation). */
  throwAnim = 0;
  /** Swerve progress 0..1. */
  swerve = 0;
  private nextAt: number = BOSS.every;
  private t = 0;
  private throwT = 0;
  private laneT = 0;
  private targetX = 0;
  private readonly rng = new Rng(3000);
  /** What Duke throws in this city. */
  throwIds: readonly string[] = BOSS.throwIds;

  constructor(private readonly bus: EventBus<GameEvents>) {}

  get active(): boolean {
    return this.phase !== BossPhase.Idle;
  }

  reset(): void {
    this.phase = BossPhase.Idle;
    this.nextAt = BOSS.every;
    this.dodges = 0;
    this.swerve = 0;
  }

  /** `blocked` delays the boss (e.g. while in the Secret Alley or flying). Returns true when the spawner should pause. */
  step(dt: number, r: Runner, field: Field, blocked: boolean): void {
    switch (this.phase) {
      case BossPhase.Idle:
        if (r.distance >= this.nextAt && !blocked) {
          this.phase = BossPhase.Intro;
          this.t = BOSS.introSec;
          this.ahead = 70;
          this.truckX = this.targetX = r.lane * LANES.width;
          this.dodges = 0;
          this.swerve = 0;
          field.clearAll(r.distance + 12);
          this.bus.emit('bossStart', 0);
        }
        return;
      case BossPhase.Intro:
        this.t -= dt;
        this.ahead += (BOSS.ahead - this.ahead) * (1 - Math.exp(-2.5 * dt));
        if (this.t <= 0) {
          this.phase = BossPhase.Throwing;
          this.throwT = 0.3;
          this.laneT = BOSS.laneChangeEvery;
        }
        return;
      case BossPhase.Throwing:
        this.stepThrowing(dt, r, field);
        return;
      case BossPhase.Swerve:
        this.swerve = Math.min(1, this.swerve + dt / BOSS.swerveSec);
        this.truckX += (BOSS.swerveX * Math.sign(this.truckX || 1) - this.truckX) * (1 - Math.exp(-3 * dt));
        this.ahead -= r.speed * 0.5 * dt;
        if (this.swerve >= 1) {
          this.phase = BossPhase.Idle;
          this.nextAt += BOSS.every;
          field.addPickup(PickupKind.Chest, 0, r.lane * LANES.width, r.distance + 18, 0.8);
        }
        return;
    }
  }

  private stepThrowing(dt: number, r: Runner, field: Field): void {
    this.throwAnim += dt;
    this.truckX += (this.targetX - this.truckX) * (1 - Math.exp(-2 * dt));
    this.laneT -= dt;
    if (this.laneT <= 0) {
      this.laneT = BOSS.laneChangeEvery;
      this.targetX = this.rng.int(-1, 2) * LANES.width;
    }
    this.throwT -= dt;
    if (this.throwT <= 0 && this.dodges + this.inFlight(field) < BOSS.throwsToWin) {
      this.throwT = BOSS.throwEvery;
      const lane = this.rng.next() < 0.6 ? r.lane : this.rng.int(-1, 2);
      const id = this.rng.pick(this.throwIds);
      const o = field.addObstacle(id, lane * LANES.width, r.distance + this.ahead, OBSTACLES[id].length, 0xffffff);
      if (o) {
        o.thrown = true;
        o.flight = BOSS.flightSec;
        this.throwAnim = 0;
      }
    }
    for (let i_o = 0; i_o < field.obstacles.length; i_o++) {
      const o = field.obstacles[i_o];
      if (!o.active || !o.thrown) continue;
      if (o.flight > 0) o.flight = Math.max(0, o.flight - dt);
      if (!o.counted && o.s1 < r.distance - HITBOX.halfLength) {
        o.counted = true;
        if (!o.hit) {
          this.dodges++;
          this.bus.emit('bossDodge', this.dodges);
        }
      }
    }
    if (this.dodges >= BOSS.throwsToWin) {
      this.phase = BossPhase.Swerve;
      this.bus.emit('bossDefeated', 0);
    }
  }

  private inFlight(field: Field): number {
    let n = 0;
    for (let i_o = 0; i_o < field.obstacles.length; i_o++) { const o = field.obstacles[i_o]; if (o.active && o.thrown && !o.counted) n++; }
    return n;
  }
}
