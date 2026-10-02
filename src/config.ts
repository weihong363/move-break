export const demoConfig = {
  workDurationSeconds: 10,
  workDurationOptions: [1, 10, 25, 60],
  baselineDurationMs: 1_500,
  movementDurationMs: 4_000,
  smoothingWindow: 4,
  minimumUsableLandmarks: 4,
  riseThreshold: 0.16,
  movementThreshold: 0.025,
  consecutiveRiseFrames: 3,
} as const;
