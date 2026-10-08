import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { LANES } from '../data/runner';
import { CHASE, PACK_RUSH } from '../data/chase';
import type { Runner } from './Runner';

export const RushPhase = { Idle: 0, Warn: 1, Active: 2 } as const;

function damp(cur: number, target: number, rate: number, dt: number): number {
  return cur + (target - cur) * (1 - Math.exp(-rate * dt));
}

/**
 * The dog pack behind the cat. Stumbles bring the pack on screen; Pack Rush sends
 * Bolt ahead to drop back through the cat's lane. Pure logic, no rendering.
 */
export class Chase {
  gap: number = CHASE.farGap;
  closeLeft = 0;
  lunge = 0;
  pounce = false;
  rushPhase: number = RushPhase.Idle;
  rushLeft = 0;
  /** Bolt during Pack Rush: offset ahead of the cat (m) and lateral x. */
  boltAhead = 0;
  boltX = 0;
  /** Neighbor lane x Bolt overtakes in during the warning. */
  boltSideX = 0;
  private boltTargetX = 0;
  private passT = 0;
  private rushHit = false;
  private nextRushAt: number = PACK_RUSH.firstAtSec;
  private tauntCd = 0;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly onBoltHit: () => void,
  ) {
    bus.on('stumble', () => {
      this.closeLeft = CHASE.closeSec;
      this.lunge = CHASE.lungeSec;
    });
  }

  get close(): boolean {
    return this.closeLeft > 0 || this.pounce;
  }

  reset(): void {
    this.gap = CHASE.farGap;
    this.closeLeft = 0;
    this.lunge = 0;
    this.pounce = false;
    this.rushPhase = RushPhase.Idle;
    this.rushLeft = 0;
    this.nextRushAt = PACK_RUSH.firstAtSec;
    this.tauntCd = 0;
  }

  /** After a revive: pack drops back, any rush is cancelled and rescheduled. */
  backOff(runTime: number): void {
    this.closeLeft = 0;
    this.pounce = false;
    if (this.rushPhase !== RushPhase.Idle) this.endRush(false);
    this.nextRushAt = Math.max(this.nextRushAt, runTime + PACK_RUSH.everySec / 2);
  }

  /** Cardboard Box / boosts: the pack loses the trail and drops back. */
  loseTrail(): void {
    this.closeLeft = 0;
    this.lunge = 0;
  }

  /** Hiss: scares the pack back and Bolt off the road. */
  hiss(): void {
    this.loseTrail();
    if (this.rushPhase !== RushPhase.Idle) {
      this.rushPhase = RushPhase.Idle;
      this.nextRushAt += PACK_RUSH.everySec;
      this.bus.emit('packRushEnd', 0);
    }
  }

  /** Called while the crash/caught animation plays. */
  stepPounce(dt: number): void {
    this.pounce = true;
    this.gap = damp(this.gap, CHASE.pounceGap, CHASE.gapRate * 3, dt);
  }

  /** After the crash: the pack backs up a little to gloat. */
  stepGloat(dt: number): void {
    this.gap = damp(this.gap, CHASE.gloatGap, CHASE.gapRate, dt);
  }

  step(dt: number, r: Runner): void {
    const target = this.closeLeft > 0 ? CHASE.closeGap : CHASE.farGap;
    this.gap = damp(this.gap, target, CHASE.gapRate, dt);
    if (this.closeLeft > 0) this.closeLeft -= dt;
    if (this.lunge > 0) this.lunge -= dt;
    if (this.tauntCd > 0) this.tauntCd -= dt;
    if (this.gap < CHASE.tauntGap && this.tauntCd <= 0) {
      this.tauntCd = CHASE.tauntEvery;
      this.bus.emit('dukeTaunt', 0);
    }
    this.stepRush(dt, r);
  }

  private stepRush(dt: number, r: Runner): void {
    switch (this.rushPhase) {
      case RushPhase.Idle:
        if (r.time >= this.nextRushAt) {
          this.rushPhase = RushPhase.Warn;
          this.rushLeft = PACK_RUSH.warnSec;
          this.boltSideX = (r.lane < 1 ? r.lane + 1 : r.lane - 1) * LANES.width;
          this.bus.emit('packRushWarn', 0);
        }
        return;
      case RushPhase.Warn:
        this.rushLeft -= dt;
        if (this.rushLeft <= 0) {
          this.rushPhase = RushPhase.Active;
          this.rushLeft = PACK_RUSH.durationSec;
          this.rushHit = false;
          this.boltX = this.boltSideX;
          this.startPass(r);
          this.bus.emit('packRushStart', 0);
        }
        return;
      case RushPhase.Active: {
        this.passT += dt;
        const t = Math.min(1, this.passT / PACK_RUSH.passSec);
        this.boltAhead = PACK_RUSH.aheadStart + (PACK_RUSH.passEnd - PACK_RUSH.aheadStart) * t;
        this.boltX = damp(this.boltX, this.boltTargetX, 10, dt);
        if (
          !this.rushHit &&
          Math.abs(r.x - this.boltX) < PACK_RUSH.hitHalfX &&
          Math.abs(this.boltAhead) < PACK_RUSH.hitHalfZ &&
          r.y < PACK_RUSH.height
        ) {
          this.rushHit = true;
          this.onBoltHit();
        }
        if (t >= 1) this.startPass(r);
        this.rushLeft -= dt;
        if (this.rushLeft <= 0) this.endRush(!this.rushHit);
        return;
      }
    }
  }

  /** Bolt cuts into the lane the cat is in right now, far enough ahead to react. */
  private startPass(r: Runner): void {
    this.passT = 0;
    this.boltAhead = PACK_RUSH.aheadStart;
    this.boltTargetX = r.lane * LANES.width;
  }

  private endRush(survived: boolean): void {
    this.rushPhase = RushPhase.Idle;
    this.nextRushAt += PACK_RUSH.everySec;
    this.bus.emit('packRushEnd', survived ? 1 : 0);
  }
}
