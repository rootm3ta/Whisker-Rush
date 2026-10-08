/** M0 curved-world test scene tunables. Replaced by the real track in M1. */
export const TEST_SCENE = {
  seed: 1337,
  groundLength: 300,
  groundWidth: 9,
  groundSegments: 120,
  laneWidth: 3,
  stripeWidth: 0.12,
  boxCount: 36,
  boxSpacing: 8,
  sideBoxCount: 40,
  sideOffset: 9,
  scrollSpeed: 14,
  cameraPos: [0, 4.2, 7.5] as const,
  cameraLookAt: [0, 1, -12] as const,
} as const;
