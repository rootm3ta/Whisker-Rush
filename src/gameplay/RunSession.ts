import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { Action } from '../core/Input';
import { SPAWNER } from '../data/spawner';
import { Satchel } from '../meta/Satchel';
import { Collision } from './Collision';
import { Field } from './Field';
import { Runner } from './Runner';
import { Score } from './Score';
import { ScoreKeeper } from './ScoreKeeper';
import { Spawner } from './Spawner';

/** One run's simulation: runner, spawned field, collisions and scoring. No rendering. */
export class RunSession {
  readonly field = new Field();
  readonly runner: Runner;
  readonly spawner = new Spawner(this.field);
  readonly satchel = new Satchel();
  readonly score = new Score();
  readonly collision: Collision;
  readonly keeper: ScoreKeeper;

  constructor(bus: EventBus<GameEvents>) {
    this.runner = new Runner(bus, this.field);
    this.collision = new Collision(bus, this.field, this.satchel);
    this.keeper = new ScoreKeeper(bus, this.score);
    bus.on('nearMiss', () => this.keeper.nearMiss());
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
    this.spawner.update(0, this.runner.speed);
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
    this.keeper.update(dt, r.distance - r.prevDistance);
    this.field.despawn(r.distance, SPAWNER.behindM);
  }
}
