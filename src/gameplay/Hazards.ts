import { HAZARDS as H } from '../data/hazards';
import { LANES } from '../data/runner';
import { Rng } from '../core/Rng';
import type { Field } from './Field';
import type { Runner } from './Runner';

/** City hazards with behaviour: weaving scooters and laundry that drops into the lane. */
export class Hazards {
  private readonly rng = new Rng(77);

  step(dt: number, r: Runner, field: Field): void {
    const obs = field.obstacles;
    for (let i = 0; i < obs.length; i++) {
      const o = obs[i];
      if (!o.active) continue;
      if (o.def.weaves) {
        const move = H.weave.speed * dt;
        o.s0 += move;
        o.s1 += move;
        o.weaveT -= dt;
        if (o.weaveT <= 0) {
          o.weaveT = this.rng.range(H.weave.every[0], H.weave.every[1]);
          if (o.s0 - r.distance > H.weave.minAhead) {
            const lane = Math.round(o.targetX / LANES.width);
            const next = lane === -1 ? 0 : lane === 1 ? 0 : this.rng.next() < 0.5 ? -1 : 1;
            o.targetX = next * LANES.width;
          }
        }
        o.x += (o.targetX - o.x) * (1 - Math.exp(-H.weave.laneRate * dt));
      } else if (o.def.drops && o.flight > 0) {
        if (!o.dropping && o.s0 - r.distance < r.speed * H.drop.triggerSec) o.dropping = true;
        if (o.dropping) o.flight = Math.max(0, o.flight - dt);
      }
    }
  }
}
