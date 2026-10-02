import { describe, expect, it } from 'vitest';
import { createMovementVerifier, type MovementConfig } from './movement-verifier';
import type { PoseFrame, PoseLandmark } from './types';

const config: MovementConfig = { baselineDurationMs: 300, inactivityDurationMs: 300, smoothingWindow: 2, riseThreshold: 0.15, returnThreshold: 0.15, consecutiveRiseFrames: 3 };

const frameAt = (timestamp: number, offsetY = 0, visible = true): PoseFrame => {
  const landmarks: PoseLandmark[] = Array.from({ length: 25 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  [[11, 0.4, 0.4], [12, 0.6, 0.4], [13, 0.35, 0.5], [14, 0.65, 0.5], [15, 0.3, 0.6], [16, 0.7, 0.6], [23, 0.42, 0.6], [24, 0.58, 0.6]]
    .forEach(([index, x, y]) => { landmarks[index] = { x, y: y + offsetY, visibility: visible ? 1 : 0 }; });
  return { timestamp, landmarks };
};

const reachRoutine = () => {
  const verifier = createMovementVerifier(config);
  [0, 100, 200, 300, 400, 500, 600].forEach((timestamp) => verifier.processFrame(frameAt(timestamp)));
  [700, 800, 900].forEach((timestamp) => verifier.processFrame(frameAt(timestamp, -0.2)));
  return verifier;
};

describe('movement verifier', () => {
  it('keeps seated inactivity time through small upper-body movement', () => {
    const verifier = createMovementVerifier(config);
    [0, 100, 200, 300, 400, 500].forEach((timestamp) => verifier.processFrame(frameAt(timestamp)));
    expect(verifier.processFrame(frameAt(600)).phase).toBe('awaiting-rise');
  });

  it('requires several rise frames before entering the routine', () => {
    const verifier = createMovementVerifier(config);
    [0, 100, 200, 300, 400, 500, 600].forEach((timestamp) => verifier.processFrame(frameAt(timestamp)));
    expect(verifier.processFrame(frameAt(700, -0.2)).phase).toBe('awaiting-rise');
    expect(verifier.processFrame(frameAt(800, -0.2)).phase).toBe('awaiting-rise');
    expect(verifier.processFrame(frameAt(900, -0.2)).phase).toBe('routine');
  });

  it('pauses routine entry on unreliable tracking', () => {
    const verifier = reachRoutine();
    expect(verifier.processFrame(frameAt(1_000, -0.2, false)).phase).toBe('paused-tracking');
  });

  it('waits for the original seated baseline after routine completion', () => {
    const verifier = reachRoutine();
    verifier.completeRoutine();
    expect(verifier.processFrame(frameAt(1_000, -0.2)).phase).toBe('awaiting-return');
    [1_100, 1_200, 1_300].forEach((timestamp) => verifier.processFrame(frameAt(timestamp)));
    expect(verifier.processFrame(frameAt(1_400)).phase).toBe('monitoring');
  });
});
