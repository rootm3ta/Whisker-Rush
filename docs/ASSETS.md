# Assets

Everything in the game is generated in code. This file records where external assets could come
from, their licences, and how they would be dropped in.

## Characters (S4)

### What was tried

Step 1 of S4 was to source CC0 (public domain) rigged and animated animal models.

| Source | Result |
|---|---|
| poly.pizza (hosts Quaternius CC0 models) | Blocked by the build machine's network policy (HTTP 403). |
| quaternius.com | Reachable, but the packs download through itch.io / Google Drive pages, not direct files. |
| GitHub mirrors | No CC0 rigged cat or dog GLB found. |

So the characters are fully procedural (Step 2): smooth signed-distance bodies, polygonised once
at load (surface nets), decimated to about 4k triangles, skinned to a bone skeleton with
distance-based weights, coloured per vertex. See `src/procgen/sdf.ts`, `character.ts`, `cat.ts`,
`dog.ts`, and the `?lineup` dev view.

### If you want to try real models later

Download by hand (only CC0, keep the licence file next to the models):

- **Quaternius "Ultimate Animated Animal Pack"** or **"Animated Animal Pack"** (CC0): quaternius.com > Packs.
  Look for a dog (Shiba Inu / Husky style) and any cat in the pack, export as `.glb`.
- **Kenney "Animal Pack Redux"** (CC0, kenney.nl): static, not rigged; usable for props or the Home window only.

Planned drop-in paths (logical ids from CLAUDE.md section 6):

```
public/models/cat.body.glb        Miso's body (clips named Idle, Run, Jump, Slide)
public/models/dog.duke.glb        Duke
public/models/dog.pickle.glb      Pickle
public/models/dog.bolt.glb        Bolt
public/models/dog.shiba.glb       Shiba Inu (Tokyo)
public/models/dog.akita.glb       Akita (Tokyo)
public/models/dog.nagazi.glb      Georgian Shepherd (Tbilisi)
public/models/dog.streetDog.glb   Tbilisi street dog
```

Note: the loader that swaps these in (`src/procgen/registry.ts`) is not built yet. Today the
procedural models are always used; a GLB character would also need its animation clips mapped
onto the game's run, jump, slide and idle states.

## Licences in use

- Fonts: Fredoka and Nunito (SIL Open Font License), via Google Fonts.
- Everything else (models, textures, music, sound effects): generated in code, original.
