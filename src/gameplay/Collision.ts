import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { HITBOX } from '../data/spawner';
import { REFLEX, STUMBLE } from '../data/scoring';
import { CAT_DOOR } from '../data/secrets';
import { POWERUP_FX } from '../data/powerups';
import type { Modifiers } from './Modifiers';
import type { Satchel } from '../meta/Satchel';
import { PickupKind, type Field, type Obstacle } from './Field';
import type { Runner } from './Runner';

/** Forgiving AABB collisions, pickups and Cat Reflex near-miss tracking. */
export class Collision {
  private lastStumble = -Infinity;
  private grace = 0;
  crashed = false;
  /** Handles special pickups (power-ups, mystery fish, bells, letters, chests). */
  onSpecialPickup: ((kind: number, item: number) => void) | null = null;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly field: Field,
    private readonly satchel: Satchel,
    private readonly mods: Modifiers,
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

  /** Grants a short invulnerability window (after flights, absorbed hits, naps). */
  addGrace(sec: number): void {
    this.grace = Math.max(this.grace, sec);
  }

  /** Clears the stumble streak (Hiss). */
  clearStumbles(): void {
    this.lastStumble = -Infinity;
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
    for (let i_o = 0; i_o < this.field.obstacles.length; i_o++) {
      const o = this.field.obstacles[i_o];
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

    for (let i_o = 0; i_o < this.field.obstacles.length; i_o++) {
      const o = this.field.obstacles[i_o];
      if (!o.active) continue;
      if (o.armed && s - hl > o.s1) {
        o.armed = false;
        if (!o.hit) this.bus.emit('nearMiss', 0);
      }
      const body = o.def.body;
      if (!body || o.hit || this.crashed || o.flight > 0) continue;
      if (s + hl < o.s0 || s - hl > o.s1) continue;
      if (!this.overlapsX(r.x, o) || !this.overlapsY(r.y, r.height, o)) continue;
      const m = this.mods;
      if (m.passLowHeight > 0 && body[1] <= m.passLowHeight) continue;
      const side = !this.overlapsX(r.prevX, o);
      if (side && o.def.catDoor && Math.abs(s - (o.s0 + CAT_DOOR.at)) <= CAT_DOOR.halfLength) {
        o.hit = true;
        this.bus.emit('catDoor', 0);
        continue;
      }
      if (m.invincible) {
        o.active = false;
        this.bus.emit('smash', 0);
        continue;
      }
      const top = o.def.top;
      if (top !== null && r.y >= top - HITBOX.stepUp && r.flyHeight === null) {
        r.landOn(top);
        continue;
      }
      if (this.grace > 0) continue;
      o.hit = true;
      o.armed = false;
      if (m.absorb && m.absorb()) {
        this.grace = POWERUP_FX.afterGraceSec;
        if (side) r.bounceBack();
        continue;
      }
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
    const rx = HITBOX.coinReachX + this.mods.reachX;
    // Purr Field reaches sideways at any height; otherwise pickups must be near the body.
    const ryLo = this.mods.reachX > 0 ? -99 : r.y - HITBOX.coinReachY;
    const ryHi = this.mods.reachX > 0 ? 99 : top + HITBOX.coinReachY;
    // Fast dashes cover several metres per step: sweep from the previous distance.
    const s0 = Math.min(r.prevDistance, r.distance) - HITBOX.coinReachZ;
    const s1 = r.distance + HITBOX.coinReachZ;
    for (let i_c = 0; i_c < this.field.coins.length; i_c++) {
      const c = this.field.coins[i_c];
      if (!c.active || c.s < s0 || c.s > s1 || Math.abs(c.x - r.x) > rx) continue;
      if (c.y < ryLo || c.y > ryHi) continue;
      c.active = false;
      this.bus.emit('coin', 1);
    }
    for (let i_p = 0; i_p < this.field.pickups.length; i_p++) {
      const p = this.field.pickups[i_p];
      if (!p.active || p.blocked || p.s < s0 || p.s > s1 || Math.abs(p.x - r.x) > rx) continue;
      if (p.y < ryLo || p.y > ryHi) continue;
      if (p.kind >= PickupKind.PowerUp) {
        p.active = false;
        this.onSpecialPickup?.(p.kind, p.item);
      } else if (p.kind === PickupKind.FishBone) {
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
