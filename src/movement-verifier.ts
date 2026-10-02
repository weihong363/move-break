import type { PoseFrame, PoseLandmark } from './types';

export type VerifierPhase = 'baseline' | 'monitoring' | 'awaiting-rise' | 'moving' | 'awaiting-return' | 'paused-tracking' | 'completed';

export type MovementConfig = {
  baselineDurationMs: number;
  inactivityDurationMs: number;
  movementDurationMs: number;
  smoothingWindow: number;
  riseThreshold: number;
  returnThreshold: number;
  movementThreshold: number;
  consecutiveRiseFrames: number;
};

export type VerifierSnapshot = {
  phase: VerifierPhase;
  baselineProgress: number;
  inactivityProgress: number;
  movementProgress: number;
};

type Metrics = { torsoY: number; bodyScale: number; movement: number };

const upperBodyIndexes = [11, 12, 13, 14, 15, 16, 23, 24];
const torsoIndexes = [11, 12, 23, 24];
const shoulderIndexes = [11, 12];

const distance = (a: PoseLandmark, b: PoseLandmark) => Math.hypot(a.x - b.x, a.y - b.y);

const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

const visible = (landmark: PoseLandmark | undefined) => landmark && (landmark.visibility ?? 1) >= 0.5;

const smooth = (frames: PoseFrame[], index: number) => {
  const samples = frames.map((frame) => frame.landmarks[index]).filter(visible);
  if (samples.length === 0) return undefined;
  return { x: average(samples.map((sample) => sample.x)), y: average(samples.map((sample) => sample.y)) };
};

const shouldersVisible = (landmarks: PoseLandmark[]) => visible(landmarks[11]) && visible(landmarks[12]);

export const createMovementVerifier = (config: MovementConfig) => {
  let phase: Exclude<VerifierPhase, 'paused-tracking'> = 'baseline';
  let samples: PoseFrame[] = [];
  let lastTimestamp: number | undefined;
  let baselineElapsedMs = 0;
  let inactivityElapsedMs = 0;
  let movementElapsedMs = 0;
  let baselineTorsoY: number | undefined;
  let riseFrames = 0;
  let returnFrames = 0;

  const snapshot = (nextPhase: VerifierPhase): VerifierSnapshot => ({
    phase: nextPhase,
    baselineProgress: Math.min(1, baselineElapsedMs / config.baselineDurationMs),
    inactivityProgress: Math.min(1, inactivityElapsedMs / config.inactivityDurationMs),
    movementProgress: Math.min(1, movementElapsedMs / config.movementDurationMs),
  });

  const calculateMetrics = (): Metrics | undefined => {
    const smoothed = upperBodyIndexes.map((index) => smooth(samples, index));
    const byIndex = new Map(upperBodyIndexes.map((index, position) => [index, smoothed[position]]));
    const torso = torsoIndexes.map((index) => byIndex.get(index)).filter((point): point is PoseLandmark => point !== undefined);
    const shoulders = shoulderIndexes.map((index) => byIndex.get(index)).filter((point): point is PoseLandmark => point !== undefined);
    if (torso.length < 2 || shoulders.length < 2) return undefined;
    const torsoY = average(torso.map((point) => point.y));
    const hips = [byIndex.get(23), byIndex.get(24)].filter((point): point is PoseLandmark => point !== undefined);
    const bodyScale = hips.length === 2 ? distance(shoulders[0], hips[0]) : distance(shoulders[0], shoulders[1]);
    if (bodyScale === 0) return undefined;
    const previousFrames = samples.slice(0, -1);
    const displacements = upperBodyIndexes.flatMap((index) => {
      const current = byIndex.get(index);
      const previous = smooth(previousFrames, index);
      return current && previous ? [distance(current, previous)] : [];
    });
    const movement = displacements.length === 0 ? 0 : average(displacements) / bodyScale;
    return { torsoY, bodyScale, movement };
  };

  const processFrame = (frame: PoseFrame): VerifierSnapshot => {
    const elapsedMs = lastTimestamp === undefined ? 0 : Math.max(0, frame.timestamp - lastTimestamp);
    lastTimestamp = frame.timestamp;
    if (!shouldersVisible(frame.landmarks)) return snapshot('paused-tracking');

    samples = [...samples, frame].slice(-config.smoothingWindow);
    const metrics = calculateMetrics();
    if (!metrics) return snapshot('paused-tracking');

    if (phase === 'baseline') {
      baselineElapsedMs += elapsedMs;
      if (baselineElapsedMs >= config.baselineDurationMs) {
        baselineTorsoY = metrics.torsoY;
        phase = 'monitoring';
      }
      return snapshot(phase);
    }

    if (phase === 'monitoring') {
      inactivityElapsedMs += elapsedMs;
      if (inactivityElapsedMs >= config.inactivityDurationMs) {
        riseFrames = 0;
        phase = 'awaiting-rise';
      }
      return snapshot(phase);
    }

    if (phase === 'awaiting-rise' && baselineTorsoY !== undefined) {
      const normalizedRise = (baselineTorsoY - metrics.torsoY) / metrics.bodyScale;
      riseFrames = normalizedRise >= config.riseThreshold ? riseFrames + 1 : 0;
      if (riseFrames >= config.consecutiveRiseFrames) phase = 'moving';
      return snapshot(phase);
    }

    if (phase === 'moving') {
      if (metrics.movement >= config.movementThreshold) movementElapsedMs += elapsedMs;
      if (movementElapsedMs < config.movementDurationMs) return snapshot(phase);
      phase = 'awaiting-return';
      return snapshot('completed');
    }

    if (phase === 'awaiting-return' && baselineTorsoY !== undefined) {
      const normalizedReturn = Math.abs(metrics.torsoY - baselineTorsoY) / metrics.bodyScale;
      returnFrames = normalizedReturn <= config.returnThreshold ? returnFrames + 1 : 0;
      if (returnFrames >= config.consecutiveRiseFrames) {
        inactivityElapsedMs = 0;
        movementElapsedMs = 0;
        riseFrames = 0;
        returnFrames = 0;
        phase = 'monitoring';
      }
      return snapshot(phase);
    }

    return snapshot(phase);
  };

  return { processFrame };
};
