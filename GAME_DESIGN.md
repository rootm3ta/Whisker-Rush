# Whisker Rush: Game Design Document

> Working title. Check App Store / Play Store name availability and trademarks before launch. Alternates: "Nine Lives Dash", "Alley Cat Rush", "Paws Off!".

## 1. Pitch

A scrappy cat named **Miso** swipes the wrong sausage from the wrong bulldog and has to outrun his entire gang through the neighborhood, then across the world. Three lanes, infinite run, cat-only moves (wall-kicks, fence-top running, clothesline grinds), a living city that reacts around you, and a cozy-but-greedy meta loop where everything you grab mid-run gets haggled away at a one-eyed tomcat's market stall.

**Pillars**
1. **Cat fantasy:** move like a cat. Fences, walls, rooftops, boxes, naps, zoomies.
2. **One more run:** short runs, constant small rewards, always a mission almost done.
3. **Cozy greed:** collect stuff, sell it smart, dress your cat absurdly.
4. **World postcard:** every city is a love letter with its own dogs, music and chaos.

## 2. Story

### 2.1 Intro comic (3 panels, ~25 s total, skippable after first view)

Rendered as illustrated sketchbook panels: Three.js scene frozen with ink-outline post effect, paper texture overlay, panel borders drawn on, captions in handwritten font. Each panel has light parallax and a 2-3 s micro-animation.

**Panel 1: "Sunday."**
Miso dozes on the windowsill of a little blue house on Maple Lane. Her owner **Ada** packs a suitcase in the background and kisses Miso's head. Caption: *"Ada said she'd be back soon. Ada always says that."* A postcard falls off the table behind Miso, unnoticed.

**Panel 2: "The Sausage."**
Across the street, the butcher's window. One perfect, glistening sausage hangs on a gold hook with a tag: *"RESERVED: DUKE."* Miso's pupils go huge. Next frame: empty hook, Miso walking away with it, tail high.

**Panel 3: "Run."**
The butcher's door explodes open. **Duke**, a stocky bulldog in a spiked collar and tiny sunglasses, flanked by his pups **Pickle** and **Bolt**. Duke's whistle. Every dog in the neighborhood looks up. Miso drops into a sprint position. Caption: *"Nine lives. Let's not waste any."* Smash cut to gameplay camera.

### 2.2 Long arc (meta story, drip-fed)
- Each city contains **Postcard Fragments** (rare pickups). Completing a postcard (5 fragments) unlocks a short 1-panel comic revealing Ada's travels.
- The truth over the season: Ada is a traveling dog-show judge. Duke is chasing Miso across the world because he thinks Miso is sabotaging his championship run. The finale (city 6) reveals Ada was secretly fostering Duke as a puppy. Final panel: Miso and Duke, reluctant truce, sharing the sausage.
- Comedy recurring bits: Duke's sunglasses fall off at a new place each city; the butcher appears in the background of every city.

## 3. Core gameplay

### 3.1 Movement
- **3 lanes**, plus a **high layer** (fences, car roofs, awnings, market stalls, tram tops) reachable via ramps (garden steps, crates, dumpster lids) or wall-kicks.
- **Jump**, **slide/roll**, **lane switch**, **fast-drop**.
- **Wall-kick (cat-only):** swipe up mid-air next to a wall or fence to kick off and gain height. Chains up to 3 for score bonus.
- **Clothesline grind:** land on a clothesline to grind it, collecting socks. Swipe to hop between lines.
- **Cat Reflex:** when an obstacle is within 0.25 s and you swipe correctly, time slows to 40% for 0.3 s with a whoosh, a "NEAR MISS" stamp, and combo bump. This is the core "feel good" moment.

### 3.2 Speed curve
- Start 12 m/s, +0.15 m/s every 10 s, soft cap 26 m/s at ~8 min, hard cap 30 m/s.
- Every 1000 m: "Zone change" (district changes within the city: suburbs > market street > park > old town > riverside), keeps visuals fresh.

