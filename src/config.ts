export const demoConfig = {
  baselineDurationMs: 1_500,
  inactivityDurationSeconds: 5,
  inactivityDurationOptions: [5, 10, 20],
  movementDurationMs: 4_000,
  smoothingWindow: 4,
  riseThreshold: 0.16,
  returnThreshold: 0.16,
  movementThreshold: 0.025,
  consecutiveRiseFrames: 3,
} as const;
