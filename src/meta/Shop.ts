import { Rng } from '../core/Rng';
import { PASS } from '../data/economy';
import { BUNDLES, PRODUCTS, STARTER_HOURS, TIP_JAR, passPremiumReward, type ProductId } from '../data/monetization';
import { canClaimTier, passTier } from './Pass';
import { grant } from './Rewards';
import type { Profile } from './Save';

/** Which rotating cat bundle is on sale this week. */
export function currentBundle(now: number): ProductId {
  return BUNDLES[Math.floor(now / (7 * 86_400_000)) % BUNDLES.length];
}

export function starterAvailable(p: Profile, now: number): boolean {
  return !p.iap.owned.includes('starter') && now - p.firstSeen < STARTER_HOURS * 3_600_000;
}

/** Products currently on the shelf. */
export function shelf(p: Profile, now: number): ProductId[] {
  const out: ProductId[] = [];
  if (starterAvailable(p, now)) out.push('starter');
  if (!p.iap.noAds) out.push('noAds');
  out.push('fishS', 'fishM', 'fishL', 'fishXL');
  if (!p.pass.premium) out.push('passPremium', 'passPlus');
  out.push('tipJar');
  const b = currentBundle(now);
  if (!p.iap.owned.includes(b)) out.push(b);
  if (!p.iap.coinDoubler) out.push('coinDoubler');
  return out;
}

/** Applies a completed purchase to the profile; returns lines for the receipt popup. */
export function grantProduct(p: Profile, id: ProductId, rng: Rng): string[] {
  const def = PRODUCTS[id];
  const g = def.grant;
  const out: string[] = [];
  if (!def.consumable && !p.iap.owned.includes(id)) p.iap.owned.push(id);
  if (g.noAds) {
    p.iap.noAds = true;
    out.push('No more interstitials. Rewarded ads are now free rewards.');
  }
  if (g.coinDoubler) {
    p.iap.coinDoubler = true;
    out.push('Coins x2 in every run');
  }
  if (g.passPremium) {
    p.pass.premium = true;
    out.push('Paw Pass Premium track unlocked');
  }
  if (g.passTiers) {
    p.pass.stamps = Math.min(PASS.tiers * PASS.stampsPerTier, p.pass.stamps + g.passTiers * PASS.stampsPerTier);
    out.push(`+${g.passTiers} Paw Pass tiers`);
  }
  if (g.tipJar) {
    out.push(...grant(p, { fishBones: p.tipJar }, rng));
    p.tipJar = 0;
  }
  out.push(...grant(p, { coins: g.coins, fishBones: g.fishBones, roomba: g.roomba, cat: g.cat }, rng));
  for (const a of g.accessories ?? []) out.push(...grant(p, { accessory: a }, rng));
  return out;
}

/** Re-applies non-consumables the store says the player owns (restore purchases). */
export function restoreOwned(p: Profile, skus: readonly string[], rng: Rng): string[] {
  const out: string[] = [];
  for (const id of Object.keys(PRODUCTS) as ProductId[]) {
    const def = PRODUCTS[id];
    if (def.consumable || !skus.includes(def.sku) || p.iap.owned.includes(id)) continue;
    out.push(...grantProduct(p, id, rng));
  }
  return out;
}

/** The Tip Jar fills with Fish Bones as you run. */
export function fillTipJar(p: Profile, meters: number): void {
  p.tipJar = Math.min(TIP_JAR.cap, p.tipJar + Math.floor(meters / TIP_JAR.perMeters));
}

export function canClaimPremium(p: Profile, tier: number): boolean {
  return !!p.pass.premium && tier <= passTier(p.pass.stamps) && !(p.pass.premiumClaimed ?? []).includes(tier);
}

export function claimPremium(p: Profile, tier: number, rng: Rng): string[] | null {
  if (!canClaimPremium(p, tier)) return null;
  (p.pass.premiumClaimed ??= []).push(tier);
  return grant(p, passPremiumReward(tier), rng);
}

export { canClaimTier };
