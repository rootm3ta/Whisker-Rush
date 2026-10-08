/** Rewarded ads. Web uses a mock; AdMob/AppLovin via Capacitor in M9. */
export interface IAds {
  isRewardedReady(): boolean;
  /** Resolves true when the reward was earned. */
  showRewarded(placement: string): Promise<boolean>;
}
