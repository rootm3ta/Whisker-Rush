import { COIN, LOOT } from '../data/pickups';
import { OBSTACLES, type ObstacleDef, type ObstacleId } from '../data/obstacles';
import { SPAWNER, WALL_KICK } from '../data/spawner';
import { HAZARDS } from '../data/hazards';
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
  /** Thrown by the boss: seconds left in the air (no collisions while > 0). */
  flight = 0;
  thrown = false;
  counted = false;
  /** Weaving hazards: lane they are heading for and time to the next change. */
  targetX = 0;
  weaveT = 0;
  /** Dropping hazards: falling now (flight counts down only while dropping). */
  dropping = false;
  /** Warning sound already played. */
  warned = false;
  /** Pattern that placed it (playtest reports). */
  pattern = '';
}

export class Coin {
  active = false;
  x = 0;
  s = 0;
  y = 0;
}

export const PickupKind = { Loot: 0, FishBone: 1, Sock: 2, PowerUp: 3, Mystery: 4, Bell: 5, Letter: 6, Chest: 7 } as const;

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
    for (let i_o = 0; i_o < this.obstacles.length; i_o++) { const o = this.obstacles[i_o]; o.active = false; }
    for (let i_c = 0; i_c < this.coins.length; i_c++) { const c = this.coins[i_c]; c.active = false; }
    for (let i_p = 0; i_p < this.pickups.length; i_p++) { const p = this.pickups[i_p]; p.active = false; }
  }

  addObstacle(id: ObstacleId, x: number, s0: number, len: number, color: number): Obstacle | null {
    for (let i_o = 0; i_o < this.obstacles.length; i_o++) {
      const o = this.obstacles[i_o];
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
      o.flight = 0;
      o.thrown = false;
      o.counted = false;
      o.targetX = x;
      o.weaveT = 0.5;
      o.dropping = false;
      o.warned = false;
      o.pattern = '';
      if (o.def.drops) o.flight = HAZARDS.drop.fallSec;
      return o;
    }
    return null;
  }

  clearAll(s0: number): void {
    for (let i_o = 0; i_o < this.obstacles.length; i_o++) { const o = this.obstacles[i_o]; if (o.active && o.s1 >= s0) o.active = false; }
    for (let i_c = 0; i_c < this.coins.length; i_c++) { const c = this.coins[i_c]; if (c.active && c.s >= s0) c.active = false; }
    for (let i_p = 0; i_p < this.pickups.length; i_p++) { const p = this.pickups[i_p]; if (p.active && p.s >= s0) p.active = false; }
  }

  addCoin(x: number, s: number, y: number): void {
    for (let i_c = 0; i_c < this.coins.length; i_c++) {
      const c = this.coins[i_c];
      if (c.active) continue;
      c.active = true;
      c.x = x;
      c.s = s;
      c.y = y;
      return;
    }
  }

  addPickup(kind: number, item: number, x: number, s: number, y: number): void {
    for (let i_p = 0; i_p < this.pickups.length; i_p++) {
      const p = this.pickups[i_p];
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
    for (let i_o = 0; i_o < this.obstacles.length; i_o++) { const o = this.obstacles[i_o]; if (o.active && o.s1 < cut) o.active = false; }
    for (let i_c = 0; i_c < this.coins.length; i_c++) { const c = this.coins[i_c]; if (c.active && c.s < cut) c.active = false; }
    for (let i_p = 0; i_p < this.pickups.length; i_p++) { const p = this.pickups[i_p]; if (p.active && p.s < cut) p.active = false; }
  }

  /** Removes obstacles overlapping [s0, s1] (revive clears the way). */
  clearObstacles(s0: number, s1: number): void {
    for (let i_o = 0; i_o < this.obstacles.length; i_o++) { const o = this.obstacles[i_o]; if (o.active && o.s1 >= s0 && o.s0 <= s1) o.active = false; }
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
    for (let i_o = 0; i_o < this.obstacles.length; i_o++) {
      const o = this.obstacles[i_o];
      if (!o.active || o.def.top === null || o.flight > 0) continue;
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
    for (let i_o = 0; i_o < this.obstacles.length; i_o++) {
      const o = this.obstacles[i_o];
      if (!o.active || !o.def.kickable || o.def.top === null) continue;
      const dx = Math.abs(x - o.x);
      if (dx < WALL_KICK.minSide || dx > WALL_KICK.reach) continue;
      if (s < o.s0 - WALL_KICK.zMargin || s > o.s1 + WALL_KICK.zMargin) continue;
      if (y < o.def.top + 0.3) return true;
    }
    return false;
  }
}
