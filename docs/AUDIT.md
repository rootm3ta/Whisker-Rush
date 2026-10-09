# S7 playtest audit

Tools used: the autoplay bot (`src/gameplay/Autopilot.ts`, `?autoplay=1` or `?autoplay=newPlayer|casual|expert`, also in the `?debug` menu), the headless simulator (`src/gameplay/Simulator.ts`, `npm run sim` writes `docs/SIM_REPORT.md`), Playwright screenshots at iPhone SE (375x667), iPhone 13 (390x844) and iPhone 15 Pro Max (430x932) in `docs/screens/audit/`, and `renderer.info` frame counters.

## Headline numbers (after fixes, 200 runs per city per skill)

| City | newPlayer | casual | expert | Deaths before 30 s |
|---|---|---|---|---|
| Maple Lane | 76 s | 116 s | 248 s | 11% |
| Rome | 90 s | 142 s | 266 s | 6% |
| Tokyo | 70 s | 121 s | 246 s | 10% |
| Tbilisi | 100 s | 192 s | 373 s | 11% |

- Impossible patterns: **0** in every city (static check in `tests/simulation.test.ts`, runs in `npm test`).
- New player first run (Maple Lane, first-run assists on): average above 45 s (tested).
- Power-up uptime: 24% to 44%.
- Draw calls about 80 to 90 per frame, 14k to 35k triangles, in every city and district (budget 150 / 150k).

## P0 (broken or unfair)

| Finding | Status |
|---|---|
| Rome Vespa and Tokyo mamachari killed on contact even though they move into your lane; the bot (and players) had too little time to read them. Tokyo newPlayer runs averaged 39 s, 32% died before 30 s. | Fixed: both now cause a stumble, not a crash. Weave hazards spawn at 20 m minimum (was 14). |
| Tbilisi churchkhela and market-table tosses were lethal from the side. | Fixed: stumble only. |
| `t-vending`, `t-overpass` and `g-balcony-zigzag` had rows reachable only with frame-perfect lane changes at top speed. | Fixed: respaced. |

## P1 (hurts retention or reachability)

| Finding | Status |
|---|---|
| Pattern repetition: in Tokyo and Tbilisi over 50% of placed patterns repeated one of the previous 8. | Fixed: spawner recency penalty (last 8 patterns weighted x0.12) and 7 new patterns each in Tokyo and Tbilisi. Now 18% to 33% in the new cities, 8% to 10% in Maple, about 22% in Rome. |
| Upgrade ladder too steep for a casual player (over 1500 runs to max everything). | Fixed: ladder now 500 / 1500 / 3500 / 7500 / 15000 and a flatter satchel ladder. Each upgrade maxes in about 81 casual runs (satchel 119), everything in about 844. |
| Sheets and popups overflowed the screen on iPhone SE (content-box width plus padding). | Fixed: border-box and `max-width: 100vw` on sheet, popup and Game Over cards. |
| Small buttons (gear, tabs, toggles, close X, small buttons) below 44 pt. | Fixed: 44 pt hit pads. |
| Home top bar squeezed on 375 px wide screens. | Fixed: the bar does not shrink and Shop shows only its icon at 380 px and below. |
| PWA icons were SVG only; iOS ignores SVG for "Add to Home Screen". | Fixed: `icon-180.png` (apple-touch-icon) and `icon-512.png`. |
| Market hot/cold board had no legend. | Fixed. |

## P2 (polish, remaining unless noted)

- The first-launch comic is about 25 s; first jump happens about 35 s after opening (12 s with Skip, which appears after 3 s). Recommend cutting to about 12 s.
- Pattern libraries are still small, so 50% to 80% of patterns repeat within 2 minutes. More patterns per city are the long-term fix.
- Tbilisi plays easier than Rome and Tokyo though it is the last city (pothole and toss stumbles dominate deaths, 8% of expert runs survive 10 min). Recommend more lethal Old Town patterns.
- Maple Lane deaths are dominated by trash cans (about 57%); fine for a tutorial city but could use more variety.
- GLB asset registry drop-in is not built yet (suggested as a separate task).
- Real-device fps on iPhone 12 not measured (no device here); desktop counters are within budget.
- Sushi (15 Fish Bones) takes about 91 runs from run drops alone; daily rewards, missions and the Paw Pass cut that a lot.

## Reachability (casual player, about 348 coins per run in Maple Lane)

| Goal | Runs |
|---|---|
| Biscuit | 15 |
| Noir | 29 |
| Sushi | 91 (runs only) |
| Professor Mittens | fancyThings collection set (loot) |
| Pixel | Paw Pass tier 30 (free track) |
| Rome | 58 by coins, or a 3000 m run (13% of casual runs) |
| Tokyo | 130 by coins, or a 6000 m run |
| Tbilisi | 173 by coins, or an 8000 m run |
| Any one upgrade maxed | 81 (satchel 119) |
| Every upgrade maxed | 844 |

## Verified as fine

- Corrupt save falls back to defaults; migration merges defaults.
- Safe-area insets used on HUD, home and sheets; manifest is fullscreen portrait.
- Spawns at 170 m are hidden by 140 m fog, no pop-in.
- Audio resumes after backgrounding (S1).
- Interstitial caps covered by tests.
