import { COIN, LOOT } from '../data/pickups';
import { OBSTACLES, type ObstacleDef, type ObstacleId } from '../data/obstacles';
import { SPAWNER, WALL_KICK } from '../data/spawner';
import type { RunnerWorld } from './Runner';

export class Obstacle {
  active = false;
  id: ObstacleId = 'trashCans';
  def: ObstacleDef = OBSTACLES.trashCans;
  x = 0;
  s0 = 0;
  s1 = 0;
  hit = false;
  armed = false;
  color = 0;
}

export class Coin {
  active = false;
  x = 0;
  s = 0;
  y = 0;
}

export const PickupKind = { Loot: 0, FishBone: 1, Sock: 2 } as const;

export class Pickup {
  active = false;
  kind = 0;
  item = 0;
  x = 0;
  s = 0;
  y = 0;
  blocked = false;
}

function pool<T>(n: number, make: () => T): T[] {
  const a: T[] = [];
  for (let i = 0; i < n; i++) a.push(make());
  return a;
}

/** Everything spawned on the track, in track-distance coordinates. Pooled and allocation-free. */
export class Field implements RunnerWorld {
  readonly obstacles = pool(SPAWNER.capacity.obstacles, () => new Obstacle());
  readonly coins = pool(COIN.capacity, () => new Coin());
  readonly pickups = pool(LOOT.capacity, () => new Pickup());
  lastGrind = false;

  reset(): void {
    for (const o of this.obstacles) o.active = false;
    for (const c of this.coins) c.active = false;
    for (const p of this.pickups) p.active = false;
  }

  addObstacle(id: ObstacleId, x: number, s0: number, len: number, color: number): Obstacle | null {
    for (const o of this.obstacles) {
      if (o.active) continue;
      o.active = true;
      o.id = id;
      o.def = OBSTACLES[id];
      o.x = x;
      o.s0 = s0;
      o.s1 = s0 + len;
      o.hit = false;
      o.armed = false;
      o.color = color;
      return o;
    }
    return null;
  }

  addCoin(x: number, s: number, y: number): void {
    for (const c of this.coins) {
      if (c.active) continue;
      c.active = true;
      c.x = x;
      c.s = s;
      c.y = y;
      return;
    }
  }

  addPickup(kind: number, item: number, x: number, s: number, y: number): void {
    for (const p of this.pickups) {
      if (p.active) continue;
      p.active = true;
      p.kind = kind;
      p.item = item;
      p.x = x;
      p.s = s;
      p.y = y;
      p.blocked = false;
      return;
    }
  }

  /** Free everything that is safely behind the cat. */
  despawn(distance: number, behind: number): void {
    const cut = distance - behind;
    for (const o of this.obstacles) if (o.active && o.s1 < cut) o.active = false;
    for (const c of this.coins) if (c.active && c.s < cut) c.active = false;
    for (const p of this.pickups) if (p.active && p.s < cut) p.active = false;
  }

  surfaceTop(o: Obstacle, s: number): number {
    const top = o.def.top ?? 0;
    if (!o.def.ramp) return top;
    const t = (s - o.s0) / (o.s1 - o.s0);
    return top * Math.min(1, Math.max(0, t));
  }

  supportAt(x: number, s: number, y: number, tol: number, ignoreGrind: boolean): number {
    let best = 0;
    let grind = false;
    for (const o of this.obstacles) {
      if (!o.active || o.def.top === null) continue;
      if (Math.abs(x - o.x) > o.def.halfWidth || s < o.s0 || s > o.s1) continue;
      if (ignoreGrind && o.def.grind) continue;
      const top = this.surfaceTop(o, s);
      if (top <= y + tol && top > best) {
        best = top;
        grind = o.def.grind;
      }
    }
    this.lastGrind = grind;
    return best;
  }

  canWallKick(x: number, s: number, y: number): boolean {
    for (const o of this.obstacles) {
      if (!o.active || !o.def.kickable || o.def.top === null) continue;
      const dx = Math.abs(x - o.x);
      if (dx < WALL_KICK.minSide || dx > WALL_KICK.reach) continue;
      if (s < o.s0 - WALL_KICK.zMargin || s > o.s1 + WALL_KICK.zMargin) continue;
      if (y < o.def.top + 0.3) return true;
    }
    return false;
  }
}
