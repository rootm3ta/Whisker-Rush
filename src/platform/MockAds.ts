import { ADS } from '../data/chase';
import type { AdInitOptions, IAds } from './Ads';
import './mockAds.css';

/** Web mock: fake ad cards that count down, then grant the reward. */
export class MockAds implements IAds {
  constructor(private readonly host: HTMLElement) {}

  async init(_opts: AdInitOptions): Promise<void> {}

  isRewardedReady(): boolean {
    return true;
  }

  showRewarded(placement: string): Promise<boolean> {
    return this.card('Ad break (mock)', placement);
  }

  showInterstitial(): Promise<boolean> {
    return this.card('Interstitial (mock)', 'Thanks for playing!');
  }

  private card(tag: string, name: string): Promise<boolean> {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'wr-ad';
      el.innerHTML = `<div class="wr-ad-card"><p class="wr-ad-tag"></p><p class="wr-ad-name"></p><p class="wr-ad-count"></p></div>`;
      el.querySelector('.wr-ad-tag')!.textContent = tag;
      el.querySelector('.wr-ad-name')!.textContent = name;
      for (const ev of ['pointerdown', 'pointerup', 'click'] as const) el.addEventListener(ev, (e) => e.stopPropagation());
      const count = el.querySelector('.wr-ad-count')!;
      this.host.appendChild(el);
      let left = ADS.mockSec;
      count.textContent = String(left);
      const timer = window.setInterval(() => {
        left--;
        count.textContent = String(Math.max(left, 0));
        if (left <= 0) {
          window.clearInterval(timer);
          el.remove();
          resolve(true);
        }
      }, 1000);
    });
  }
}
