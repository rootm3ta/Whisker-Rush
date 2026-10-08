import { Capacitor } from '@capacitor/core';
import { AdMob, MaxAdContentRating } from '@capacitor-community/admob';
import { AD_UNITS } from '../../data/monetization';
import type { AdInitOptions, IAds } from '../Ads';

/** AdMob rewarded + interstitial (no banners, ever). Ads are preloaded after each show. */
export class AdMobAds implements IAds {
  private readonly units = Capacitor.getPlatform() === 'ios' ? AD_UNITS.ios : AD_UNITS.android;
  private opts: AdInitOptions = { personalized: false, childDirected: false };
  private rewardedReady = false;
  private interstitialReady = false;

  async init(opts: AdInitOptions): Promise<void> {
    this.opts = opts;
    await AdMob.initialize({
      initializeForTesting: AD_UNITS.testing,
      tagForChildDirectedTreatment: opts.childDirected,
      tagForUnderAgeOfConsent: opts.childDirected,
      maxAdContentRating: MaxAdContentRating.General,
    });
    void this.loadRewarded();
    void this.loadInterstitial();
  }

  private async loadRewarded(): Promise<void> {
    try {
      await AdMob.prepareRewardVideoAd({ adId: this.units.rewarded, isTesting: AD_UNITS.testing, npa: !this.opts.personalized });
      this.rewardedReady = true;
    } catch {
      this.rewardedReady = false;
    }
  }

  private async loadInterstitial(): Promise<void> {
    try {
      await AdMob.prepareInterstitial({ adId: this.units.interstitial, isTesting: AD_UNITS.testing, npa: !this.opts.personalized });
      this.interstitialReady = true;
    } catch {
      this.interstitialReady = false;
    }
  }

  isRewardedReady(): boolean {
    return this.rewardedReady;
  }

  async showRewarded(_placement: string): Promise<boolean> {
    if (!this.rewardedReady) await this.loadRewarded();
    if (!this.rewardedReady) return false;
    this.rewardedReady = false;
    try {
      const reward = await AdMob.showRewardVideoAd();
      return !!reward;
    } catch {
      return false;
    } finally {
      void this.loadRewarded();
    }
  }

  async showInterstitial(): Promise<boolean> {
    if (!this.interstitialReady) return false;
    this.interstitialReady = false;
    try {
      await AdMob.showInterstitial();
      return true;
    } catch {
      return false;
    } finally {
      void this.loadInterstitial();
    }
  }
}
