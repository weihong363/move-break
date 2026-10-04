import type { PoseFrame, PoseLandmark } from './types';

export type RoutineMovement = 'overhead-reach' | 'side-bend-left' | 'side-bend-right' | 'torso-rotation';
export type RoutinePhase = 'demo' | 'holding' | 'movement-complete' | 'complete' | 'paused-tracking';

export type RoutineConfig = {
  holdDurationMs: number;
  smoothingWindow: number;
  overheadReachThreshold: number;
  sideBendThreshold: number;
  rotationWidthThreshold: number;
  rotationDepthThreshold: number;
};

export type RoutineSnapshot = {
  phase: RoutinePhase;
  movement: RoutineMovement;
  movementIndex: number;
  instruction: string;
  progress: number;
  poseMatched: boolean;
  rotationStep?: 'first-side' | 'other-side';
};

type Point = { x: number; y: number; z?: number };
type Metrics = { leftShoulder: Point; rightShoulder: Point; leftWrist?: Point; rightWrist?: Point; shoulderCenter: Point; hipCenter?: Point; shoulderWidth: number; depthDelta?: number };

const movements: RoutineMovement[] = ['overhead-reach', 'side-bend-left', 'side-bend-right', 'torso-rotation'];
const indexes = { leftShoulder: 11, rightShoulder: 12, leftWrist: 15, rightWrist: 16, leftHip: 23, rightHip: 24 };
const visible = (landmark: PoseLandmark | undefined): landmark is PoseLandmark => Boolean(landmark && (landmark.visibility ?? 1) >= 0.55);
const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;
const midpoint = (left: Point, right: Point): Point => ({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 });
const distance = (left: Point, right: Point) => Math.hypot(left.x - right.x, left.y - right.y);

const smooth = (frames: PoseFrame[], index: number): Point | undefined => {
  const points = frames.map((frame) => frame.landmarks[index]).filter(visible);
  return points.length === 0 ? undefined : { x: average(points.map((point) => point.x)), y: average(points.map((point) => point.y)), z: points.every((point) => point.z !== undefined) ? average(points.map((point) => point.z ?? 0)) : undefined };
};

const metricsFor = (frames: PoseFrame[], movement: RoutineMovement): Metrics | undefined => {
  const latest = frames.at(-1)!.landmarks;
  if (!visible(latest[indexes.leftShoulder]) || !visible(latest[indexes.rightShoulder])) return undefined;
  const leftShoulder = smooth(frames, indexes.leftShoulder)!;
  const rightShoulder = smooth(frames, indexes.rightShoulder)!;
  const shoulderWidth = distance(leftShoulder, rightShoulder);
  if (shoulderWidth < 0.02) return undefined;
  const leftWrist = visible(latest[indexes.leftWrist]) ? smooth(frames, indexes.leftWrist) : undefined;
  const rightWrist = visible(latest[indexes.rightWrist]) ? smooth(frames, indexes.rightWrist) : undefined;
  if (movement === 'overhead-reach' && (!leftWrist || !rightWrist)) return undefined;
  const leftHip = visible(latest[indexes.leftHip]) ? smooth(frames, indexes.leftHip) : undefined;
  const rightHip = visible(latest[indexes.rightHip]) ? smooth(frames, indexes.rightHip) : undefined;
  return { leftShoulder, rightShoulder, leftWrist, rightWrist, shoulderCenter: midpoint(leftShoulder, rightShoulder), hipCenter: leftHip && rightHip ? midpoint(leftHip, rightHip) : undefined, shoulderWidth, depthDelta: leftShoulder.z !== undefined && rightShoulder.z !== undefined ? leftShoulder.z - rightShoulder.z : undefined };
};

// Anatomical left follows MediaPipe's left shoulder, independent of preview mirroring.
const bendSignals = (metrics: Metrics) => ({
  shift: metrics.hipCenter ? (metrics.shoulderCenter.x - metrics.hipCenter.x) / metrics.shoulderWidth * Math.sign(metrics.leftShoulder.x - metrics.rightShoulder.x) : undefined,
  tilt: (metrics.leftShoulder.y - metrics.rightShoulder.y) / metrics.shoulderWidth,
});

const instructionFor = (movement: RoutineMovement, rotationStep?: 'first-side' | 'other-side') => {
  if (movement === 'overhead-reach') return 'Reach up';
  if (movement === 'side-bend-left') return 'Bend left';
  if (movement === 'side-bend-right') return 'Bend right';
  return rotationStep === 'other-side' ? 'Turn the other way' : 'Turn your upper body';
};

