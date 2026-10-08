# Release guide: iOS (Xcode) and Android

Whisker Rush ships as a Capacitor app. The web build in `dist/` is copied into the
native projects in `ios/` and `android/`. The same code runs on the web with mock
ads, a mock store and localStorage; on device it switches to the real plugins
(`src/platform/index.ts` picks the implementation at boot).

| Feature | Web (mock) | Native |
|---|---|---|
| Haptics | `navigator.vibrate` | `@capacitor/haptics` |
| Save | localStorage | `@capacitor/preferences` (preloaded, write-through) |
| Ads | countdown cards | `@capacitor-community/admob` rewarded + interstitial |
| IAP | "test store" confirm card | `@capgo/native-purchases` (StoreKit 2 / Play Billing) |
| Consent | none needed | Google UMP form (EU/UK), then ATT on iOS |

## 1. Requirements

- macOS with Xcode 16 or newer, an Apple Developer account (paid, for IAP and TestFlight).
- Node 20+.
- Android: Android Studio (Ladybug or newer), JDK 21.

## 2. Build and open in Xcode

```bash
npm ci
npm run build:native     # CAPACITOR=1 vite build (relative base) + npx cap sync
npx cap open ios         # or: npm run ios
```

`ios/App/App.xcodeproj` uses Swift Package Manager for the plugins, no CocoaPods.
Xcode resolves packages on first open (File > Packages > Resolve if it does not).

Run on a device or simulator with the Play button. Every time web code changes,
run `npm run build:native` again (or `npx cap copy ios` after `CAPACITOR=1 npm run build`).

## 3. Signing and identity

1. Select the **App** target > **Signing & Capabilities**.
2. Pick your **Team**, keep "Automatically manage signing".
3. Bundle id is `com.whiskerrush.game` (from `capacitor.config.ts`). If you change it,
   change it in `capacitor.config.ts` and in Xcode, then run `npx cap sync`.
4. Add the **In-App Purchase** capability.
5. Set version (`MARKETING_VERSION`) and build number (`CURRENT_PROJECT_VERSION`) on the target's General tab.

## 4. Ads: switch from test ids to real ids

Google test ids are wired everywhere so nothing can earn invalid traffic during development.

1. Create the app and two ad units (Rewarded, Interstitial) per platform in AdMob.
2. `src/data/monetization.ts`: replace `AD_UNITS.ios` / `AD_UNITS.android` ids and set `testing: false`.
3. `ios/App/App/Info.plist`: replace `GADApplicationIdentifier` with your iOS AdMob app id.
4. `android/app/src/main/AndroidManifest.xml`: replace the `com.google.android.gms.ads.APPLICATION_ID` value.
5. Keep the `SKAdNetworkItems` list in Info.plist up to date with Google's published list.
6. Configure the **Privacy & messaging** > GDPR message in AdMob, otherwise the UMP form has nothing to show.

Caps (from GAME_DESIGN 11.2, all in `AD_RULES`): rewarded only by player choice; free crate 3/day,
Zoomies head start 2/day, secret stock refresh every 8 h; interstitial never in the first
4 sessions, at most every 3rd run, 180 s apart, never after a new best, never with No Ads.

## 5. Privacy flow

On first home screen visit (`Game.startMonetization`):

1. **Age gate** ("13 or older?"). Under 13: child-directed, non-personalized ads, no ATT prompt.
2. **UMP consent** (EU/UK only, decided by Google): `requestConsentInfo` then `showConsentForm` if required.
3. **ATT** on iOS after session 2: our own soft pre-prompt sheet first, then the system prompt only if the player taps "Sure". The text comes from `NSUserTrackingUsageDescription` in Info.plist.
4. Ads are personalized only with consent and tracking allowed (`personalizedAds` in `AdPolicy.ts`).

App Store Connect needs a **privacy policy URL** and the App Privacy questionnaire
(Identifiers: Device ID for third-party advertising via AdMob; Purchases; no account data).

## 6. In-app purchases (catalog from GAME_DESIGN 11.3)

Create these in App Store Connect > your app > Monetization > In-App Purchases (and the same
product ids in Play Console > Monetize > Products). Ids must match `PRODUCTS` in
`src/data/monetization.ts`.

| Product id | Type | Price | Content |
|---|---|---|---|
| `wr_no_ads` | Non-consumable | $4.99 | No interstitials, rewarded ads become free rewards |
| `wr_starter_pack` | Non-consumable | $1.99 | Biscuit skin, 200 Fish Bones, 5,000 coins, Roomba (first 72 h) |
| `wr_fish_80` | Consumable | $0.99 | 80 Fish Bones |
| `wr_fish_450` | Consumable | $4.99 | 450 Fish Bones |
| `wr_fish_1000` | Consumable | $9.99 | 1,000 Fish Bones |
| `wr_fish_2200` | Consumable | $19.99 | 2,200 Fish Bones |
| `wr_pass_s1` | Non-consumable* | $4.99 | Paw Pass premium track |
| `wr_pass_s1_plus` | Non-consumable* | $9.99 | Premium track + 10 tiers |
| `wr_tip_jar` | Consumable | $2.99 | Break the Tip Jar |
| `wr_bundle_noir` | Non-consumable | $4.99 | Noir bundle (weekly rotation) |
| `wr_bundle_sushi` | Non-consumable | $3.99 | Sushi bundle (weekly rotation) |
| `wr_coin_doubler` | Non-consumable | $6.99 | Coins x2 forever |

*When seasons go live, the pass should become a per-season product (`wr_pass_s2`, ...).

Loot crates are never sold for money; the odds screen (Daily > Odds, Shop > Odds) lists every
drop rate, which both stores require for randomized items.

**Testing purchases**: add a Sandbox tester in App Store Connect > Users and Access > Sandbox,
sign in on the device under Settings > App Store > Sandbox Account, then buy in the app.
Optionally add a StoreKit Configuration file in Xcode (File > New > StoreKit Configuration,
sync from App Store Connect) and select it under Scheme > Run > Options for offline testing.
"Restore purchases" is in the Shop; non-consumables are also restored silently at boot.

## 7. Archive and upload to TestFlight

1. In Xcode choose the **Any iOS Device (arm64)** destination.
2. Product > **Archive**.
3. Organizer opens: **Distribute App** > **App Store Connect** > Upload.
4. In App Store Connect > TestFlight, add internal testers. The build appears after processing (10 to 30 min).
5. For release: fill screenshots (6.7" and 6.1" portrait), description, keywords, age rating
   (Frequent/Intense: none; contains ads and in-app purchases), privacy answers, then submit.

## 8. Android (Play Console)

```bash
npm run build:native
npx cap open android     # or: npm run android
```

1. Build > Generate Signed Bundle / APK > Android App Bundle, create an upload keystore (back it up).
2. Play Console: create the app, upload the `.aab` to Internal testing.
3. Add license testers (Setup > License testing) to buy products without being charged.
4. Data safety form: Advertising ID collected for ads, purchase history.
5. Set `versionCode` / `versionName` in `android/app/build.gradle` for every upload.

## 9. Checklist before submitting

- [ ] `npm test` and `npm run build` pass
- [ ] `AD_UNITS.testing` is `false`, real AdMob ids in code, Info.plist and AndroidManifest
- [ ] All 12 products created and "Ready to Submit"
- [ ] Privacy policy URL live; App Privacy / Data safety filled
- [ ] Played a full run on a real iPhone: ads, purchase, restore, consent and ATT prompts all behave
