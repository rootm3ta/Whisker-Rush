import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/Rng';
import { AD_RULES, PRODUCTS, TIP_JAR, passPremiumReward } from '../src/data/monetization';
import { PASS } from '../src/data/economy';
import { canShowInterstitial, personalizedAds, recordInterstitial, recordRewarded, recordRunForAds, rewardedLeft } from '../src/meta/AdPolicy';
import { computeRunConfig } from '../src/meta/Loadout';
import { canClaimPremium, claimPremium, currentBundle, fillTipJar, grantProduct, restoreOwned, shelf, starterAvailable } from '../src/meta/Shop';
import { defaultProfile } from '../src/meta/Save';

const rng = () => new Rng(3);
const DAY = 86_400_000;

describe('rewarded caps', () => {
  it('free crate 3x and head start 2x per day, reset next day', () => {
    const p = defaultProfile();
    const t = 1_000 * DAY;
    for (let i = 0; i < 3; i++) {
      expect(rewardedLeft(p, 'freeCrate', t)).toBe(3 - i);
      recordRewarded(p, 'freeCrate', t);
    }
    expect(rewardedLeft(p, 'freeCrate', t)).toBe(0);
    recordRewarded(p, 'headStart', t);
    recordRewarded(p, 'headStart', t);
    expect(rewardedLeft(p, 'headStart', t)).toBe(0);
    expect(rewardedLeft(p, 'freeCrate', t + DAY)).toBe(3);
    expect(rewardedLeft(p, 'revive', t)).toBe(Infinity);
  });

  it('Secret Stock refresh once per 8 hours and reshuffles the stock seed', () => {
    const p = defaultProfile();
    const t = 5_000_000_000;
    expect(rewardedLeft(p, 'secretRefresh', t)).toBe(1);
    recordRewarded(p, 'secretRefresh', t);
    expect(p.ads.secretShift).toBe(1);
    expect(rewardedLeft(p, 'secretRefresh', t + 7 * 3_600_000)).toBe(0);
    expect(rewardedLeft(p, 'secretRefresh', t + 8 * 3_600_000)).toBe(1);
  });
});

describe('interstitial rules', () => {
  function eligible() {
    const p = defaultProfile();
    p.sessions = AD_RULES.interstitial.minSession;
    for (let i = 0; i < AD_RULES.interstitial.everyRuns; i++) recordRunForAds(p);
    return p;
  }

  it('not before session 4, max 1 per 3 runs, 3 min apart, never after a new best, never with No Ads', () => {
    const now = 10_000_000;
    const p = eligible();
    expect(canShowInterstitial(p, now, false)).toBe(true);
    expect(canShowInterstitial(p, now, true)).toBe(false);
    recordInterstitial(p, now);
    for (let i = 0; i < 3; i++) recordRunForAds(p);
    expect(canShowInterstitial(p, now + 60_000, false)).toBe(false);
    expect(canShowInterstitial(p, now + 181_000, false)).toBe(true);
    const early = eligible();
    early.sessions = 3;
    expect(canShowInterstitial(early, now, false)).toBe(false);
    const paid = eligible();
    paid.iap.noAds = true;
    expect(canShowInterstitial(paid, now, false)).toBe(false);
  });

  it('personalised ads only for 13+ with tracking allowed (or no ATT)', () => {
    const p = defaultProfile();
    expect(personalizedAds(p, 'authorized')).toBe(true);
    expect(personalizedAds(p, 'denied')).toBe(false);
    expect(personalizedAds(p, 'unavailable')).toBe(true);
    p.privacy.under13 = true;
    expect(personalizedAds(p, 'authorized')).toBe(false);
  });
});

describe('IAP catalog', () => {
  it('matches the launch catalog prices', () => {
    expect(PRODUCTS.noAds.usd).toBe(4.99);
    expect(PRODUCTS.starter.usd).toBe(1.99);
    expect([PRODUCTS.fishS, PRODUCTS.fishM, PRODUCTS.fishL, PRODUCTS.fishXL].map((p) => p.grant.fishBones)).toEqual([80, 450, 1000, 2200]);
    expect(PRODUCTS.coinDoubler.usd).toBe(6.99);
    expect(new Set(Object.values(PRODUCTS).map((p) => p.sku)).size).toBe(Object.keys(PRODUCTS).length);
  });

  it('starter pack only in the first 72 h and only once', () => {
    const p = defaultProfile();
    p.firstSeen = 0;
    expect(starterAvailable(p, 71 * 3_600_000)).toBe(true);
    expect(starterAvailable(p, 73 * 3_600_000)).toBe(false);
    grantProduct(p, 'starter', rng());
    expect(p.cats).toContain('biscuit');
    expect(p.fishBones).toBe(defaultProfile().fishBones + 200);
    expect(starterAvailable(p, 1)).toBe(false);
  });

  it('No Ads, Coin Doubler and Pass are permanent and restorable', () => {
    const p = defaultProfile();
    const lines = restoreOwned(p, [PRODUCTS.noAds.sku, PRODUCTS.coinDoubler.sku, PRODUCTS.passPremium.sku], rng());
    expect(lines.length).toBeGreaterThan(0);
    expect(p.iap.noAds && p.iap.coinDoubler && p.pass.premium).toBe(true);
    expect(computeRunConfig(p).coinMul).toBe(2);
    expect(shelf(p, 0)).not.toContain('noAds');
    expect(restoreOwned(p, [PRODUCTS.noAds.sku], rng())).toEqual([]);
  });

  it('Tip Jar fills while running and pays out once broken', () => {
    const p = defaultProfile();
    fillTipJar(p, TIP_JAR.perMeters * 5);
    expect(p.tipJar).toBe(TIP_JAR.start + 5);
    const bones = p.fishBones;
    grantProduct(p, 'tipJar', rng());
    expect(p.fishBones).toBe(bones + TIP_JAR.start + 5);
    expect(p.tipJar).toBe(0);
    fillTipJar(p, 1e9);
    expect(p.tipJar).toBe(TIP_JAR.cap);
  });

  it('Paw Pass premium pays 300 Fish Bones over 30 tiers; +10 tiers skips ahead', () => {
    let total = 0;
    for (let t = 1; t <= PASS.tiers; t++) total += passPremiumReward(t).fishBones;
    expect(total).toBe(300);
    const p = defaultProfile();
    grantProduct(p, 'passPlus', rng());
    expect(p.pass.premium).toBe(true);
    expect(p.pass.stamps).toBe(10 * PASS.stampsPerTier);
    expect(canClaimPremium(p, 10)).toBe(true);
    expect(claimPremium(p, 10, rng())).not.toBeNull();
    expect(claimPremium(p, 10, rng())).toBeNull();
    expect(canClaimPremium(p, 11)).toBe(false);
  });

  it('cat bundles rotate weekly', () => {
    expect(currentBundle(0)).not.toBe(currentBundle(7 * DAY));
  });
});
