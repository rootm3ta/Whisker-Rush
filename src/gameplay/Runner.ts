import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { Action } from '../core/Input';
import { LANES, RUNNER, ZONE } from '../data/runner';
import { speedAt } from './SpeedCurve';

const GRAVITY = (8 * RUNNER.jumpHeight) / (RUNNER.jumpSec * RUNNER.jumpSec);
const JUMP_V = (4 * RUNNER.jumpHeight) / RUNNER.jumpSec;
const MAX_LANE = (LANES.count - 1) / 2;

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

/** Cat movement simulation: lanes, jump, slide, fast-drop, distance and speed. No rendering. */
export class Runner {
  lane = 0;
  x = 0;
  prevX = 0;
  y = 0;
  prevY = 0;
  vy = 0;
  grounded = true;
  slideLeft = 0;
  distance = 0;
  prevDistance = 0;
  speed = speedAt(0);
  time = 0;
  zone = 0;

  private laneFromX = 0;
  private laneT = 1;
  private slideOnLand = false;

  constructor(private readonly bus: EventBus<GameEvents>) {}

  get sliding(): boolean {
    return this.slideLeft > 0;
  }

  reset(): void {
    this.lane = 0;
    this.x = this.prevX = 0;
    this.y = this.prevY = 0;
    this.vy = 0;
    this.grounded = true;
    this.slideLeft = 0;
    this.distance = this.prevDistance = 0;
    this.time = 0;
    this.speed = speedAt(0);
    this.zone = 0;
    this.laneT = 1;
    this.slideOnLand = false;
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
        this.lane = next;
        this.laneFromX = this.x;
        this.laneT = 0;
        this.bus.emit('laneChange', dir);
        return true;
      }
      case Action.Up:
        if (!this.grounded) return false;
        this.slideLeft = 0;
        this.grounded = false;
        this.vy = JUMP_V;
        this.bus.emit('jump', JUMP_V);
        return true;
      case Action.Down:
        if (this.grounded) {
          this.startSlide();
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

  private startSlide(): void {
    this.slideLeft = RUNNER.slideSec;
    this.bus.emit('slide', RUNNER.slideSec);
  }

  step(dt: number): void {
    this.prevX = this.x;
    this.prevY = this.y;
    this.prevDistance = this.distance;

    this.time += dt;
    this.speed = speedAt(this.time);
    this.distance += this.speed * dt;

    if (this.laneT < 1) {
      this.laneT = Math.min(1, this.laneT + dt / RUNNER.laneSwitchSec);
      const target = this.lane * LANES.width;
      this.x = this.laneFromX + (target - this.laneFromX) * easeOutCubic(this.laneT);
    }

    if (!this.grounded) {
      // Exact ballistic step so jump height matches data at any dt.
      this.y += this.vy * dt - 0.5 * GRAVITY * dt * dt;
      this.vy -= GRAVITY * dt;
      if (this.y <= 0) {
        const impact = -this.vy;
        this.y = 0;
        this.vy = 0;
        this.grounded = true;
        this.bus.emit('land', impact);
        if (this.slideOnLand) {
          this.slideOnLand = false;
          this.startSlide();
        }
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
