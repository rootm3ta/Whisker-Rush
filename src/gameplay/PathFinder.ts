import { LANES } from '../data/runner';
import { RUNNER } from '../data/runner';
import type { Field } from './Field';

const DANGER = 100;

/**
 * Picks the safest lane over the next `lookahead` metres: lanes with a blocking body
 * that cannot be jumped onto score badly (closer = worse); coins break ties.
 */
export function bestLane(field: Field, distance: number, currentLane: number, lookahead: number): number {
  let best = currentLane;
  let bestScore = -Infinity;
  for (let lane = -1; lane <= 1; lane++) {
    const x = lane * LANES.width;
    let score = 0;
    for (let i_o = 0; i_o < field.obstacles.length; i_o++) {
      const o = field.obstacles[i_o];
      if (!o.active || !o.def.body || o.hit) continue;
      if (o.s1 < distance || o.s0 > distance + lookahead) continue;
      if (Math.abs(o.x - x) > o.def.halfWidth) continue;
      const tall = o.def.body[1] > RUNNER.jumpHeight * 0.6 && o.def.body[0] < 0.5;
      const near = 1 - (o.s0 - distance) / lookahead;
      score -= (tall ? DANGER : DANGER * 0.3) * (0.5 + near);
    }
    for (let i_c = 0; i_c < field.coins.length; i_c++) {
      const c = field.coins[i_c];
      if (c.active && c.s > distance && c.s < distance + lookahead && Math.abs(c.x - x) < 0.5) score += 1;
    }
    if (lane === currentLane) score += 0.5;
    if (score > bestScore) {
      bestScore = score;
      best = lane;
    }
  }
  return best;
}
