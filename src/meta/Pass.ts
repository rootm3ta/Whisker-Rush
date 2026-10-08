import { Rng } from '../core/Rng';
import { PASS, passReward } from '../data/economy';
import { grant } from './Rewards';
import type { Profile } from './Save';

export function passTier(stamps: number): number {
  return Math.min(PASS.tiers, Math.floor(stamps / PASS.stampsPerTier));
}

export function canClaimTier(p: Profile, tier: number): boolean {
  return tier >= 1 && tier <= passTier(p.pass.stamps) && !p.pass.claimed.includes(tier);
}

export function claimTier(p: Profile, tier: number, rng: Rng): string[] | null {
  if (!canClaimTier(p, tier)) return null;
  p.pass.claimed.push(tier);
  return grant(p, passReward(tier), rng);
}

/** Paw Stamps earned for a run. */
export function runStamps(distance: number): number {
  return Math.floor(distance / 250) * PASS.stamps.per250m;
}
