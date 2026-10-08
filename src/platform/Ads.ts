/** Ads. Web uses a mock; native uses AdMob via @capacitor-community/admob. */
export interface AdInitOptions {
  /** False under 13 or when tracking was declined: request non-personalised ads. */
  personalized: boolean;
  childDirected: boolean;
}

export interface IAds {
  init(opts: AdInitOptions): Promise<void>;
  isRewardedReady(): boolean;
  /** Resolves true when the reward was earned. */
  showRewarded(placement: string): Promise<boolean>;
  /** Resolves true if an interstitial was shown. */
  showInterstitial(): Promise<boolean>;
}
