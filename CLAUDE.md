# CLAUDE.md: Whisker Rush (working title)

You are building **Whisker Rush**, a 3-lane endless runner for iOS (and later Android) where a cat outruns a gang of neighborhood dogs across real-world cities. The full design lives in `docs/GAME_DESIGN.md`. Read it before writing code. This file defines HOW to build; the design doc defines WHAT to build.

## 0. Prime directives (read every session)

1. **Budget is tight (~$80 of Claude Code usage).** Be economical: do not re-read files you just wrote, do not read `node_modules`, do not print large files, do not run long-lived dev servers, prefer small focused files. Finish one milestone, commit, stop.
2. **Playable tonight beats perfect never.** Each milestone must end in a working build (`npm run build` passes) and a commit. Never leave the repo broken.
3. **No external asset downloads are required.** Everything (cat, dogs, world, props, music, SFX) is generated procedurally in code first. Real model/audio files are optional drop-ins via the asset registry (Section 6).
4. **No copyrighted material.** No Subway Surfers / Temple Run assets, names, sounds or characters. Mechanics are fine; art, audio and names must be original.
5. **Mobile first.** Portrait 9:19.5, touch controls, 60 fps target on iPhone 12, safe-area aware.
6. **Do not ask me questions mid-milestone.** Make the sensible call, note it in `docs/DECISIONS.md` (one line each), keep going.

## 1. Tech stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Type safety, Claude Code can build and verify headless |
| Renderer | Three.js (latest r17x) | Full 3D, no editor needed, runs in Safari on iPhone tonight |
| Post FX | `postprocessing` (pmndrs) | Bloom, vignette, SMAA, cheap on mobile |
| Bundler | Vite | Fast, simple, static output |
| Audio | Web Audio API + Tone.js | Procedural music per city and synthesized SFX, zero asset files |
| Tweens | GSAP (or a tiny in-house tween) | UI and camera juice |
| UI | Plain HTML/CSS overlay (no React) | Lightweight, crisp text, easy to style hand-drawn |
| Save | `localStorage` behind a `Storage` interface | Swap to Capacitor Preferences later |
| Native wrap (later) | Capacitor 6+ | Same codebase ships to App Store and Google Play |
| Hosting tonight | GitHub Pages via GitHub Actions | Playable on iPhone Safari via URL, "Add to Home Screen" as PWA |
| Tests | Vitest for pure logic (economy, spawner, save) | Cheap verification, no browser needed |

Unity was considered and rejected for tonight: Claude Code cloud cannot drive the Unity Editor, scenes/prefabs are hard to author as text, and it needs 3D assets we do not have. Revisit Unity only if we later hire an artist and need console-level fidelity.

## 2. Repository layout

```
/
  CLAUDE.md
  docs/GAME_DESIGN.md
  docs/DECISIONS.md
  index.html
  vite.config.ts
  public/            # optional drop-in assets (models/, audio/, fonts/)
  src/
    main.ts          # boot, loop
    core/            # Game, StateMachine, EventBus, Time, Input, Rng (seeded)
    world/           # TrackGenerator, Chunk, Pattern library, CurvedWorld shader, Biomes (cities)
    entities/        # Cat, Dog, DogPack, Obstacle, Pickup, PowerUp
    gameplay/        # Runner controller, Collision, Combo, Missions, Powerups
    meta/            # Economy, Inventory, Vendor, Upgrades, Wardrobe, PawPass, DailyRewards, Save
    render/          # Renderer, PostFX, ToonMaterial, Particles (pooled), CameraRig
    procgen/         # Procedural meshes: cat, dogs, houses, props, accessories
    audio/           # MusicDirector (Tone.js per city), Sfx synth
    ui/              # Screens: Splash, Story, Tutorial, Home, HUD, Pause, GameOver, Vendor, Wardrobe, Upgrades, Map, Pass, Settings
    data/            # JSON-like TS configs: items, skins, accessories, powerups, cities, economy tables, missions
    platform/        # Haptics, Ads, IAP, Analytics interfaces with web mocks
  tests/
  .github/workflows/deploy.yml
```

## 3. Architecture rules

- **Data-driven.** All tunables (speeds, prices, spawn weights, durations, drop rates) live in `src/data/*.ts`. No magic numbers in gameplay code.
- **State machine** for app flow: `Boot > Story (first launch) > Tutorial (first launch) > Home > Run > GameOver > Vendor > Home`.
- **Event bus** for decoupling (`coinCollected`, `nearMiss`, `powerupStart`, `crash`, `runEnd`, etc). Missions, audio, haptics, analytics all subscribe; gameplay never calls them directly.
- **Object pooling** for every spawned thing (chunks, obstacles, pickups, particles). Zero allocations per frame in the run loop.
- **Seeded RNG** (`mulberry32`) so runs and patterns are reproducible for testing and daily challenges.
- **Platform interfaces** (`IAds`, `IIAP`, `IHaptics`, `IAnalytics`) with web mock implementations now; Capacitor implementations later. Gameplay only talks to interfaces.
- **Fixed-step simulation** (60 Hz) with interpolated rendering.