### 3.3 Failure and the chase
- First hit on a non-lethal obstacle (side bump, low obstacle clip): **Stumble**. Dogs close the gap and appear on screen behind you for 6 s. Second stumble in that window = **Caught**.
- Lethal hit (head-on into a solid obstacle): **Crash**, comic dust-cloud fight animation, Miso pops out dizzy with stars.
- **Revive** (once per run free via rewarded ad, then for escalating Fish Bones: 1, 2, 4, 8). Revive comes with 3 s invulnerability and a Catnip burst.
- **Nine Lives Medal:** a permanent run stat. Reviving still counts as one run, keeps leaderboard honest (revives are shown on score card).

### 3.4 Dog pack (pursuers)
| Dog | Role | Behavior |
|---|---|---|
| **Duke** (bulldog, sunglasses) | Boss | Always present. Taunts when close. |
| **Pickle** (dachshund) | Fast pup | Lunges when you stumble |
| **Bolt** (jack russell) | Chaos | Occasionally cuts ahead in a lane during "Pack Rush" events |
| City dogs | Flavor | Each city adds 2 local dog breeds (see Cities) |

**Pack Rush (event, every ~90 s after 2 min):** warning bark + red edge glow; for 8 s a city dog runs alongside in a lane and you must avoid it. Surviving pays bonus coins.

**Boss Chase (every 3000 m):** Duke shows up AHEAD on a vehicle (city-specific: delivery scooter in Rome, cargo bike in Berlin, mail truck in Maple Lane) throwing obstacles behind him. Dodge 10 throws, then Duke crashes comically into something. Big reward chest.

## 4. Pickups

### 4.1 Currencies
| Name | Type | Notes |
|---|---|---|
| **Coins** | Soft | Collected in runs, earned by selling loot |
| **Fish Bones** | Premium | Rare in runs, missions, Paw Pass, IAP. Revives, premium skins, keys |
| **Paw Stamps** | Season | Paw Pass progression only |

### 4.2 Loot (sellable items, go into the **Satchel**)
Satchel has limited slots (start 12, upgradeable to 60). When full, you can still collect coins but not loot. Creates upgrade desire and decision-making.

| Rarity | Example items (Maple Lane) | Base value |
|---|---|---|
| Common (gray) | Bottle cap, Sock, Rubber band, Lost button | 5 to 10 |
| Uncommon (green) | Toy mouse, Shiny spoon, Feather | 20 to 40 |
| Rare (blue) | Silver bell, Lost earring, Vintage stamp | 80 to 150 |
| Epic (purple) | Golden mouse, Grandma's brooch | 300 to 600 |
| Legendary (orange) | Duke's lost sunglasses, Postcard Fragment | 1000+ or story |

City-specific loot (sold best in their home city): Rome: espresso cup, pizza crust, Vespa key. Paris: macaron, beret pin, love-lock. Berlin: pretzel, U-Bahn ticket, techno flyer. Tokyo: lucky cat charm, gachapon capsule, onigiri. Tbilisi: churchkhela, khinkali, horn cup. New York: pizza slice, subway token, Statue mini.

**Collection Sets:** collect all items of a set (e.g. "Kitchen Drawer": spoon, fork, whisk, ladle) for a permanent buff (+2% coins). Sets are the "album" hook.

### 4.3 Power-ups (timed, found in runs)
| Power-up | Effect | Base duration | Visual |
|---|---|---|---|
| **Yarn Magnet** | Pulls coins and loot from all lanes | 10 s | Yarn ball orbits cat, threads to items |
| **Catnip Frenzy** | Speed x1.5, invincible, smashes obstacles | 6 s | Green swirl particles, psychedelic tint |
| **Balloon Ride** | Float above everything collecting a sky coin trail | 8 s | Cat hangs from red balloon |
| **Cardboard Box** | Stealth: dogs lose you (gap resets), pass through low obstacles | 6 s | Cat inside box with eye holes, little feet |
| **Laser Dot** | Red dot shows the optimal path, x2 score on path | 10 s | Red dot on the ground ahead |
| **Milk Bubble** | Shield, absorbs one hit | until hit | Milky bubble with ripple |
| **x2 Treats** | Doubles coins | 15 s | Golden sparkle on coins |
| **Zoomies** (start only) | Auto-run 500 m invincible | n/a | Cartoon speed lines |
| **Fish Rocket** (start only) | Launch 1500 m ahead | n/a | Cat strapped to a fish-shaped firework |

