import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { HITBOX } from '../data/spawner';
import { REFLEX, STUMBLE } from '../data/scoring';
import type { Satchel } from '../meta/Satchel';
import { PickupKind, type Field, type Obstacle } from './Field';
import type { Runner } from './Runner';

/** Forgiving AABB collisions, pickups and Cat Reflex near-miss tracking. */
export class Collision {
  private lastStumble = -Infinity;
  private grace = 0;
  crashed = false;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly field: Field,
    private readonly satchel: Satchel,
  ) {}

  reset(): void {
    this.lastStumble = -Infinity;
    this.grace = 0;
    this.crashed = false;
  }

  get invulnerable(): boolean {
    return this.grace > 0;
  }

  /** Stumble caused by something outside the field (Bolt during Pack Rush). */
  externalStumble(r: Runner): void {
    if (this.grace > 0 || this.crashed) return;
    this.stumble(r);
  }

  /** Clears the crash and grants invulnerability. */
  revive(invulnSec: number): void {
    this.crashed = false;
    this.grace = invulnSec;
    this.lastStumble = -Infinity;
  }

  /** The obstacle about to hit the cat within the Cat Reflex window, at the current pose. */
  findThreat(r: Runner): Obstacle | null {
    const reach = r.speed * REFLEX.windowSec;
    const front = r.distance + HITBOX.halfLength;
    let best: Obstacle | null = null;
    for (const o of this.field.obstacles) {
      if (!o.active || o.hit || o.armed || !o.def.body) continue;
      const ahead = o.s0 - front;
      if (ahead < 0 || ahead > reach) continue;
      if (!this.overlapsX(r.x, o) || !this.overlapsY(r.y, r.height, o)) continue;
      if (!best || o.s0 < best.s0) best = o;
    }
    return best;
  }

  step(r: Runner, dt: number): void {
    if (this.grace > 0) this.grace -= dt;
    const s = r.distance;
    const hl = HITBOX.halfLength;

    for (const o of this.field.obstacles) {
      if (!o.active) continue;
      if (o.armed && s - hl > o.s1) {
        o.armed = false;
        if (!o.hit) this.bus.emit('nearMiss', 0);
      }
      const body = o.def.body;
      if (!body || o.hit || this.crashed) continue;
      if (s + hl < o.s0 || s - hl > o.s1) continue;
      if (!this.overlapsX(r.x, o) || !this.overlapsY(r.y, r.height, o)) continue;
      const top = o.def.top;
      if (top !== null && r.y >= top - HITBOX.stepUp) {
        r.landOn(top);
        continue;
      }
      if (this.grace > 0) continue;
      o.hit = true;
      o.armed = false;
      const side = !this.overlapsX(r.prevX, o);
      if (side) {
        r.bounceBack();
        this.stumble(r);
      } else if (o.def.lethal) {
        this.crash(0);
      } else {
        this.stumble(r);
      }
    }
    this.collect(r);
  }

  private stumble(r: Runner): void {
    if (r.time - this.lastStumble <= STUMBLE.windowSec) {
      this.crash(1);
      return;
    }
    this.lastStumble = r.time;
    this.grace = STUMBLE.graceSec;
    this.bus.emit('stumble', 0);
  }

  private crash(caught: number): void {
    this.crashed = true;
    this.bus.emit('crash', caught);
  }

  private collect(r: Runner): void {
    const top = r.y + r.height;
    for (const c of this.field.coins) {
      if (!c.active) continue;
      if (Math.abs(c.s - r.distance) > HITBOX.coinReachZ || Math.abs(c.x - r.x) > HITBOX.coinReachX) continue;
      if (c.y < r.y - HITBOX.coinReachY || c.y > top + HITBOX.coinReachY) continue;
      c.active = false;
      this.bus.emit('coin', 1);
    }
    for (const p of this.field.pickups) {
      if (!p.active || p.blocked) continue;
      if (Math.abs(p.s - r.distance) > HITBOX.coinReachZ || Math.abs(p.x - r.x) > HITBOX.coinReachX) continue;
      if (p.y < r.y - HITBOX.coinReachY || p.y > top + HITBOX.coinReachY) continue;
      if (p.kind === PickupKind.FishBone) {
        p.active = false;
        this.bus.emit('fishBone', 1);
      } else if (this.satchel.add(p.item)) {
        p.active = false;
        this.bus.emit('loot', p.item);
      } else {
        p.blocked = true;
        this.bus.emit('satchelFull', 0);
      }
    }
  }

  private overlapsX(x: number, o: Obstacle): boolean {
    return Math.abs(x - o.x) < o.def.halfWidth + HITBOX.halfWidth;
  }

  private overlapsY(y: number, h: number, o: Obstacle): boolean {
    const b = o.def.body;
    return b !== null && y < b[1] && y + h > b[0];
  }
}
