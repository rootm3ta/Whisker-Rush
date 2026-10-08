import type { Rng } from '../../core/Rng';
import type { Save } from '../../meta/Save';
import type { RewardedPlacement } from '../../data/monetization';

/** What every meta screen needs from the game. */
export interface MetaCtx {
  save: Save;
  rng: Rng;
  host: HTMLElement;
  now(): number;
  /** Re-read the profile into the top bar, cat look and labels. */
  refresh(): void;
  reward(title: string, lines: readonly string[]): void;
  /** Stat updates from outside a run (selling) feed missions and challenges. */
  addStats(stats: Record<string, number>): void;
  /** Watches a rewarded ad (or grants the reward directly with No Ads). */
  watchAd(placement: RewardedPlacement): Promise<boolean>;
  /** Rewarded views left for a capped placement. */
  adsLeft(placement: RewardedPlacement): number;
  openShop(): void;
  openOdds(): void;
  /** Plays a UI sound (cash register on sales). */
  sound(id: 'register' | 'pop' | 'stamp'): void;
}
