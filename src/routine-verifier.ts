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
  rotationStep?: 'first-side' | 'other-side';
};

type Point = { x: number; y: number; z?: number };
type Metrics = { leftShoulder: Point; rightShoulder: Point; leftWrist: Point; rightWrist: Point; shoulderCenter: Point; hipCenter: Point; shoulderWidth: number; depthDelta?: number };

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

const metricsFor = (frames: PoseFrame[]): Metrics | undefined => {
  const leftShoulder = smooth(frames, indexes.leftShoulder);
  const rightShoulder = smooth(frames, indexes.rightShoulder);
  const leftWrist = smooth(frames, indexes.leftWrist);
  const rightWrist = smooth(frames, indexes.rightWrist);
  const leftHip = smooth(frames, indexes.leftHip);
  const rightHip = smooth(frames, indexes.rightHip);
  if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist || !leftHip || !rightHip) return undefined;
  return { leftShoulder, rightShoulder, leftWrist, rightWrist, shoulderCenter: midpoint(leftShoulder, rightShoulder), hipCenter: midpoint(leftHip, rightHip), shoulderWidth: distance(leftShoulder, rightShoulder), depthDelta: leftShoulder.z !== undefined && rightShoulder.z !== undefined ? leftShoulder.z - rightShoulder.z : undefined };
};

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
  let rotationDirection: -1 | 1 | undefined;
  let rotationStep: 'first-side' | 'other-side' = 'first-side';
  let phase: RoutinePhase = 'demo';

  const reset = () => { samples = []; index = 0; holdMs = 0; lastTimestamp = undefined; baselineWidth = undefined; rotationDirection = undefined; rotationStep = 'first-side'; phase = 'demo'; };
  const current = () => movements[Math.min(index, movements.length - 1)];
  const snapshot = (nextPhase: RoutinePhase): RoutineSnapshot => ({ phase: nextPhase, movement: current(), movementIndex: Math.min(index, movements.length - 1), instruction: instructionFor(current(), rotationStep), progress: Math.min(1, holdMs / config.holdDurationMs), rotationStep: current() === 'torso-rotation' ? rotationStep : undefined });

  const matches = (metrics: Metrics) => {
    const movement = current();
    if (movement === 'overhead-reach') return (metrics.leftShoulder.y - metrics.leftWrist.y) / metrics.shoulderWidth >= config.overheadReachThreshold && (metrics.rightShoulder.y - metrics.rightWrist.y) / metrics.shoulderWidth >= config.overheadReachThreshold;
    const lean = (metrics.shoulderCenter.x - metrics.hipCenter.x) / metrics.shoulderWidth;
    if (movement === 'side-bend-left') return lean <= -config.sideBendThreshold;
    if (movement === 'side-bend-right') return lean >= config.sideBendThreshold;
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
    const metrics = metricsFor(samples);
    if (!metrics) return snapshot('paused-tracking');
    baselineWidth ??= metrics.shoulderWidth;
    if (!matches(metrics)) return snapshot(phase === 'demo' ? 'demo' : 'holding');
    holdMs += elapsed;
    phase = 'holding';
    if (holdMs < config.holdDurationMs) return snapshot(phase);
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
