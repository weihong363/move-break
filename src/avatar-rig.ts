import type { PoseFrame, PoseLandmark } from './types';

type Point = { x: number; y: number };
export type RigTransform = { x: number; y: number; rotate: number; scale: number };

export type AvatarRigPose = {
  head: RigTransform;
  torso: RigTransform;
  leftUpperArm: RigTransform;
  leftForearm: RigTransform;
  rightUpperArm: RigTransform;
  rightForearm: RigTransform;
};

type ArmPoints = { shoulder: Point; elbow: Point; wrist: Point };
type RigBaseline = { center: Point; scale: number; torsoAngle: number; head: Point; left: ArmPoints; right: ArmPoints };

const indexes = { nose: 0, leftEye: 2, rightEye: 5, leftEar: 7, rightEar: 8, leftShoulder: 11, rightShoulder: 12, leftElbow: 13, rightElbow: 14, leftWrist: 15, rightWrist: 16 };
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const visible = (landmark: PoseLandmark | undefined): landmark is PoseLandmark => Boolean(landmark && (landmark.visibility ?? 1) >= 0.55);
const midpoint = (left: Point, right: Point): Point => ({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 });
const angle = (start: Point, end: Point) => Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
const distance = (left: Point, right: Point) => Math.hypot(left.x - right.x, left.y - right.y);
const neutral = (): RigTransform => ({ x: 0, y: 0, rotate: 0, scale: 1 });
const deadZone = (value: number, threshold: number) => Math.abs(value) < threshold ? 0 : value;
const point = (frame: PoseFrame, index: number): Point | undefined => visible(frame.landmarks[index]) ? frame.landmarks[index] : undefined;
const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

const smoothedPoint = (frames: PoseFrame[], index: number): Point | undefined => {
  const points = frames.map((frame) => point(frame, index)).filter((sample): sample is Point => sample !== undefined);
  return points.length === 0 ? undefined : { x: average(points.map((sample) => sample.x)), y: average(points.map((sample) => sample.y)) };
};

const headPoint = (frames: PoseFrame[]): Point | undefined => {
  const points = [indexes.nose, indexes.leftEye, indexes.rightEye, indexes.leftEar, indexes.rightEar]
    .map((index) => smoothedPoint(frames, index)).filter((sample): sample is Point => sample !== undefined);
  return points.length === 0 ? undefined : { x: average(points.map((sample) => sample.x)), y: average(points.map((sample) => sample.y)) };
};

const armPoints = (frames: PoseFrame[], side: 'left' | 'right'): ArmPoints | undefined => {
  const shoulder = smoothedPoint(frames, indexes[`${side}Shoulder`]);
  const elbow = smoothedPoint(frames, indexes[`${side}Elbow`]);
  const wrist = smoothedPoint(frames, indexes[`${side}Wrist`]);
  return shoulder && elbow && wrist ? { shoulder, elbow, wrist } : undefined;
};

const segment = (current: ArmPoints, baseline: ArmPoints, part: 'upper' | 'forearm'): RigTransform => {
  const start = part === 'upper' ? current.shoulder : current.elbow;
  const end = part === 'upper' ? current.elbow : current.wrist;
  const baseStart = part === 'upper' ? baseline.shoulder : baseline.elbow;
  const baseEnd = part === 'upper' ? baseline.elbow : baseline.wrist;
  return { ...neutral(), rotate: clamp(deadZone(angle(start, end) - angle(baseStart, baseEnd), 3), -28, 28) };
};

const torso = (center: Point, baseline: RigBaseline, torsoAngle: number): RigTransform => ({
  x: clamp(deadZone((center.x - baseline.center.x) / baseline.scale * 36, 1.5), -10, 10),
  y: clamp(deadZone((center.y - baseline.center.y) / baseline.scale * 36, 1.5), -16, 16),
  rotate: clamp(deadZone(torsoAngle - baseline.torsoAngle, 2), -7, 7), scale: 1,
});

const head = (current: Point, baseline: RigBaseline, ears: [Point | undefined, Point | undefined]): RigTransform => ({
  x: clamp(deadZone((current.x - baseline.head.x) / baseline.scale * 28, 1), -8, 8),
  y: clamp(deadZone((current.y - baseline.head.y) / baseline.scale * 28, 1), -5, 5),
  rotate: ears[0] && ears[1] ? clamp(deadZone(angle(ears[0], ears[1]) - baseline.torsoAngle, 2), -10, 10) : 0, scale: 1,
});

export const createAvatarRigDriver = (smoothingWindow = 4) => {
  let frames: PoseFrame[] = [];
  let baseline: RigBaseline | undefined;
  let pose: AvatarRigPose = { head: neutral(), torso: neutral(), leftUpperArm: neutral(), leftForearm: neutral(), rightUpperArm: neutral(), rightForearm: neutral() };

  const reset = () => { frames = []; baseline = undefined; pose = { head: neutral(), torso: neutral(), leftUpperArm: neutral(), leftForearm: neutral(), rightUpperArm: neutral(), rightForearm: neutral() }; };

  const update = (frame: PoseFrame): AvatarRigPose | undefined => {
    frames = [...frames, frame].slice(-smoothingWindow);
    const leftShoulder = smoothedPoint(frames, indexes.leftShoulder);
    const rightShoulder = smoothedPoint(frames, indexes.rightShoulder);
    if (!leftShoulder || !rightShoulder) return undefined;
    const center = midpoint(leftShoulder, rightShoulder);
    const scale = distance(leftShoulder, rightShoulder);
    const currentHead = headPoint(frames) ?? { x: center.x, y: center.y - scale * 0.7 };
    const left = armPoints(frames, 'left');
    const right = armPoints(frames, 'right');
    if (!baseline && left && right && scale > 0) baseline = { center, scale, torsoAngle: angle(leftShoulder, rightShoulder), head: currentHead, left, right };
    if (!baseline) return undefined;
    pose.torso = torso(center, baseline, angle(leftShoulder, rightShoulder));
    pose.head = head(currentHead, baseline, [smoothedPoint(frames, indexes.leftEar), smoothedPoint(frames, indexes.rightEar)]);
    if (left) { pose.leftUpperArm = segment(left, baseline.left, 'upper'); pose.leftForearm = segment(left, baseline.left, 'forearm'); }
    if (right) { pose.rightUpperArm = segment(right, baseline.right, 'upper'); pose.rightForearm = segment(right, baseline.right, 'forearm'); }
    return pose;
  };

  return { reset, update };
};
