import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { LANES } from '../data/runner';
import { POWERUPS, POWERUP_FX as FX, POWERUP_IDS, POWERUP_LEVEL_MULT, ROOMBA, type PowerUpId } from '../data/powerups';
import { Rng } from '../core/Rng';
import { PickupKind, type Field } from './Field';
import type { Collision } from './Collision';
import type { Chase } from './Chase';
import type { Modifiers } from './Modifiers';
import type { Runner } from './Runner';
import { bestLane } from './PathFinder';

const IDX = Object.fromEntries(POWERUP_IDS.map((id, i) => [id, i])) as Record<PowerUpId, number>;

/** Timed power-ups, start boosts and the Roomba ride. Writes Modifiers every step. */
export class PowerUps {
  /** Remaining seconds (or metres for Zoomies/Fish Rocket) per POWERUP_IDS index. */
  readonly left = new Float32Array(POWERUP_IDS.length);
  /** Full duration at activation, for HUD bars. */
  readonly full = new Float32Array(POWERUP_IDS.length);
  bubble = false;
  roombaLeft = 0;
  /** Laser Dot target lane x (valid while laser is active). */
  laserX = 0;
  laserLane = 0;
  /** Seconds the Roomba fly-off animation still plays. */
  roombaFlyOff = 0;
  /** Upgrade level lookup (Scratching Post, M5). */
  levelOf: (id: PowerUpId) => number = () => 1;
  private skyCoinT = 0;
  private skyLane = 0;
  private readonly rng = new Rng(31337);

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly mods: Modifiers,
  ) {}

  reset(): void {
    this.left.fill(0);
    this.full.fill(0);
    this.bubble = false;
    this.roombaLeft = 0;
    this.roombaFlyOff = 0;
  }

  isOn(id: PowerUpId): boolean {
    return id === 'bubble' ? this.bubble : this.left[IDX[id]] > 0;
  }

  get riding(): boolean {
    return this.roombaLeft > 0;
  }

  activate(id: PowerUpId): void {
    const def = POWERUPS[id];
    const i = IDX[id];
    if (id === 'bubble') {
      this.bubble = true;
    } else {
      const lvl = Math.max(1, Math.min(POWERUP_LEVEL_MULT.length, this.levelOf(id)));
      const amount = def.meters > 0 ? def.meters : def.duration * POWERUP_LEVEL_MULT[lvl - 1];
      this.left[i] = amount;
      this.full[i] = amount;
    }
    this.bus.emit('powerStart', i);
  }

  startRoomba(): boolean {
    if (this.roombaLeft > 0) return false;
    this.roombaLeft = ROOMBA.duration;
    this.bus.emit('roombaStart', 0);
    return true;
  }

  /** Shields in order: Milk Bubble, then Roomba. */
  readonly absorb = (): boolean => {
    if (this.bubble) {
      this.bubble = false;
      this.bus.emit('shieldPop', 0);
      this.bus.emit('powerEnd', IDX.bubble);
      return true;
    }
    if (this.roombaLeft > 0) {
      this.roombaLeft = 0;
      this.roombaFlyOff = ROOMBA.flyOffSec;
      this.bus.emit('shieldPop', 1);
      return true;
    }
    return false;
  };

  step(dt: number, r: Runner, field: Field, chase: Chase, collision: Collision): void {
    const m = this.mods;
    const moved = r.distance - r.prevDistance;
    m.absorb = this.absorb;
    if (this.roombaLeft > 0) this.roombaLeft = Math.max(0, this.roombaLeft - dt);
    if (this.roombaFlyOff > 0) this.roombaFlyOff -= dt;

    let flying: number | null = null;
    for (let i = 0; i < POWERUP_IDS.length; i++) {
      if (this.left[i] <= 0) continue;
      const id = POWERUP_IDS[i];
      const byMeters = POWERUPS[id].meters > 0;
      this.left[i] -= byMeters ? moved : dt;
      switch (id) {
        case 'magnet':
          this.pull(dt, r, field);
          break;
        case 'catnip':
          m.speedMul *= FX.catnipSpeedMul;
          m.invincible = true;
          break;
        case 'balloon':
          flying = FX.balloonHeight;
          // Stop the trail early so no sky coins are left out of reach after landing.
          if (this.left[i] > FX.balloonCoinStopSec) this.skyCoins(dt, r, field);
          break;
        case 'box':
          m.passLowHeight = FX.boxPassHeight;
          chase.loseTrail();
          break;
        case 'laser':
          this.laserLane = bestLane(field, r.distance, this.laserLane, FX.laserLookahead);
          this.laserX = this.laserLane * LANES.width;
          if (r.lane === this.laserLane) m.scoreMul *= FX.laserScoreMul;
          break;
        case 'treats':
          m.coinMul *= FX.treatsCoinMul;
          break;
        case 'zoomies':
          m.speedMul *= FX.zoomiesSpeedMul;
          m.invincible = true;
          chase.loseTrail();
          break;
        case 'fishRocket':
          m.speedMul *= FX.rocketSpeedMul;
          m.invincible = true;
          flying = FX.rocketHeight;
          chase.loseTrail();
          break;
      }
      if (this.left[i] <= 0) {
        this.left[i] = 0;
        this.bus.emit('powerEnd', i);
        if (id === 'balloon' || id === 'fishRocket' || id === 'zoomies') collision.addGrace(FX.afterGraceSec);
      }
    }
    r.flyHeight = flying;
  }

  /** Yarn Magnet: coins and loot ahead in all lanes drift into the cat. */
  private pull(dt: number, r: Runner, field: Field): void {
    const k = 1 - Math.exp(-FX.magnetPull * dt);
    const ty = r.y + 0.5;
    for (const c of field.coins) {
      if (!c.active || c.s < r.distance - 1 || c.s > r.distance + FX.magnetAhead) continue;
      if (Math.abs(c.x - r.x) > FX.magnetRadius) continue;
      c.x += (r.x - c.x) * k;
      c.y += (ty - c.y) * k;
      c.s += (r.distance - c.s) * k;
    }
    for (const p of field.pickups) {
      if (!p.active || p.blocked || p.kind !== PickupKind.Loot) continue;
      if (p.s < r.distance - 1 || p.s > r.distance + FX.magnetAhead) continue;
      p.x += (r.x - p.x) * k;
      p.y += (ty - p.y) * k;
      p.s += (r.distance - p.s) * k;
    }
  }

  /** Balloon Ride: a trail of sky coins at balloon height that wanders across lanes. */
  private skyCoins(dt: number, r: Runner, field: Field): void {
    this.skyCoinT -= dt;
    if (this.skyCoinT > 0) return;
    this.skyCoinT = 1 / FX.balloonCoinsPerSec;
    if (this.rng.next() < 0.25) this.skyLane = Math.max(-1, Math.min(1, this.skyLane + (this.rng.next() < 0.5 ? -1 : 1)));
    field.addCoin(this.skyLane * LANES.width, r.distance + 30, FX.balloonHeight + 0.5);
  }
}
