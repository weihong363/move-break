import { describe, expect, it } from 'vitest';
import { createAvatarRigDriver } from './avatar-rig';
import type { PoseFrame, PoseLandmark } from './types';

const frameAt = (timestamp: number, leftWristY = 0.67, torsoShift = 0): PoseFrame => {
  const landmarks: PoseLandmark[] = Array.from({ length: 25 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  [[0, 0.5, 0.2], [7, 0.44, 0.22], [8, 0.56, 0.22], [11, 0.4, 0.4], [12, 0.6, 0.4], [13, 0.32, 0.54], [14, 0.68, 0.54], [15, 0.26, leftWristY], [16, 0.74, 0.67]]
    .forEach(([index, x, y]) => { landmarks[index] = { x: x + torsoShift, y, visibility: 1 }; });
  return { timestamp, landmarks };
};

describe('avatar rig', () => {
  it('keeps the neutral pose stable', () => {
    const rig = createAvatarRigDriver(1);
    expect(rig.update(frameAt(0))).toMatchObject({ torso: { x: 0, y: 0, rotate: 0 }, leftUpperArm: { rotate: 0 } });
  });

  it('raises the left arm when the wrist rises', () => {
    const rig = createAvatarRigDriver(1);
    rig.update(frameAt(0));
    expect(rig.update(frameAt(100, 0.3))?.leftForearm.rotate).toBeLessThan(-3);
  });

  it('maps a visible head turn but freezes an unreliable limb', () => {
    const rig = createAvatarRigDriver(1);
    const initial = rig.update(frameAt(0));
    const turned = frameAt(100);
    [0, 7, 8].forEach((index) => { turned.landmarks[index].x += 0.08; });
    expect(rig.update(turned)?.head.x).toBeGreaterThan(0);
    const hiddenWrist = frameAt(200);
    hiddenWrist.landmarks[15].visibility = 0;
    expect(rig.update(hiddenWrist)?.leftForearm).toEqual(initial?.leftForearm);
  });

  it('uses a dead zone for small torso motion and clamps larger motion', () => {
    const rig = createAvatarRigDriver(1);
    rig.update(frameAt(0));
    expect(rig.update(frameAt(100, 0.67, 0.005))?.torso.x).toBe(0);
    expect(rig.update(frameAt(200, 0.67, 1))?.torso.x).toBe(10);
  });
});
