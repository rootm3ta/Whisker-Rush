import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { ABILITIES, ABILITY, type AbilityId } from '../data/abilities';
import { HITBOX } from '../data/spawner';
import type { Chase } from './Chase';
import type { Collision } from './Collision';
import type { Field } from './Field';
import type { Modifiers } from './Modifiers';
import { bestLane } from './PathFinder';
import type { Runner } from './Runner';

const IDS = Object.keys(ABILITIES) as AbilityId[];

/** The equipped active ability: charged by combo gains, fired by double-tap or Space. */
export class Abilities {
  equipped: AbilityId = ABILITY.default;
  charge = 0;
  napLeft = 0;
  purrLeft = 0;
  private ready = false;

  constructor(private readonly bus: EventBus<GameEvents>) {
    bus.on('comboGain', (g) => {
      this.charge = Math.min(1, this.charge + g / ABILITY.chargeNeeded);
      if (this.charge >= 1 && !this.ready) {
        this.ready = true;
        bus.emit('abilityReady', IDS.indexOf(this.equipped));
      }
    });
  }

  get charged(): boolean {
    return this.charge >= 1;
  }

  get napping(): boolean {
    return this.napLeft > 0;
  }

  reset(equipped: AbilityId): void {
    this.equipped = equipped;
    this.charge = 0;
    this.napLeft = 0;
    this.purrLeft = 0;
    this.ready = false;
  }

  /** Returns false when not charged or blocked (Pounce during a Boss Chase). */
  activate(r: Runner, chase: Chase, collision: Collision, bossActive: boolean): boolean {
    if (!this.charged) return false;
    switch (this.equipped) {
      case 'hiss':
        chase.hiss();
        collision.clearStumbles();
        break;
      case 'nap':
        this.napLeft = ABILITY.napSec;
        break;
      case 'pounce':
        if (bossActive || r.flying) return false;
        r.dashLeft = ABILITY.pounceMeters;
        r.dashSpeed = ABILITY.pounceMeters / ABILITY.pounceSec;
        break;
      case 'purr':
        this.purrLeft = ABILITY.purrSec;
        break;
    }
    this.charge = 0;
    this.ready = false;
    this.bus.emit('ability', IDS.indexOf(this.equipped));
    return true;
  }

  /** Real-time nap countdown; the world is frozen meanwhile. Returns true on the frame the nap ends. */
  stepNap(dt: number, r: Runner, field: Field, collision: Collision): boolean {
    if (this.napLeft <= 0) return false;
    this.napLeft -= dt;
    if (this.napLeft > 0) return false;
    r.setLane(bestLane(field, r.distance, r.lane, 20));
    collision.addGrace(ABILITY.napDodgeGrace);
    return true;
  }

  step(dt: number, r: Runner, m: Modifiers): void {
    if (r.dashLeft > 0) m.invincible = true;
    if (this.purrLeft > 0) {
      this.purrLeft -= dt;
      m.reachX = Math.max(m.reachX, ABILITY.purrReachX - HITBOX.coinReachX);
    }
  }
}