All durations upgradeable (5 levels) at the Scratching Post.

### 4.4 Ride: the **Roomba**
Consumable board equivalent. Double-tap to activate: cat rides a robot vacuum for 30 s, absorbs one crash (Roomba flies off comically). Roomba skins are a cosmetic line (DJ Roomba, Royal Roomba, Gondola Roomba in Rome) with small passive perks (e.g. double jump, magnet radius).

### 4.5 Active Abilities (equippable, one at a time, charged by combo)
- **Hiss:** scares the nearest dog back, removes stumble status.
- **Nap Time:** freezes time 2 s (cat curls up, world desaturates), then auto-dodges.
- **Pounce:** dash forward 30 m through obstacles.
- **Purr Field:** pickups in 2 lanes auto-collect for 5 s.

### 4.6 Hidden perks and secrets
- **Lucky Bells:** 9 hidden per city (behind breakable fences, on high-layer secret routes, in rare patterns). Collect all 9 = permanent +5% coins in that city and a golden collar.
- **Cat Doors:** rare glowing cat flaps in walls. Swipe into them to enter a 10 s **Secret Alley** bonus room (coin river, no obstacles, rare loot).
- **Mystery Fish:** random effect, could be any power-up or a gag (cat sneezes, turns into a loaf for 3 s with score bonus).
- **Easter eggs:** a cat statue that winks if you pass at exactly 9:09 run time; Ada's suitcase visible in each city; the butcher cameo.
- **Daily Hunt:** letters spelling a daily word ("MEOW", "PURR", "SNACK") scattered across runs.

## 5. Scoring and combo
- Score = distance x multiplier + pickups + stunts.
- **Multiplier**: base x1, +1 per completed Mission Set (permanent, max x30), shown proudly on Home.
- **Combo meter**: near misses, wall-kicks, grinds, coin streaks build combo (x1.0 to x3.0 temporary). Taking a stumble resets. Visual: paw-print meter fills, pulses at max.
- **Stunts**: Triple wall-kick, Long grind, Perfect dodge chain, Pack escape, all with stamped callouts.

## 6. Meta systems

### 6.1 Home screen (diegetic)
Miso's living room window at golden hour, camera slowly drifting. Elements are physical objects you tap:
- **Big "RUN" paw button** (bottom center, pulsing).
- **Front door** > Run.
- **Closet** > Wardrobe.
- **Scratching Post** > Upgrades.
- **Window to street** > Old Tom's Market (Vendor).
- **World map pinned on wall** > World Tour.
- **Calendar on fridge** > Daily rewards and events.
- **Paw Pass** ribbon in corner.
- Top bar: Coins, Fish Bones, Settings gear.
- Miso idles on the couch wearing her current outfit, reacts to taps (purr, stretch, knock thing off table).

### 6.2 Old Tom's Market (Vendor)
Old Tom: one-eyed ginger tomcat with an eyepatch and a fruit-crate stall.
- After every run, game routes you here if your Satchel has loot (skippable).
- **Sell** items for coins. **Sell All** button with a satisfying coin-count waterfall.
- **Daily price board:** each day 3 items are "hot" (x2 to x3 price) and 2 are "cold" (x0.5). Prices refresh at local midnight. Players learn to hold items for good days (stash capacity matters). This is the trading hook.
- **Haggle mini-game:** once per visit, tap the paw at the right moment on a swinging meter for +10% to +50% on one sale.
- **Trade-ins:** complete Collection Sets and trade them to Old Tom for exclusive accessories.
- **Tom's Secret Stock:** rotating 3 items (rare accessories, keys) refreshed every 8 hours.
- Tom has rotating dialogue lines (50+), grumpy and funny.

### 6.3 Scratching Post (Upgrades), coin sink
| Upgrade | Levels | Effect |
|---|---|---|
| Power-up durations (each) | 5 | +2 s per level |
| Satchel size | 8 | 12 > 60 slots |
| Agility | 5 | Faster lane switch, longer coyote time |
| Pounce Spring | 5 | Higher jumps, +1 wall-kick at max |
| Lucky Whiskers | 5 | Rare loot drop rate |
| Head Start stock | consumable | Zoomies / Fish Rocket |
Cost ladder: 500, 1.5k, 4k, 10k, 25k (tune in `data/economy.ts`).

