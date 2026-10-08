import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { Action } from '../core/Input';
import { LANES, RUNNER, ZONE } from '../data/runner';
import { HITBOX, WALL_KICK } from '../data/spawner';
import { speedAt } from './SpeedCurve';

const MAX_LANE = (LANES.count - 1) / 2;
const DROP_THROUGH_SEC = 0.25;

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

/** Walkable surfaces and wall-kick queries the runner needs from the world. */
export interface RunnerWorld {
  /** Highest walkable surface at (x, s) whose height is <= y + tol (0 = road). Sets `lastGrind`. */
  supportAt(x: number, s: number, y: number, tol: number, ignoreGrind: boolean): number;
  readonly lastGrind: boolean;
  canWallKick(x: number, s: number, y: number): boolean;
}

/** Cat movement simulation: lanes, jump, slide, fast-drop, wall-kick, grind, distance and speed. */
export class Runner {
  lane = 0;
  x = 0;
  prevX = 0;
  y = 0;
  prevY = 0;
  vy = 0;
  grounded = true;
  grinding = false;
  slideLeft = 0;
  distance = 0;
  prevDistance = 0;
  speed = speedAt(0);
  time = 0;
  zone = 0;
  /** Speed multiplier from power-ups (set each step by the session). */
  speedMul = 1;
  /** When set, the cat floats at this height (Balloon Ride, Fish Rocket). */
  flyHeight: number | null = null;
  /** Remaining Pounce dash distance (m) and its speed (m/s). */
  dashLeft = 0;
  dashSpeed = 0;

  private gravity = 0;
  private jumpV = 0;
  private kickV = 0;
  private laneSwitchSec: number = RUNNER.laneSwitchSec;
  private coyoteSec = 0;
  private maxKicks: number = WALL_KICK.maxChain;
  /** Seconds since the cat walked off a ledge without jumping (coyote time). */
  private offLedge = Infinity;
  private prevLane = 0;
  private laneFromX = 0;
  private laneT = 1;
  private slideOnLand = false;
  private kicks = 0;
  private grindTime = 0;
  private dropThrough = 0;

  constructor(
    private readonly bus: EventBus<GameEvents>,
    private readonly world: RunnerWorld | null = null,
  ) {
    this.configure(RUNNER.laneSwitchSec, RUNNER.jumpHeight, 0, WALL_KICK.maxChain);
  }

  /** Applies upgrades: lane switch time, jump height, coyote time and wall-kick chain. */
  configure(laneSwitchSec: number, jumpHeight: number, coyoteSec: number, maxKicks: number): void {
    this.laneSwitchSec = laneSwitchSec;
    this.gravity = (8 * RUNNER.jumpHeight) / (RUNNER.jumpSec * RUNNER.jumpSec);
    this.jumpV = Math.sqrt(2 * this.gravity * jumpHeight);
    this.kickV = Math.sqrt(2 * this.gravity * WALL_KICK.height);
    this.coyoteSec = coyoteSec;
    this.maxKicks = maxKicks;
  }

  get sliding(): boolean {
    return this.slideLeft > 0;
  }

  get height(): number {
    return this.sliding ? HITBOX.slideHeight : HITBOX.height;
  }

  reset(): void {
    this.lane = this.prevLane = 0;
    this.x = this.prevX = 0;
    this.y = this.prevY = 0;
    this.vy = 0;
    this.grounded = true;
    this.grinding = false;
    this.slideLeft = 0;
    this.distance = this.prevDistance = 0;
    this.time = 0;
    this.speed = speedAt(0);
    this.zone = 0;
    this.laneT = 1;
    this.slideOnLand = false;
    this.kicks = 0;
    this.dropThrough = 0;
    this.speedMul = 1;
    this.flyHeight = null;
    this.dashLeft = 0;
  }

  get flying(): boolean {
    return this.flyHeight !== null;
  }

  /** Buffer handler: returns true when the action was consumed. */
  readonly tryAction = (a: number): boolean => {
    switch (a) {
      case Action.Left:
      case Action.Right: {
        const dir = a === Action.Left ? -1 : 1;
        const next = this.lane + dir;
        if (Math.abs(next) > MAX_LANE) {
          this.bus.emit('laneBlocked', dir);
          return true;
        }
        this.prevLane = this.lane;
        this.moveToLane(next);
        this.bus.emit('laneChange', dir);
        return true;
      }
      case Action.Up:
        if (this.flyHeight !== null) return true;
        if (this.grounded || this.offLedge <= this.coyoteSec) {
          this.slideLeft = 0;
          this.setGrinding(false);
          this.grounded = false;
          this.offLedge = Infinity;
          this.vy = this.jumpV;
          this.bus.emit('jump', this.jumpV);
          return true;
        }
        if (this.kicks < this.maxKicks && this.world?.canWallKick(this.x, this.distance, this.y)) {
          this.kicks++;
          this.vy = Math.max(this.vy, this.kickV);
          this.slideOnLand = false;
          this.bus.emit('wallKick', this.kicks);
          return true;
        }
        return false;
      case Action.Down:
        if (this.flyHeight !== null) return true;
        if (this.grinding) {
          this.dropThrough = DROP_THROUGH_SEC;
          this.leaveGround();
          this.vy = -RUNNER.fastDropSpeed * 0.3;
        } else if (this.grounded) {
          this.slideLeft = RUNNER.slideSec;
          this.bus.emit('slide', RUNNER.slideSec);
        } else {
          this.vy = Math.min(this.vy, -RUNNER.fastDropSpeed);
          this.slideOnLand = true;
          this.bus.emit('fastDrop', this.vy);
        }
        return true;
      default:
        return true;
    }
  };

