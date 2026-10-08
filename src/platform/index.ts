import { Capacitor } from '@capacitor/core';
import type { IAds } from './Ads';
import { WebHaptics, type IHaptics } from './Haptics';
import type { IIAP } from './IAP';
import { MockAds } from './MockAds';
import { MockIAP } from './MockIAP';
import { WebPrivacy, type IPrivacy } from './Privacy';
import { LocalStorageAdapter, type IStorage } from './Storage';

export interface Platform {
  native: boolean;
  ads: IAds;
  iap: IIAP;
  haptics: IHaptics & { enabled: boolean };
  privacy: IPrivacy;
  storage: IStorage;
}

/** Native plugins on iOS/Android (Capacitor), web mocks in the browser. Gameplay only sees interfaces. */
export async function createPlatform(host: HTMLElement, saveKeys: readonly string[]): Promise<Platform> {
  if (!Capacitor.isNativePlatform()) {
    return { native: false, ads: new MockAds(host), iap: new MockIAP(host), haptics: new WebHaptics(), privacy: new WebPrivacy(), storage: new LocalStorageAdapter() };
  }
  const [{ AdMobAds }, { NativeIAP }, { NativePrivacy }, { CapHaptics }, { CapStorage }] = await Promise.all([
    import('./native/AdMobAds'),
    import('./native/NativeIAP'),
    import('./native/NativePrivacy'),
    import('./native/CapHaptics'),
    import('./native/CapStorage'),
  ]);
  const storage = new CapStorage();
  await storage.preload(saveKeys);
  return { native: true, ads: new AdMobAds(), iap: new NativeIAP(), haptics: new CapHaptics(), privacy: new NativePrivacy(), storage };
}