### 6.4 Wardrobe (customization)
**Cats (skins):** each is a different cat with a tiny passive.
| Cat | Unlock | Passive |
|---|---|---|
| Miso (calico) | Default | None |
| Biscuit (orange tabby) | 5k coins | +5% coin value |
| Noir (black cat) | 10k coins | Cat doors appear 2x |
| Sushi (siamese) | 15 Fish Bones | Longer Nap Time |
| Professor Mittens (fluffy gray, glasses) | Collection set reward | +loot sell price |
| Pixel (sphynx in sweater) | Paw Pass S1 | Start with Milk Bubble |
| Luna (white, heterochromia) | Event | Moonlight trail VFX |
| Duke's Nightmare (tiny kitten) | 9 Lucky Bell sets | Smaller hitbox |

**Accessory slots:** Head, Eyes, Neck, Back, Tail, Trail VFX. Mix and match on every cat.
Examples: Beret, Viking helmet, Chef hat, Crown, Bucket hat, Tiny sombrero, Aviators, Heart glasses, Monocle, Bandana, Bell collar, Bow tie, Gold chain, Mini backpack, Cape, Angel wings, Jetpack (cosmetic), Tail bow, Tail ring, Trails (sparkles, rainbow, fish bubbles, music notes, pixel squares).
**Outfit sets** (wear all pieces = bonus): "Parisian Artist" (beret, striped shirt, baguette backpack) = +10% in Paris.
**Photo Mode:** pose Miso, pick background, share. Free viral marketing.

### 6.5 Missions
- 3 active missions at a time ("Wall-kick 15 times", "Sell 10 socks", "Grind 200 m of clotheslines in one run"). Completing a set of 3 = +1 permanent multiplier and a reward box.
- **Daily Challenges:** 3 per day, small Fish Bones rewards.

### 6.6 Paw Pass (battle pass)
- 30 tiers per 4-week season, free track and premium track.
- Tiers earned with Paw Stamps (from runs, missions, daily).
- Season themes tied to cities ("La Dolce Vita" Rome season).
- Premium: exclusive cat, Roomba skin, trail, 300 Fish Bones back over the season (feels like it pays for itself).