  /** Back on the road after a revive: grounded, centered in the current lane. */
  revive(): void {
    this.setGrinding(false);
    this.x = this.prevX = this.lane * LANES.width;
    this.y = this.prevY = 0;
    this.vy = 0;
    this.grounded = true;
    this.slideLeft = 0;
    this.slideOnLand = false;
    this.laneT = 1;
    this.kicks = 0;
    this.prevDistance = this.distance;
  }

  /** Glide to a lane (auto-dodge). */
  setLane(lane: number): void {
    if (lane === this.lane) return;
    this.prevLane = this.lane;
    this.moveToLane(lane);
  }

  /** Side bump: return to the lane we came from. */
  bounceBack(): void {
    const back = this.prevLane;
    this.prevLane = this.lane;
    this.moveToLane(back);
  }

  /** Snap onto a surface (forgiving ledge catch from the collision system). */
  landOn(height: number): void {
    if (this.grounded && Math.abs(this.y - height) < 1e-3) return;
    this.land(height, false);
  }

  private moveToLane(lane: number): void {
    this.lane = lane;
    this.laneFromX = this.x;
    this.laneT = 0;
  }

  private leaveGround(): void {
    this.grounded = false;
    this.setGrinding(false);
  }

  private land(height: number, grind: boolean): void {
    const impact = Math.max(0, -this.vy);
    this.y = height;
    this.vy = 0;
    this.grounded = true;
    this.kicks = 0;
    this.offLedge = Infinity;
    this.setGrinding(grind);
    this.bus.emit('land', impact);
    if (this.slideOnLand) {
      this.slideOnLand = false;
      this.slideLeft = RUNNER.slideSec;
      this.bus.emit('slide', RUNNER.slideSec);
    }
  }

  private setGrinding(v: boolean): void {
    if (v === this.grinding) return;
    this.grinding = v;
    if (v) {
      this.grindTime = 0;
      this.slideLeft = 0;
      this.bus.emit('grindStart', 0);
    } else {
      this.bus.emit('grindEnd', this.grindTime);
    }
  }

  step(dt: number): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevDistance = this.distance;

    this.time += dt;
    this.speed = speedAt(this.time) * this.speedMul;
    this.distance += this.speed * dt;
    if (this.dashLeft > 0) {
      const d = Math.min(this.dashLeft, this.dashSpeed * dt);
      this.distance += d;
      this.dashLeft -= d;
    }
    if (this.dropThrough > 0) this.dropThrough -= dt;
    if (this.grinding) this.grindTime += dt;

    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / this.laneSwitchSec);
      const target = this.lane * LANES.width;
      this.x = this.laneFromX + (target - this.laneFromX) * easeOutCubic(this.laneT);
    }

    const w = this.world;
    const ignoreGrind = this.dropThrough > 0;
    if (this.flyHeight !== null) {
      if (this.grounded) this.leaveGround();
      this.slideLeft = 0;
      const k = 1 - Math.exp(-4 * dt);
      const ny = this.y + (this.flyHeight - this.y) * k;
      this.vy = (ny - this.y) / dt;
      this.y = ny;
    } else if (this.grounded) {
      const sup = w ? w.supportAt(this.x, this.distance, this.y, HITBOX.stepUp, ignoreGrind) : 0;
      if (sup < this.y - 0.02) {
        this.leaveGround();
        this.vy = 0;
        this.offLedge = 0;
      } else {
        this.y = sup;
        this.setGrinding(w ? w.lastGrind : false);
      }
    }

    if (!this.grounded && this.flyHeight === null) {
      const yPrev = this.y;
      // Exact ballistic step so jump height matches data at any dt.
      this.offLedge += dt;
      this.y += this.vy * dt - 0.5 * this.gravity * dt * dt;
      this.vy -= this.gravity * dt;
      if (this.vy <= 0) {
        const sup = w ? w.supportAt(this.x, this.distance, yPrev, 0, ignoreGrind) : 0;
        if (this.y <= sup) this.land(sup, w ? w.lastGrind : false);
      }
    }

    if (this.slideLeft > 0) this.slideLeft = Math.max(0, this.slideLeft - dt);

    const zone = Math.floor(this.distance / ZONE.lengthM);
    if (zone !== this.zone) {
      this.zone = zone;
      this.bus.emit('zoneChange', zone);
    }
  }
}
