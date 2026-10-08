/** Ads and IAP (GAME_DESIGN 11). Fair and cozy: rewarded first, no banners, never pay-to-win. */

/** Google's public TEST ad unit ids. Replace with real ids before release (docs/RELEASE.md). */
export const AD_UNITS = {
  ios: {
    app: 'ca-app-pub-3940256099942544~1458002511',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
  android: {
    app: 'ca-app-pub-3940256099942544~3347511713',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
  /** Keep true until real ids are in; AdMob also forces test ads for unregistered apps. */
  testing: true,
} as const;

export type RewardedPlacement = 'revive' | 'doubleLoot' | 'freeCrate' | 'headStart' | 'secretRefresh';

export const AD_RULES = {
  /** Rewarded caps. Revive (once per run) and doubleLoot (once per visit) are tracked in the run/visit. */
  rewardedPerDay: { freeCrate: 3, headStart: 2 } as Partial<Record<RewardedPlacement, number>>,
  secretRefreshHours: 8,
  /** Post-run interstitial: not before session 4, max 1 per 3 runs, 3 min apart, never after a new best. */
  interstitial: { minSession: 4, everyRuns: 3, minGapSec: 180 },
  /** ATT soft pre-prompt shows after this many sessions (iOS only). */
  attAfterSessions: 2,
  ageGate: 13,
} as const;

export type ProductId =
  | 'noAds'
  | 'starter'
  | 'fishS'
  | 'fishM'
  | 'fishL'
  | 'fishXL'
  | 'passPremium'
  | 'passPlus'
  | 'tipJar'
  | 'bundleNoir'
  | 'bundleSushi'
  | 'coinDoubler';

export interface ProductDef {
  /** Store SKU (App Store Connect / Play Console product id). */
  sku: string;
  name: string;
  blurb: string;
  usd: number;
  consumable: boolean;
  grant: {
    noAds?: boolean;
    coinDoubler?: boolean;
    passPremium?: boolean;
    passTiers?: number;
    tipJar?: boolean;
    coins?: number;
    fishBones?: number;
    roomba?: number;
    cat?: string;
    accessories?: string[];
  };
}

export const PRODUCTS: Record<ProductId, ProductDef> = {
  noAds: { sku: 'wr_no_ads', name: 'No Ads', blurb: 'No interstitials. Rewarded ads become free rewards.', usd: 4.99, consumable: false, grant: { noAds: true } },
  starter: { sku: 'wr_starter_pack', name: 'Starter Pack', blurb: 'Biscuit, 200 Fish Bones, 5,000 coins, a Roomba. First 72 h only.', usd: 1.99, consumable: false, grant: { cat: 'biscuit', fishBones: 200, coins: 5000, roomba: 1 } },
  fishS: { sku: 'wr_fish_80', name: 'Fish Bones S', blurb: '80 Fish Bones', usd: 0.99, consumable: true, grant: { fishBones: 80 } },
  fishM: { sku: 'wr_fish_450', name: 'Fish Bones M', blurb: '450 Fish Bones (+12%)', usd: 4.99, consumable: true, grant: { fishBones: 450 } },
  fishL: { sku: 'wr_fish_1000', name: 'Fish Bones L', blurb: '1,000 Fish Bones (+25%)', usd: 9.99, consumable: true, grant: { fishBones: 1000 } },
  fishXL: { sku: 'wr_fish_2200', name: 'Fish Bones XL', blurb: '2,200 Fish Bones (+37%)', usd: 19.99, consumable: true, grant: { fishBones: 2200 } },
  passPremium: { sku: 'wr_pass_s1', name: 'Paw Pass Premium', blurb: 'Premium track for this season: 300 Fish Bones back and more.', usd: 4.99, consumable: false, grant: { passPremium: true } },
  passPlus: { sku: 'wr_pass_s1_plus', name: 'Paw Pass Premium + 10 tiers', blurb: 'Premium track and skip ahead 10 tiers.', usd: 9.99, consumable: false, grant: { passPremium: true, passTiers: 10 } },
  tipJar: { sku: 'wr_tip_jar', name: "Tom's Tip Jar", blurb: 'Break the jar: keep every Fish Bone it saved up.', usd: 2.99, consumable: true, grant: { tipJar: true } },
  bundleNoir: { sku: 'wr_bundle_noir', name: 'Noir Night Bundle', blurb: 'Noir, Bow Tie and Rainbow trail.', usd: 4.99, consumable: false, grant: { cat: 'noir', accessories: ['bowTie', 'rainbowTrail'] } },
  bundleSushi: { sku: 'wr_bundle_sushi', name: 'Sushi Seaside Bundle', blurb: 'Sushi, Beret and Fish Bubbles trail.', usd: 3.99, consumable: false, grant: { cat: 'sushi', accessories: ['beret', 'bubbleTrail'] } },
  coinDoubler: { sku: 'wr_coin_doubler', name: 'Coin Doubler', blurb: 'x2 coins in every run, forever.', usd: 6.99, consumable: false, grant: { coinDoubler: true } },
};

export const PRODUCT_IDS = Object.keys(PRODUCTS) as ProductId[];

/** Cat bundles rotate weekly. */
export const BUNDLES: ProductId[] = ['bundleNoir', 'bundleSushi'];

export const STARTER_HOURS = 72;

/** Tom's Tip Jar fills with Fish Bones as you play. */
export const TIP_JAR = { perMeters: 1500, cap: 120, start: 10 } as const;

/** Paw Pass premium track: 10 Fish Bones every tier (300 over the season) plus crates. */
export function passPremiumReward(tier: number): { fishBones: number; crate?: number } {
  return tier % 15 === 0 ? { fishBones: 10, crate: 1 } : { fishBones: 10 };
}