export const createRoutineVerifier = (config: RoutineConfig) => {
  let samples: PoseFrame[] = [];
  let index = 0;
  let holdMs = 0;
  let lastTimestamp: number | undefined;
  let baselineWidth: number | undefined;
  let baselineBend: ReturnType<typeof bendSignals> | undefined;
  let rotationDirection: -1 | 1 | undefined;
  let rotationStep: 'first-side' | 'other-side' = 'first-side';
  let phase: RoutinePhase = 'demo';

  const reset = () => { samples = []; index = 0; holdMs = 0; lastTimestamp = undefined; baselineWidth = undefined; baselineBend = undefined; rotationDirection = undefined; rotationStep = 'first-side'; phase = 'demo'; };
  const current = () => movements[Math.min(index, movements.length - 1)];
  const snapshot = (nextPhase: RoutinePhase, poseMatched = false): RoutineSnapshot => ({ phase: nextPhase, poseMatched, movement: current(), movementIndex: Math.min(index, movements.length - 1), instruction: instructionFor(current(), rotationStep), progress: Math.min(1, holdMs / config.holdDurationMs), rotationStep: current() === 'torso-rotation' ? rotationStep : undefined });

  const matches = (metrics: Metrics) => {
    const movement = current();
    if (movement === 'overhead-reach') return metrics.leftWrist !== undefined && metrics.rightWrist !== undefined && (metrics.leftShoulder.y - metrics.leftWrist.y) / metrics.shoulderWidth >= config.overheadReachThreshold && (metrics.rightShoulder.y - metrics.rightWrist.y) / metrics.shoulderWidth >= config.overheadReachThreshold;
    if (movement === 'side-bend-left' || movement === 'side-bend-right') {
      const signals = bendSignals(metrics);
      const direction = movement === 'side-bend-left' ? 1 : -1;
      const tilt = signals.tilt - (baselineBend?.tilt ?? 0);
      const shift = signals.shift !== undefined && baselineBend?.shift !== undefined ? signals.shift - baselineBend.shift : 0;
      return direction * tilt >= config.sideBendThreshold || direction * shift >= config.sideBendThreshold;
    }
    const depthDirection = metrics.depthDelta === undefined || Math.abs(metrics.depthDelta) / metrics.shoulderWidth < config.rotationDepthThreshold ? undefined : (metrics.depthDelta < 0 ? -1 : 1);
    const widthChanged = baselineWidth !== undefined && metrics.shoulderWidth / baselineWidth <= config.rotationWidthThreshold;
    const direction = depthDirection ?? (widthChanged ? 1 : undefined);
    if (!direction) return false;
    if (rotationDirection === undefined) rotationDirection = direction;
    return rotationStep === 'first-side' ? direction === rotationDirection : direction === -rotationDirection;
  };

  const processFrame = (frame: PoseFrame): RoutineSnapshot => {
    if (phase === 'complete' || phase === 'movement-complete') return snapshot(phase);
    const elapsed = lastTimestamp === undefined ? 0 : Math.max(0, frame.timestamp - lastTimestamp);
    lastTimestamp = frame.timestamp;
    samples = [...samples, frame].slice(-config.smoothingWindow);
    const metrics = metricsFor(samples, current());
    if (!metrics) { lastTimestamp = undefined; return snapshot('paused-tracking'); }
    baselineWidth ??= metrics.shoulderWidth;
    baselineBend ??= bendSignals(metrics);
    if (!matches(metrics)) return snapshot(phase === 'demo' ? 'demo' : 'holding');
    holdMs += elapsed;
    phase = 'holding';
    if (holdMs < config.holdDurationMs) return snapshot(phase, true);
    if (current() === 'torso-rotation' && rotationStep === 'first-side') { holdMs = 0; rotationStep = 'other-side'; return snapshot('demo'); }
    phase = 'movement-complete';
    return snapshot(phase);
  };

  const advance = () => {
    if (phase !== 'movement-complete') return snapshot(phase);
    index += 1;
    holdMs = 0;
    rotationDirection = undefined;
    rotationStep = 'first-side';
    phase = index >= movements.length ? 'complete' : 'demo';
    return snapshot(phase);
  };

  return { reset, processFrame, advance };
};
