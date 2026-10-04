export const demoConfig = {
  baselineDurationMs: 1_500,
  inactivityDurationSeconds: 5,
  inactivityDurationOptions: [5, 10, 20],
  routineHoldDurationMs: 3_000,
  routineAdvanceDelayMs: 650,
  routinePulseIntervalMs: 750,
  smoothingWindow: 4,
  riseThreshold: 0.16,
  returnThreshold: 0.16,
  consecutiveRiseFrames: 3,
} as const;
