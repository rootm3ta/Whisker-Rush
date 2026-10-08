import { ADS } from '../data/chase';
import type { IAds } from './Ads';
import './mockAds.css';

/** Web mock: a fake ad card that counts down, then grants the reward. */
export class MockAds implements IAds {
  constructor(private readonly host: HTMLElement) {}

  isRewardedReady(): boolean {
    return true;
  }

  showRewarded(placement: string): Promise<boolean> {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.className = 'wr-ad';
      el.innerHTML = `<div class="wr-ad-card"><p class="wr-ad-tag">Ad break (mock)</p><p class="wr-ad-name"></p><p class="wr-ad-count"></p></div>`;
      el.querySelector('.wr-ad-name')!.textContent = placement;
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
