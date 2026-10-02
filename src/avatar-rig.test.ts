import { describe, expect, it } from 'vitest';
import { createAvatarRigDriver } from './avatar-rig';
import type { PoseFrame, PoseLandmark } from './types';

const frameAt = (timestamp: number, rise = 0, leftArmOffset = 0): PoseFrame => {
  const landmarks: PoseLandmark[] = Array.from({ length: 25 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  [[0, 0.5, 0.2], [11, 0.4, 0.4], [12, 0.6, 0.4], [13, 0.32, 0.54], [14, 0.68, 0.54], [15, 0.26, 0.67], [16, 0.74, 0.67], [23, 0.42, 0.6], [24, 0.58, 0.6]]
    .forEach(([index, x, y]) => {
      landmarks[index] = { x: x + (index === 13 || index === 15 ? leftArmOffset : 0), y: y - rise, visibility: 1 };
    });
  return { timestamp, landmarks };
};

describe('avatar rig', () => {
  it('maps upper-body landmarks into seated and standing poses', () => {
    const rig = createAvatarRigDriver(1);
    expect(rig.update(frameAt(0))?.posture).toBe('seated');
    expect(rig.update(frameAt(100, 0.2))?.posture).toBe('standing');
  });

  it('updates arm transforms when the detected arm moves', () => {
    const rig = createAvatarRigDriver(1);
    const initial = rig.update(frameAt(0));
    const moved = rig.update(frameAt(100, 0, -0.16));
    expect(moved?.leftUpperArm).not.toEqual(initial?.leftUpperArm);
    expect(moved?.leftLowerArm).not.toEqual(initial?.leftLowerArm);
  });
});
