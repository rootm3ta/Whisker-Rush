import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { LANES } from '../data/runner';
import { LOOT_MAPLE_LANE } from '../data/pickups';
import { POWERUP_IDS } from '../data/powerups';
import { TUTORIAL, type Hint, type TutorialStepId } from '../data/tutorial';
import { HITBOX } from '../data/spawner';
import { RushPhase } from './Chase';
import { PickupKind, type Obstacle } from './Field';
import type { RunSession } from './RunSession';

const MAGNET = POWERUP_IDS.indexOf('magnet');
const TOY_MOUSE = LOOT_MAPLE_LANE.findIndex((i) => i.id === 'toyMouse');

/**
 * Scripted tutorial run (GAME_DESIGN 8.2). Each step places its setup ahead of the cat,
 * then freezes time right before the obstacle until the right move is made: no failing.
 */
export class Tutorial {
  active = false;
  /** True while the world waits for the right input. */
  frozen = false;
  hint: Hint | 'left' | 'right' = 'none';
  text = '';
  finished = false;
  private step = 0;
  private placed = false;
  private target: Obstacle | null = null;
  private targetLane = 0;
  private targetS = 0;
  private kicked = false;
  private got = false;
  private showLeft = 0;
  private nextAt = 0;

  constructor(
    bus: EventBus<GameEvents>,
    private readonly run: RunSession,
  ) {
    bus.on('wallKick', () => (this.kicked = true));
    bus.on('powerStart', (i) => {
      if (i === MAGNET) this.got = true;
    });
    bus.on('loot', () => (this.got = true));
    bus.on('packRushEnd', () => (this.got = true));
  }

  get stepId(): TutorialStepId | null {
    return this.active && !this.finished ? TUTORIAL.steps[this.step].id : null;
  }

  start(): void {
    this.active = true;
    this.finished = false;
    this.step = 0;
    this.placed = false;
    this.frozen = false;
    this.nextAt = this.run.runner.distance + 4;
    this.run.spawner.paused = true;
    this.run.chase.suppressRushes();
    this.run.collision.addGrace(1e9);
  }

  stop(): void {
    this.active = false;
    this.frozen = false;
    this.hint = 'none';
    this.text = '';
  }

  /** Call after each simulation step. */
  update(dt: number): void {
    if (!this.active || this.finished) return;
    const r = this.run.runner;
    const s = TUTORIAL.steps[this.step];
    if (!this.placed) {
      if (r.distance < this.nextAt) {
        this.text = '';
        this.hint = 'none';
        return;
      }
      this.place(s.id);
      this.placed = true;
      this.text = s.text;
      this.hint = 'none';
    }
    this.frozen = false;
    const done = this.check(s.id, dt);
    if (done) {
      this.step++;
      this.placed = false;
      this.frozen = false;
      this.hint = 'none';
      this.nextAt = r.distance + TUTORIAL.breatherM;
      if (this.step >= TUTORIAL.steps.length) {
        this.finished = true;
        this.text = '';
      }
    }
  }

  private place(id: TutorialStepId): void {
    const run = this.run;
    const r = run.runner;
    const f = run.field;
    const lane = r.lane;
    const x = lane * LANES.width;
    const s0 = r.distance + TUTORIAL.spawnAhead;
    const side = lane < 1 ? lane + 1 : lane - 1;
    this.kicked = false;
    this.got = false;
    this.showLeft = 0;
    this.targetLane = lane;
    this.targetS = s0;
    switch (id) {
      case 'lane':
        this.target = f.addObstacle('trashCans', x, s0, 1, 0);
        break;
      case 'jump':
        this.target = f.addObstacle('hedge', x, s0, 1.2, 0);
        break;
      case 'slide':
        this.target = f.addObstacle('lowBranch', x, s0, 0.6, 0);
        break;
      case 'wallKick':
        this.target = f.addObstacle('hedgeWall', side * LANES.width, s0, 10, 0);
        for (let i = 0; i < 4; i++) f.addCoin(x, s0 + 3 + i * 1.6, 2.6 + Math.sin(i) * 0.3);
        break;
      case 'magnet':
        this.target = null;
        f.addPickup(PickupKind.PowerUp, MAGNET, x, s0, 0.9);
        for (let i = 0; i < 8; i++) for (const l of [-1, 0, 1]) f.addCoin(l * LANES.width, s0 + 6 + i * 2.5, 0.6);
        break;
      case 'loot':
        this.target = null;
        this.targetLane = side;
        f.addPickup(PickupKind.Loot, TOY_MOUSE, side * LANES.width, s0, 0.75);
        break;
      case 'rush':
        this.target = null;
        run.chase.closeLeft = TUTORIAL.rushSec + 3;
        run.chase.startRush(TUTORIAL.rushSec, r.lane);
        break;
    }
  }

  /** Returns true when the step is complete; sets `frozen` and `hint` while waiting. */
  private check(id: TutorialStepId, dt: number): boolean {
    const run = this.run;
    const r = run.runner;
    const o = this.target;
    const front = o ? o.s0 - (r.distance + HITBOX.halfLength) : this.targetS - r.distance;
    const F = TUTORIAL.freezeAt;
    switch (id) {
      case 'lane':
        if (front < F.lane && r.lane === this.targetLane) this.wait('left-right');
        return !!o && r.distance > o.s1 + 1;
      case 'jump':
        if (front < F.jump && front > -0.5 && r.grounded) this.wait('up');
        return !!o && r.distance > o.s1 + 1;
      case 'slide':
        if (front < F.slide && front > -0.5 && !r.sliding) this.wait('down');
        return !!o && r.distance > o.s1 + 1;
      case 'wallKick': {
        if (this.kicked) return r.grounded;
        if (!o) return true;
        const beside = r.distance > o.s0 + 1 && r.distance < o.s1 - 1;
        if (beside && r.grounded) this.wait('up');
        else if (beside && !r.grounded && r.vy < 1.5 && run.field.canWallKick(r.x, r.distance, r.y)) this.wait('up');
        if (r.distance > o.s1 - 0.5) {
          // Missed it: put a fresh wall ahead and try again.
          this.placed = false;
          this.nextAt = r.distance + 4;
        }
        return false;
      }
      case 'magnet':
        if (!this.got && front < F.toward && r.lane !== this.targetLane) this.wait(this.targetLane < r.lane ? 'left' : 'right');
        if (this.got) {
          this.showLeft += dt;
          return this.showLeft > TUTORIAL.magnetShowSec;
        }
        if (front < -2) this.respawnPickup();
        return false;
      case 'loot':
        if (!this.got && front < F.toward && r.lane !== this.targetLane) this.wait(this.targetLane < r.lane ? 'left' : 'right');
        if (!this.got && front < -2) this.respawnPickup();
        return this.got;
      case 'rush': {
        const c = run.chase;
        if (c.rushPhase === RushPhase.Active && c.boltAhead < F.rush && c.boltAhead > -0.5 && Math.abs(r.x - c.boltX) < 1.2 && r.grounded) this.wait('left-right');
        return this.got;
      }
    }
  }

  private respawnPickup(): void {
    this.placed = false;
    this.nextAt = this.run.runner.distance + 2;
  }

  private wait(h: Tutorial['hint']): void {
    this.frozen = true;
    this.hint = h;
  }
}
