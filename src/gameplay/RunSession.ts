import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { Action } from '../core/Input';
import { REVIVE } from '../data/chase';
import { SPAWNER } from '../data/spawner';
import { Satchel } from '../meta/Satchel';
import { Chase } from './Chase';
import { Collision } from './Collision';
import { Field } from './Field';
import { ReviveTracker, type ReviveOption } from './Revive';
import { Runner } from './Runner';
import { Score } from './Score';
import { ScoreKeeper } from './ScoreKeeper';
import { Spawner } from './Spawner';

/** One run's simulation: runner, spawned field, collisions, chase and scoring. No rendering. */
export class RunSession {
  readonly field = new Field();
  readonly runner: Runner;
  readonly spawner = new Spawner(this.field);
  readonly satchel = new Satchel();
  readonly score = new Score();
  readonly collision: Collision;
  readonly keeper: ScoreKeeper;
  readonly chase: Chase;
  readonly revives = new ReviveTracker();
  /** True when the last crash was a catch (second stumble), false for a head-on crash. */
  caught = false;
  private bankedCoins = 0;
  private bankedBones = 0;

  constructor(private readonly bus: EventBus<GameEvents>) {
    this.runner = new Runner(bus, this.field);
    this.collision = new Collision(bus, this.field, this.satchel);
    this.keeper = new ScoreKeeper(bus, this.score);
    this.chase = new Chase(bus, () => this.collision.externalStumble(this.runner));
    bus.on('nearMiss', () => this.keeper.nearMiss());
    bus.on('crash', (c) => (this.caught = c === 1));
  }

  get crashed(): boolean {
    return this.collision.crashed;
  }

  reset(seed?: number): void {
    this.runner.reset();
    this.field.reset();
    this.spawner.reset(seed);
    this.satchel.clear();
    this.score.reset();
    this.collision.reset();
    this.keeper.reset();
    this.chase.reset();
    this.revives.reset();
    this.caught = false;
    this.bankedCoins = 0;
    this.bankedBones = 0;
    this.spawner.update(0, this.runner.speed);
  }

  /** Currency earned since the last bank call (so revives can spend Fish Bones found this run). */
  takeUnbanked(): { coins: number; fishBones: number } {
    const coins = this.score.coins - this.bankedCoins;
    const fishBones = this.score.fishBones - this.bankedBones;
    this.bankedCoins = this.score.coins;
    this.bankedBones = this.score.fishBones;
    return { coins, fishBones };
  }

  nextRevive(): ReviveOption {
    return this.revives.next();
  }

  /** Clears the way, grants invulnerability and sends the pack back. */
  revive(kind: ReviveOption['kind']): void {
    this.revives.use(kind);
    const r = this.runner;
    r.revive();
    this.field.clearObstacles(r.distance - 2, r.distance + REVIVE.clearAheadM);
    this.collision.revive(REVIVE.invulnSec);
    this.chase.backOff(r.time);
    this.caught = false;
    this.bus.emit('revive', this.revives.total);
  }

  /** Buffer handler for movement actions during a run. */
  readonly handleAction = (a: number): boolean => {
    const moving = a === Action.Left || a === Action.Right || a === Action.Up || a === Action.Down;
    if (!moving) return true;
    // Threat is measured at the pre-swipe pose; it arms only if the swipe applied.
    const threat = this.collision.findThreat(this.runner);
    const consumed = this.runner.tryAction(a);
    if (consumed && threat) threat.armed = true;
    return consumed;
  };

  step(dt: number): void {
    if (this.collision.crashed) return;
    const r = this.runner;
    this.spawner.update(r.distance, r.speed);
    r.step(dt);
    this.collision.step(r, dt);
    if (!this.collision.crashed) this.chase.step(dt, r);
    this.keeper.update(dt, r.distance - r.prevDistance);
    this.field.despawn(r.distance, SPAWNER.behindM);
  }
}
