# Adding a city

A city is two files plus two registry lines.

1. **Data: `src/data/city/<id>.ts`** exporting a `CityDef` (see `src/data/city/types.ts`):
   palette (sky, fog, light, road colors plus anything your kit needs), district names,
   obstacle definitions, hand-authored patterns (use the helpers in `src/data/patterns.ts`),
   loot items (`city: '<id>'`), local dogs (two pups, one is the Pack Rush runner), boss
   vehicle id and what Duke throws, the music theme, unlock rules and the World Map pin.
2. **Look: `src/procgen/city/<id>.ts`** exporting a `CityKit` (see `src/procgen/city/kit.ts`):
   the street geometry, instanced roadside props with a `layout(ctx)` that places them per
   40 m chunk, one geometry factory per obstacle id, and the boss vehicle.
3. **Register**: add the id to `CityId` in `types.ts`, the city to `CITIES` and `WORLD_TOUR`
   in `src/data/cities.ts`, its obstacles/loot/dogs to the merges in `obstacles.ts`,
   `pickups.ts` and `dogs.ts`, and the kit to `KITS` in `src/procgen/cityKits.ts`.

Loot is append-only (`LOOT_ITEMS` order is stored in satchels). Hazard behaviours are flags on
obstacle definitions (`weaves`, `drops`), so new cities can reuse them without code.
`tests/spawner.test.ts` and `tests/worldtour.test.ts` check every city's patterns for fairness,
that every obstacle has a mesh, and that loot rolls stay in their city.
