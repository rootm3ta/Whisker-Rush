import { Action } from '../core/Input';
import { Rng } from '../core/Rng';
import { BOT_SKILLS, type BotSkill, type BotSkillId } from '../data/autoplay';
import { LANES, RUNNER } from '../data/runner';
import { HITBOX } from '../data/spawner';
import { RushPhase } from './Chase';
import type { Obstacle } from './Field';
import type { RunSession } from './RunSession';
import { HAZARDS } from '../data/hazards';

const G = (8 * RUNNER.jumpHeight) / (RUNNER.jumpSec * RUNNER.jumpSec);

/** Seconds the cat stays at or above height `h` during a standard jump, and when that starts. */
function airWindow(h: number, jumpHeight: number): [number, number] | null {
  const v = Math.sqrt(2 * G * jumpHeight);
  const disc = v * v - 2 * G * h;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  return [(v - s) / G, (v + s) / G];
}

/**
 * A simple autoplay bot for playtests: looks ahead in each lane, then jumps, slides, climbs or
 * changes lanes, with a skill-dependent reaction time, look-ahead and fumble rate. Pure logic:
 * `decide` returns an Action (or -1) for this fixed step; feed it to `RunSession.handleAction`.
 */
export class Autopilot {
  readonly skill: BotSkill;
  private readonly rng: Rng;
  private threat: Obstacle | null = null;
  private seenFor = 0;
  private skip: Obstacle | null = null;
  private cooldown = 0;

  constructor(skill: BotSkillId | BotSkill = 'casual', seed = 7) {
    this.skill = typeof skill === 'string' ? BOT_SKILLS[skill] : skill;
    this.rng = new Rng(seed);
  }

  reset(): void {
    this.threat = null;
    this.seenFor = 0;
    this.skip = null;
    this.cooldown = 0;
  }

  /** Is this obstacle a problem for a cat in lane-x `x` at height `y`? */
  private blocks(o: Obstacle, x: number, y: number): boolean {
    const b = o.def.body;
    if (!b || o.flight > 0 && !o.def.drops) return false;
    const reach = o.def.halfWidth + HITBOX.halfWidth;
    if (Math.abs(o.x - x) >= reach && Math.abs(o.targetX - x) >= reach) return false;
    return y < b[1] && y + HITBOX.height > b[0];
  }

  /** Nearest blocking obstacle ahead in a lane within `horizon` metres. */
  private ahead(run: RunSession, x: number, horizon: number): Obstacle | null {
    const r = run.runner;
    const s = r.distance;
    let best: Obstacle | null = null;
    for (const o of run.field.obstacles) {
      if (!o.active || o.hit) continue;
      if (o.s1 + HITBOX.halfLength < s || o.s0 - s > horizon) continue;
      if (!this.blocks(o, x, r.y)) continue;
      if (!best || o.s0 < best.s0) best = o;
    }
    return best;
  }

  decide(run: RunSession, dt: number): number {
    const r = run.runner;
    if (run.crashed || r.flying) return -1;
    this.cooldown -= dt;
    const v = Math.max(1, r.speed);
    const horizon = v * this.skill.lookSec;
    const laneX = r.lane * LANES.width;

    // Pack Rush: Bolt charges along a lane; get out of it.
    const c = run.chase;
    if (c.rushPhase === RushPhase.Active && Math.abs(c.boltX - laneX) < 1.6 && c.boltAhead > -3 && c.boltAhead < 14 && this.cooldown <= 0) {
      const dir = this.safestSide(run, horizon);
      if (dir !== 0) return this.act(dir < 0 ? Action.Left : Action.Right);
    }

    const t = this.ahead(run, laneX, horizon);
    if (t !== this.threat) {
      this.threat = t;
      this.seenFor = 0;
      if (t && this.rng.next() < this.skill.mistake) this.skip = t;
    }
    if (!t) return -1;
    this.seenFor += dt;
    if (this.seenFor < this.skill.reactionSec || t === this.skip || this.cooldown > 0) return -1;

    const b = t.def.body!;
    // Closing speed: things driving along (scooters, robots) or rolling at you (barrels) change it.
    const own = t.def.rolls ?? (t.def.weaves ? HAZARDS.weave.speed : 0);
    const vc = Math.max(1, v - own);
    const d = t.s0 - r.distance - HITBOX.halfLength;
    const len = t.s1 - t.s0 + 2 * HITBOX.halfLength;
    const jumpH = RUNNER.jumpHeight;

    if (r.grounded) {
      // Slide under overhead things.
      if (b[0] >= HITBOX.slideHeight + 0.05 && len / vc < RUNNER.slideSec - 0.1) {
        if (d < vc * 0.18) return this.act(Action.Down);
        return -1;
      }
      // Jump over (or onto) low things.
      const top = t.def.top;
      const climb = this.skill.climbs && top !== null && top - HITBOX.stepUp <= jumpH - 0.05;
      const w = airWindow(Math.min(b[1], climb ? top! - HITBOX.stepUp : b[1]) + 0.05, jumpH);
      if (w && (climb || len / vc <= w[1] - w[0])) {
        const jumpAt = vc * w[0];
        if (d <= jumpAt + 0.25 && d >= jumpAt - vc * 0.08) return this.act(Action.Up);
        if (d > jumpAt + 0.25) return -1;
      }
    }
    // Otherwise change lanes, toward the side with more room.
    const dir = this.safestSide(run, horizon);
    if (dir !== 0) return this.act(dir < 0 ? Action.Left : Action.Right);
    return -1;
  }

  /** -1 or 1 for the better neighbouring lane, 0 if neither is better than staying. */
  private safestSide(run: RunSession, horizon: number): number {
    const r = run.runner;
    const room = (lane: number) => {
      if (Math.abs(lane) > 1) return -1;
      const o = this.ahead(run, lane * LANES.width, horizon * 1.5);
      return o ? o.s0 - r.distance : horizon * 2;
    };
    const here = room(r.lane);
    const left = room(r.lane - 1);
    const right = room(r.lane + 1);
    if (left <= here && right <= here) return 0;
    return left > right || (left === right && this.rng.next() < 0.5) ? -1 : 1;
  }

  private act(a: number): number {
    this.cooldown = a === Action.Left || a === Action.Right ? RUNNER.laneSwitchSec + 0.05 : 0.15;
    return a;
  }
}