### 6.7 Retention hooks (proven in the genre)
- Daily login calendar (7-day, escalating, day 7 = mystery box).
- Streak bonus: play 3 days in a row = permanent cosmetic.
- **Piggy Bank (Tom's Tip Jar):** fills with Fish Bones as you play, break it with a one-time purchase.
- Weekly World Tour rotation: one featured city gets special event currency and a limited cat.
- Leaderboards: friends (Game Center) and weekly global with league tiers (Alley > Street > Rooftop > Skyline > Legend).
- Mystery Boxes (Catnip Crates) from missions, ads, events. **Odds always displayed** (App Store requirement).
- Push notifications (opt-in, max 1/day): "Old Tom says socks are selling for 3x today."
- "Share your crash" auto-replay: last 5 s before death saved as a short clip with a funny stamp. Share button on Game Over screen (TikTok/Instagram hook).
- Comeback reward after 3 days away.

## 7. Cities (World Tour)

Each city = palette, skybox gradient, 6 to 10 prop types, 2 local dog breeds, 1 boss vehicle, music style, loot set, ambience SFX, one signature hazard, one signature shortcut.

| City | Palette / mood | Local dogs | Signature hazard | Signature shortcut | Music |
|---|---|---|---|---|---|
| **Maple Lane** (home) | Golden-hour suburb, mint houses, orange leaves | Pickle, Bolt | Sprinklers, kids' bikes, mail truck | Garden fences | Cozy lo-fi bounce |
| **Rome** | Terracotta, cream, deep blue sky | Italian greyhound, Spinone | Vespas weaving lanes, falling laundry | Fountain rims, market awnings | Mandolin swing, accordion |
| **Paris** | Dusk violet, warm street lamps | Poodles (with pompoms) | Baguette carts, painters' easels | Mansard rooftops (high layer) | Musette waltz-hop |
| **Berlin** | Neon night, graffiti, concrete | Dachshund army, Schnauzer | Cyclists in bike lane, U-Bahn crossing | Tram tops | Minimal techno-pop |
| **Tokyo** | Cherry blossom pink, vending-machine glow | Shiba Inu, Akita | Delivery robots, crossing crowds | Vending machine tops | City-pop |
| **Tbilisi** | Carved wooden balconies, sulfur bath domes, sunset | Georgian shepherd, street pups | Churchkhela strings, wine barrels rolling downhill | Balcony hopping | Polyphonic choir + panduri groove |
| **New York** (later) | Yellow cabs, steam, brownstones | Pug, Bulldog cousins | Steam vents, hot-dog carts | Fire escapes | Boom-bap jazz |

Unlock order: Maple Lane > Rome > Paris > Berlin > Tokyo > Tbilisi. Unlock by distance milestones OR coins OR Fish Bones (player choice).

## 8. Onboarding

### 8.1 First session flow (target: gameplay within 20 s of launch)
1. Splash (1.5 s, paw-print logo stamp).
2. Story comic (25 s, skip button after 3 s).
3. Comic smash-cuts directly into the **Tutorial Run**, no menu in between.
4. After tutorial: first real run with guaranteed fun (Magnet + Catnip spawns early, generous loot).
5. Game Over > Old Tom introduces himself and buys your first loot at a "newcomer bonus" price. Teaches the loop.
6. Home screen with highlighted Wardrobe: "Free hat!" (gives Bucket hat). Immediate customization hit.
7. No interstitial ads in the first 3 sessions. Ever.

### 8.2 Tutorial (interactive, ~60 s, in-world)
Slow speed, Duke far behind, ghost-paw hints appear on screen:
1. Swipe left/right (trash cans).
2. Swipe up (hedge).
3. Swipe down (low branch / laundry).
4. Wall-kick (fence wall with arrow hint).
5. Grab Yarn Magnet (shows effect).
6. Grab loot item ("Old Tom will want this").
7. Duke closes in, Pack Rush mini version, survive.
Each step waits until done (no failing during tutorial). Big "YOU'RE A NATURAL" stamp at the end.

## 9. Art direction

- **Style:** stylized low-poly toon, chunky silhouettes, warm golden-hour lighting, soft rim light, ink outlines on characters, flat-shaded world with 3-step toon ramp. Think picture book meets diorama.
- **Cat model (procedural):** capsule torso, sphere head, cone ears with inner pink, 4 cylinder legs, 6-segment tail with spring physics, almond eyes as textured planes with blink, whiskers as thin lines. Coat patterns via a small generated canvas texture (calico patches, tabby stripes, tuxedo).
- **Animation:** procedural (sin-based gallop cycle with spine stretch, ear flicks, tail follow-through). Squash and stretch on jump/land.
- **World:** modular chunks 40 m long. Houses as extruded shapes with randomized window/door/roof variants and city-palette colors. Instanced props.
- **Sky:** gradient shader per city + drifting low-poly clouds + sun disk.
- **Particles (pooled, GPU points):** dust puffs on landing, coin sparkle, leaf flurries, catnip swirls, speed lines at high speed, confetti on records, crash dust cloud with stars.
- **Camera:** behind-and-above, slight lag on lane change, FOV kick on boosts, micro shake on landings, dramatic low angle during Boss Chase.
- **UI:** sketchbook theme (see CLAUDE.md Section 7). Numbers count up with tick sounds. Rewards burst from where they were earned and fly to the counter.

## 10. Audio direction

- **Procedural music (Tone.js)** per city: tempo 100 to 128 BPM, layered stems that add as speed increases (drums > bass > lead), drops to filtered version during power-up, pitches up slightly during Catnip.
- **SFX (synthesized):** coin pings in a pentatonic scale that climb with streaks (huge for feel), soft "mrrp" on jump (filtered noise + pitch blip), hiss, bark (formant synth), whoosh, pop, cash register for vendor.
- Settings: Music, SFX, Haptics toggles separately.
- **Later:** commission 6 city tracks from a composer (Fiverr/SoundBetter, ~$100 to $300 each) or license royalty-free, drop into `public/audio/`.

## 11. Monetization

### 11.1 Philosophy
Fair and cozy. Never pay-to-win on leaderboards, never paywall a city permanently. Rewarded ads first. Most revenue should come from cosmetics, Paw Pass, and convenience.

### 11.2 Ads
| Placement | Type | Rules |
|---|---|---|
| Revive | Rewarded | Once per run |
| Double loot value at Old Tom | Rewarded | Once per visit |
| Free Catnip Crate | Rewarded | 3x per day |
| Free head start | Rewarded | Before run, 2x per day |
| Tom's Secret Stock refresh | Rewarded | 1x per 8 h |
| Post-run interstitial | Interstitial | Not before session 4, max 1 per 3 runs, min 3 min apart, never after a new high score |
| Banner | None | Never. Cheapens the look |

**Mediation:** AppLovin MAX (or Unity LevelPlay) with AdMob, Meta Audience Network, Unity Ads, Mintegral as networks. For Capacitor: `@capacitor-community/admob` for v1 speed, migrate to MAX later.
**ATT:** show a soft pre-prompt explaining "keeps the game free" before the iOS ATT system prompt, after session 2.

### 11.3 IAP catalog (launch)
| Product | Price (USD) | Contents |
|---|---|---|
| No Ads | 4.99 | Removes interstitials, keeps rewarded optional (with free reward instead) |
| Starter Pack (one-time, first 72 h) | 1.99 | Biscuit cat, 200 Fish Bones, 5k coins, Roomba |
| Fish Bones S | 0.99 | 80 |
| Fish Bones M | 4.99 | 450 (+12%) |
| Fish Bones L | 9.99 | 1000 (+25%) |
| Fish Bones XL | 19.99 | 2200 (+37%) |
| Paw Pass Premium | 4.99 / season | Premium track |
| Paw Pass Premium + 10 tiers | 9.99 | Skip ahead |
| Tom's Tip Jar (piggy bank) | 2.99 | Accumulated Fish Bones |
| Cat bundles (rotating) | 2.99 to 7.99 | Cat + outfit set + trail |
| Coin Doubler (permanent) | 6.99 | x2 coins forever |

### 11.4 Compliance (important)
- Display loot box odds (Apple 3.1.1, Google policy).
- If the game appeals to children (it will), consider **not** targeting under 13 in store listing; if you do, ads must be non-personalized and COPPA/GDPR-K compliant, and Apple Kids Category forbids third-party ads/analytics. Recommended: rate 9+, general audience, age gate for personalized ads.
- GDPR consent (UMP / Google consent SDK) for EU users.
- Privacy policy URL required for both stores.

### 11.5 KPIs to watch
D1 retention > 40%, D7 > 15%, session length 8+ min, runs per session 4+, rewarded ad views per DAU 2+, payer conversion 2 to 4%.

## 12. Live ops roadmap (post-launch)
- Every 4 weeks: new Paw Pass season tied to a city.
- Every 2 weeks: World Tour rotates featured city with event currency.
- Holiday events: Halloween (Black Cat Week), Christmas (Snow Maple Lane), Lunar New Year (Tokyo/lantern variant).
- Collabs later: real cat shelters (adopt-a-cat charity skin, great PR).
- UGC: Photo Mode contests.

## 13. Analytics events (minimum)
`session_start, story_skip, tutorial_step, run_start, run_end(distance, score, cause, city), revive(type), powerup_pickup(id), loot_collect(id), vendor_sell(total), upgrade_buy(id, lvl), skin_equip(id), ad_shown(placement), ad_completed(placement), iap_start(id), iap_success(id), pass_tier(n), city_unlock(id)`

## 14. Assumptions (flagged)
- Web tech (Three.js) wrapped with Capacitor is good enough for a polished stylized 3D runner on modern iPhones. If performance on older devices disappoints, port core to Unity later with the same design and data tables.
- Procedural models and music are the tonight-quality baseline; real art and music are a paid follow-up.
- A Mac with Xcode and an Apple Developer account ($99/yr) is needed for the App Store build (M9). Tonight's build runs in iPhone Safari via GitHub Pages.
- Economy numbers are first-pass and must be tuned with playtest data.
