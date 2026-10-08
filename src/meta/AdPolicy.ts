import { AD_RULES, type RewardedPlacement } from '../data/monetization';
import type { Profile } from './Save';
import { localDay } from './Time';

function rollDay(p: Profile, now: number): void {
  const day = localDay(now);
  if (p.ads.day !== day) p.ads = { ...p.ads, day, counts: {} };
}

/** Rewarded views left today for capped placements (revive and doubleLoot are capped per run/visit elsewhere). */
export function rewardedLeft(p: Profile, placement: RewardedPlacement, now: number): number {
  if (placement === 'secretRefresh') return now - p.ads.secretRefreshAt >= AD_RULES.secretRefreshHours * 3_600_000 ? 1 : 0;
  const cap = AD_RULES.rewardedPerDay[placement];
  if (cap === undefined) return Infinity;
  rollDay(p, now);
  return Math.max(0, cap - (p.ads.counts[placement] ?? 0));
}

export function recordRewarded(p: Profile, placement: RewardedPlacement, now: number): void {
  if (placement === 'secretRefresh') {
    p.ads.secretRefreshAt = now;
    p.ads.secretShift++;
    return;
  }
  rollDay(p, now);
  p.ads.counts[placement] = (p.ads.counts[placement] ?? 0) + 1;
}

/** Post-run interstitial rules (GAME_DESIGN 11.2 + 8.1). Call after recordRunForAds. */
export function canShowInterstitial(p: Profile, now: number, newBest: boolean): boolean {
  const R = AD_RULES.interstitial;
  if (p.iap.noAds || newBest) return false;
  if (p.sessions < R.minSession) return false;
  if (p.ads.runsSinceInterstitial < R.everyRuns) return false;
  return now - p.ads.lastInterstitialAt >= R.minGapSec * 1000;
}

export function recordRunForAds(p: Profile): void {
  p.ads.runsSinceInterstitial++;
}

export function recordInterstitial(p: Profile, now: number): void {
  p.ads.lastInterstitialAt = now;
  p.ads.runsSinceInterstitial = 0;
}

/** Ads may be personalised only for 13+ players who allowed tracking (or where ATT does not apply). */
export function personalizedAds(p: Profile, tracking: 'authorized' | 'denied' | 'notDetermined' | 'restricted' | 'unavailable'): boolean {
  if (p.privacy.under13) return false;
  return tracking === 'authorized' || tracking === 'unavailable';
}