## 4. Rendering and performance budget

- Draw calls < 150, triangles < 150k on screen, textures generated or tiny.
- Use `InstancedMesh` for repeated props (fences, coins, trash cans, lamp posts, trees).
- **Curved world**: inject a vertex bend via `onBeforeCompile` on a shared toon material (track bends down and slightly sideways into the horizon, Subway-Surfers-like but original).
- **Toon look**: `MeshToonMaterial` with a 3-step gradient map, plus inverted-hull outlines on characters only (cheap), warm rim light, colored fog matching the city sky gradient.
- Post FX: bloom (threshold high, subtle), vignette, SMAA. Auto-disable on low-end via a quality tier detected from first 120 frames' frame time.
- DPR clamp: `min(devicePixelRatio, 2)`, drop to 1.5 on Low tier.

## 5. Controls

- Swipe left/right: lane change (snappy, 0.12 s, with squash/stretch).
- Swipe up: jump. Swipe up while airborne near a wall/fence: **wall-kick** (cat-only move).
- Swipe down: slide/roll. Swipe down in air: fast-drop.
- Double tap: activate the equipped **Active Ability** (when charged).
- Keyboard fallback for desktop testing: arrows/WASD, Space = ability, P = pause.
- Input buffer of 150 ms so early swipes still register.

## 6. Asset registry (procedural first, files optional)

`src/procgen/registry.ts` maps logical ids (`cat.body`, `dog.bulldog`, `prop.trashcan`, `music.rome`) to a factory. If `public/models/<id>.glb` or `public/audio/<id>.mp3` exists, load it; otherwise build procedurally. Future CC0 packs (Kenney, Quaternius) or a commissioned artist can be dropped in without code changes.

## 7. Visual identity rules (so it does not look AI-generated)

- Hand-made sketchbook UI: off-white paper background, ink-outline buttons with slight irregular wobble (SVG filter `feTurbulence` + `feDisplacementMap`, very subtle), stamp-style badges, washi-tape labels.
- Fonts (OFL, self-hosted later, Google Fonts for now): **Fredoka** for headings, **Nunito** for body. No default system look.
- One strong palette per city (defined in `data/cities.ts`). Never rainbow-everything.
- Every button: press squash (scale 0.94), release overshoot, haptic tick, soft "pop" SFX.
- Never use emoji in UI. Use drawn SVG icons (inline, hand-authored paths).
- Characters have personality via animation (ear flicks, tail sway, blink, idle grooming), not detail.

## 8. Definition of Done per milestone

- `npm run build` passes, `npm test` passes.
- Feature works with keyboard on desktop and touch on mobile viewport.
- No console errors.
- 60 fps on desktop with 6x CPU throttle sanity check skipped if not possible; at minimum, no per-frame allocations in new code.
- Commit with message `M<n>: <summary>` and push.
- Append a short line to `docs/DECISIONS.md` for any judgment call.

## 9. Milestones (do them in order, one per session)

| # | Milestone | Must include |
|---|---|---|
| M0 | Scaffold and deploy | Vite + TS + Three, folders, Actions deploy to GitHub Pages, PWA manifest, blank scene with curved-world test |
| M1 | Core runner | Procedural cat with run/jump/slide anim, 3 lanes, chunked infinite track for "Maple Lane", camera rig, speed ramp, swipe input |
| M2 | Obstacles and pickups | Pattern library (20+ patterns), collisions, coins, collectible loot items, near-miss detection, combo meter, score |
| M3 | The chase | Dog pack (Duke + 2 pups) behind the cat, stumble-then-caught logic, crash anim, revive flow (ad mock), game over screen |
| M4 | Power-ups and abilities | All Tier 1 power-ups from design doc, Roomba board, active ability, hidden routes (rooftop/fence layer) |
| M5 | Meta and economy | Save system, Home screen (diegetic), Vendor (Old Tom), Upgrades, Wardrobe with 6 skins + 10 accessories, missions, daily reward |
| M6 | Story and tutorial | 3-panel animated comic intro, interactive tutorial run, first-session flow |
| M7 | Juice pass | Particles, procedural music per city, SFX, post FX, haptics, screen shake, slow-mo near misses, menu animations |
| M8 | City #2 + World Tour | Rome biome, map screen, city unlock, city-specific dogs/props/loot |
| M9 | Native + monetization | Capacitor iOS, real haptics, AdMob/AppLovin rewarded ads, StoreKit IAP via plugin, ATT prompt |

Tonight's target: **M0 through M7** = a beautiful, complete, playable single-city game on iPhone via URL.
