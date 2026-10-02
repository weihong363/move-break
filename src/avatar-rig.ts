import type { PoseFrame, PoseLandmark } from './types';

type Point = { x: number; y: number };
export type ArmTransform = { x: number; y: number; angle: number; length: number };

export type AvatarRigPose = {
  posture: 'seated' | 'standing';
  root: Point;
  torsoScale: number;
  head: Point;
  leftUpperArm: ArmTransform;
  leftLowerArm: ArmTransform;
  rightUpperArm: ArmTransform;
  rightLowerArm: ArmTransform;
};

const leftShoulder = 11;
const rightShoulder = 12;
const leftElbow = 13;
const rightElbow = 14;
const leftWrist = 15;
const rightWrist = 16;
const leftHip = 23;
const rightHip = 24;
const nose = 0;

const visible = (landmark: PoseLandmark | undefined) => landmark && (landmark.visibility ?? 1) >= 0.5;
const midpoint = (left: Point, right: Point): Point => ({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 });
const distance = (left: Point, right: Point) => Math.hypot(left.x - right.x, left.y - right.y);
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

const averagePoint = (points: Point[]): Point => ({
  x: points.reduce((total, point) => total + point.x, 0) / points.length,
  y: points.reduce((total, point) => total + point.y, 0) / points.length,
});

const averageLandmark = (frames: PoseFrame[], index: number): Point | undefined => {
  const points = frames.map((frame) => frame.landmarks[index]).filter(visible);
  return points.length === 0 ? undefined : averagePoint(points);
};

const segmentTransform = (start: Point, end: Point) => {
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI - 90;
  const length = clamp(distance(start, end), 20, 72) / 50;
  return { x: start.x, y: start.y, angle, length };
};

const toRigPoint = (point: Point, center: Point, bodyScale: number): Point => ({
  x: (point.x - center.x) / bodyScale * 56,
  y: (point.y - center.y) / bodyScale * 56,
});

export const createAvatarRigDriver = (smoothingWindow = 4) => {
  let frames: PoseFrame[] = [];
  let baselineTorsoY: number | undefined;
  let baselineBodyScale: number | undefined;

  const reset = () => {
    frames = [];
    baselineTorsoY = undefined;
    baselineBodyScale = undefined;
  };

  const update = (frame: PoseFrame): AvatarRigPose | undefined => {
    if (!visible(frame.landmarks[leftShoulder]) || !visible(frame.landmarks[rightShoulder])) return undefined;
    frames = [...frames, frame].slice(-smoothingWindow);
    const leftShoulderPoint = averageLandmark(frames, leftShoulder);
    const rightShoulderPoint = averageLandmark(frames, rightShoulder);
    const leftElbowPoint = averageLandmark(frames, leftElbow);
    const rightElbowPoint = averageLandmark(frames, rightElbow);
    const leftWristPoint = averageLandmark(frames, leftWrist);
    const rightWristPoint = averageLandmark(frames, rightWrist);
    if (!leftShoulderPoint || !rightShoulderPoint || !leftElbowPoint || !rightElbowPoint || !leftWristPoint || !rightWristPoint) return undefined;

    const shoulderCenter = midpoint(leftShoulderPoint, rightShoulderPoint);
    const hips = [averageLandmark(frames, leftHip), averageLandmark(frames, rightHip)].filter((point): point is Point => point !== undefined);
    const torsoCenter = hips.length === 2 ? midpoint(shoulderCenter, midpoint(hips[0], hips[1])) : shoulderCenter;
    const bodyScale = hips.length === 2 ? distance(leftShoulderPoint, hips[0]) : distance(leftShoulderPoint, rightShoulderPoint);
    if (bodyScale === 0) return undefined;

    baselineTorsoY ??= torsoCenter.y;
    baselineBodyScale ??= bodyScale;
    const posture = (baselineTorsoY - torsoCenter.y) / bodyScale > 0.14 ? 'standing' : 'seated';
    const headSource = averageLandmark(frames, nose) ?? { x: shoulderCenter.x, y: shoulderCenter.y - bodyScale * 0.7 };
    const rigShoulders = [leftShoulderPoint, rightShoulderPoint].map((point) => toRigPoint(point, shoulderCenter, bodyScale));
    const rigElbows = [leftElbowPoint, rightElbowPoint].map((point) => toRigPoint(point, shoulderCenter, bodyScale));
    const rigWrists = [leftWristPoint, rightWristPoint].map((point) => toRigPoint(point, shoulderCenter, bodyScale));

    return {
      posture,
      root: { x: 120, y: posture === 'standing' ? 118 : 137 },
      torsoScale: clamp(bodyScale / baselineBodyScale, 0.84, 1.18),
      head: toRigPoint(headSource, shoulderCenter, bodyScale),
      leftUpperArm: segmentTransform(rigShoulders[0], rigElbows[0]),
      leftLowerArm: segmentTransform(rigElbows[0], rigWrists[0]),
      rightUpperArm: segmentTransform(rigShoulders[1], rigElbows[1]),
      rightLowerArm: segmentTransform(rigElbows[1], rigWrists[1]),
    };
  };

  return { reset, update };
};
