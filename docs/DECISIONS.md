# Decisions log

One line per judgment call.

- M0: Moved `GAME_DESIGN.md` from repo root into `docs/` to match the CLAUDE.md layout.
- M0: Vite `base` is `/Whisker-Rush/` (repo name); change it if the repo is renamed or a custom domain is used.
- M0: Curved world bends in view space (`y -= k*z^2`, `x += k2*z^2`) via `onBeforeCompile` on `MeshToonMaterial`, with shared uniforms so every material bends identically.
- M0: Geometry that must bend (ground, stripes) is subdivided along its length; bend is per-vertex.
- M0: Sky is a 2x256 canvas gradient used as `scene.background`; fog color equals the horizon color so the bend hides into the sky.
- M0: PWA icon is a single hand-authored SVG; PNG icons for iOS can be generated later.
- M0: Deploy workflow runs `npm test` before build; Pages source must be set to "GitHub Actions" in repo settings.
- M0: postprocessing, tone and gsap are installed but unused until later milestones (tree-shaken out for now).
