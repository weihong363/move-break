import type { PoseFrame, PoseLandmark } from './types';

export type VerifierPhase = 'baseline' | 'monitoring' | 'awaiting-rise' | 'routine' | 'awaiting-return' | 'paused-tracking' | 'completed';

export type MovementConfig = {
  baselineDurationMs: number;
  inactivityDurationMs: number;
  smoothingWindow: number;
  riseThreshold: number;
  returnThreshold: number;
  consecutiveRiseFrames: number;
  seatedReturnDurationMs: number;
  seatedReturnMotionThreshold: number;
  maxFrameGapMs: number;
};

export type VerifierSnapshot = {
  phase: VerifierPhase;
  baselineProgress: number;
  inactivityProgress: number;
  movementProgress: number;
};

type Metrics = { torsoY: number; bodyScale: number; movement: number; armMovement: number; shoulderWidth: number; shoulderMovement: number };

const upperBodyIndexes = [11, 12, 13, 14, 15, 16, 23, 24];
const torsoIndexes = [11, 12, 23, 24];
const shoulderIndexes = [11, 12];
const armIndexes = [13, 14, 15, 16];

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
  let baselineShoulderWidth: number | undefined;
  let riseFrames = 0;
  let returnFrames = 0;
  let returnElapsedMs = 0;

  const snapshot = (nextPhase: VerifierPhase): VerifierSnapshot => ({
    phase: nextPhase,
    baselineProgress: Math.min(1, baselineElapsedMs / config.baselineDurationMs),
    inactivityProgress: Math.min(1, inactivityElapsedMs / config.inactivityDurationMs),
    movementProgress: 0,
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
    const armDisplacements = armIndexes.flatMap((index) => {
      const current = byIndex.get(index);
      const previous = smooth(previousFrames, index);
      return current && previous ? [distance(current, previous)] : [];
    });
    const movement = displacements.length === 0 ? 0 : average(displacements) / bodyScale;
    const armMovement = armDisplacements.length === 0 ? 0 : average(armDisplacements) / bodyScale;
    const shoulderDisplacements = shoulderIndexes.flatMap((index) => {
      const current = byIndex.get(index);
      const previous = smooth(previousFrames, index);
      return current && previous ? [distance(current, previous)] : [];
    });
    const shoulderMovement = shoulderDisplacements.length ? average(shoulderDisplacements) / bodyScale : 0;
    return { torsoY, bodyScale, movement, armMovement, shoulderWidth: distance(shoulders[0], shoulders[1]), shoulderMovement };
  };

  const processFrame = (frame: PoseFrame): VerifierSnapshot => {
    const gapMs = lastTimestamp === undefined ? 0 : Math.max(0, frame.timestamp - lastTimestamp);
    const elapsedMs = gapMs <= config.maxFrameGapMs ? gapMs : 0;
    if (gapMs > config.maxFrameGapMs) { samples = []; riseFrames = 0; returnFrames = 0; returnElapsedMs = 0; }
    lastTimestamp = frame.timestamp;
    if (!shouldersVisible(frame.landmarks)) {
      lastTimestamp = undefined; samples = []; riseFrames = 0; returnFrames = 0; returnElapsedMs = 0;
      return snapshot('paused-tracking');
    }

    samples = [...samples, frame].slice(-config.smoothingWindow);
    const metrics = calculateMetrics();
    if (!metrics) { lastTimestamp = undefined; riseFrames = 0; returnFrames = 0; returnElapsedMs = 0; return snapshot('paused-tracking'); }

    if (phase === 'baseline') {
      baselineElapsedMs += elapsedMs;
      if (baselineElapsedMs >= config.baselineDurationMs) {
        baselineTorsoY = metrics.torsoY;
        baselineShoulderWidth = metrics.shoulderWidth;
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
      if (riseFrames >= config.consecutiveRiseFrames) phase = 'routine';
      return snapshot(phase);
    }

    if (phase === 'routine') return snapshot(phase);

    if (phase === 'awaiting-return' && baselineTorsoY !== undefined) {
      const normalizedReturn = Math.abs(metrics.torsoY - baselineTorsoY) / metrics.bodyScale;
      const settled = normalizedReturn <= config.returnThreshold && metrics.shoulderMovement <= config.seatedReturnMotionThreshold;
      returnFrames = settled ? returnFrames + 1 : 0;
      returnElapsedMs = returnFrames > 1 ? returnElapsedMs + elapsedMs : 0;
      if (returnFrames >= config.consecutiveRiseFrames && returnElapsedMs >= config.seatedReturnDurationMs) {
        inactivityElapsedMs = 0;
        movementElapsedMs = 0;
        riseFrames = 0;
        returnFrames = 0;
        returnElapsedMs = 0;
        lastTimestamp = frame.timestamp;
        phase = 'monitoring';
      }
      return snapshot(phase);
    }

    return snapshot(phase);
  };

  const completeRoutine = () => {
    if (phase === 'routine') { phase = 'awaiting-return'; returnFrames = 0; returnElapsedMs = 0; }
  };

  return { processFrame, completeRoutine };
};
