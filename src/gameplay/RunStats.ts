import type { EventBus } from '../core/EventBus';
import type { GameEvents } from '../core/events';
import type { RunStats } from '../meta/Missions';

/** Counts what happened in one run, for missions and daily challenges. */
export class RunStatsCollector {
  jumps = 0;
  slides = 0;
  wallKicks = 0;
  nearMisses = 0;
  powerUps = 0;
  lootItems = 0;
  bossWins = 0;
  packEscapes = 0;
  grindMeters = 0;

  constructor(bus: EventBus<GameEvents>) {
    bus.on('jump', () => this.jumps++);
    bus.on('slide', () => this.slides++);
    bus.on('wallKick', () => this.wallKicks++);
    bus.on('nearMiss', () => this.nearMisses++);
    bus.on('powerStart', () => this.powerUps++);
    bus.on('loot', () => this.lootItems++);
    bus.on('bossDefeated', () => this.bossWins++);
    bus.on('packRushEnd', (s) => (this.packEscapes += s));
  }

  reset(): void {
    this.jumps = this.slides = this.wallKicks = this.nearMisses = 0;
    this.powerUps = this.lootItems = this.bossWins = this.packEscapes = 0;
    this.grindMeters = 0;
  }

  snapshot(distance: number, coins: number): RunStats {
    return {
      distance: Math.floor(distance),
      coins,
      jumps: this.jumps,
      slides: this.slides,
      wallKicks: this.wallKicks,
      nearMisses: this.nearMisses,
      powerUps: this.powerUps,
      lootItems: this.lootItems,
      bossWins: this.bossWins,
      packEscapes: this.packEscapes,
      grindMeters: Math.floor(this.grindMeters),
      runs: 1,
    };
  }
}
