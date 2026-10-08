import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import { PARTICLES as P } from '../data/fx';
import { Particles } from './Particles';

const S = P.shapes;

/** What the effects need each frame. */
export interface JuiceDrive {
  x: number;
  y: number;
  dist: number;
  speed: number;
  catnip: boolean;
  fast: boolean;
  running: boolean;
}

/** Event-driven particle effects for the run: dust, sparkles, leaves, catnip, speed lines, confetti, crash. */
export class JuiceFx {
  readonly particles = new Particles();
  private x = 0;
  private y = 0;
  private dist = 0;
  private leafT = 0;
  private catnipT = 0;
  private lineT = 0;

  constructor(bus: EventBus<GameEvents>) {
    const p = this.particles;
    bus.on('land', (impact) => {
      if (impact < 3) return;
      const spec = { ...P.dust, count: impact > 15 ? P.dust.count * 2 : P.dust.count };
      p.burst(spec, this.x, this.y + 0.05, this.dist, S.soft, true);
    });
    bus.on('coin', () => p.burst(P.coin, this.x, this.y + 0.8, this.dist + 0.6, S.star, true));
    bus.on('loot', () => p.burst(P.loot, this.x, this.y + 0.9, this.dist + 0.6, S.star, true));
    bus.on('smash', () => p.burst(P.smash, this.x, this.y + 0.5, this.dist + 1.2, S.square, true));
    bus.on('crash', () => p.burst(P.crash, this.x, this.y + 0.6, 0.3, S.soft, false));
    bus.on('stumble', () => p.burst(P.dust, this.x, this.y + 0.1, this.dist, S.soft, true));
    const confetti = () => this.confetti();
    for (const e of ['stunt', 'bossDefeated', 'huntComplete', 'allBells', 'chest'] as const) bus.on(e, confetti);
  }

  confetti(): void {
    this.particles.burst(P.confetti, this.x, this.y + 2.2, -1.5, S.square, false);
  }

  update(dt: number, d: JuiceDrive): void {
    this.x = d.x;
    this.y = d.y;
    this.dist = d.dist;
    const p = this.particles;
    const r = p.rand;
    if (d.running && dt > 0) {
      // Ambient falling leaves along the street.
      this.leafT -= dt;
      while (this.leafT <= 0) {
        this.leafT += 1 / P.leaves.perSec;
        const side = r.next() < 0.5 ? -1 : 1;
        p.spawn(side * r.range(P.leaves.x[0], P.leaves.x[1]), r.range(3, 5), d.dist + r.range(P.leaves.ahead[0], P.leaves.ahead[1]), -side * 0.4, -P.leaves.fall, 0, r.range(P.leaves.life[0], P.leaves.life[1]), r.range(P.leaves.size[0], P.leaves.size[1]), 0, S.leaf, r.pick(P.leaves.colors), true);
      }
      if (d.catnip) {
        this.catnipT -= dt;
        while (this.catnipT <= 0) {
          this.catnipT += 1 / P.catnip.perSec;
          const a = r.range(0, Math.PI * 2);
          const rad = P.catnip.radius;
          p.spawn(d.x + Math.cos(a) * rad, d.y + r.range(0.1, 1.4), Math.sin(a) * rad, -Math.sin(a) * 3, r.range(0.5, 1.5), Math.cos(a) * 3, r.range(P.catnip.life[0], P.catnip.life[1]), r.range(P.catnip.size[0], P.catnip.size[1]), 0, S.star, r.pick(P.catnip.colors), false);
        }
      }
      if (d.fast || d.speed > P.speedLines.minSpeed) {
        this.lineT -= dt;
        while (this.lineT <= 0) {
          this.lineT += 1 / P.speedLines.perSec;
          const side = r.next() < 0.5 ? -1 : 1;
          p.spawn(d.x + side * r.range(2.2, 5), r.range(0.3, 4), r.range(P.speedLines.z[0], P.speedLines.z[1]), 0, 0, d.speed * 2.2, r.range(P.speedLines.life[0], P.speedLines.life[1]), r.range(P.speedLines.size[0], P.speedLines.size[1]), 0, S.streak, 0xffffff, false);
        }
      }
    }
    p.update(dt, d.dist);
  }
}
