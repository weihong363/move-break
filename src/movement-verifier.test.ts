import { describe, expect, it } from 'vitest';
import { createMovementVerifier, type MovementConfig } from './movement-verifier';
import type { PoseFrame, PoseLandmark } from './types';

const config: MovementConfig = {
  baselineDurationMs: 300,
  inactivityDurationMs: 300,
  movementDurationMs: 400,
  smoothingWindow: 2,
  riseThreshold: 0.15,
  returnThreshold: 0.15,
  movementThreshold: 0.001,
  consecutiveRiseFrames: 3,
};

const frameAt = (timestamp: number, offsetY = 0, offsetX = 0, visible = true): PoseFrame => {
  const landmarks: PoseLandmark[] = Array.from({ length: 25 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  [[11, 0.4, 0.4], [12, 0.6, 0.4], [13, 0.35, 0.5], [14, 0.65, 0.5], [15, 0.3, 0.6], [16, 0.7, 0.6], [23, 0.42, 0.6], [24, 0.58, 0.6]]
    .forEach(([index, x, y]) => {
      landmarks[index] = { x: x + offsetX, y: y + offsetY, visibility: visible ? 1 : 0 };
    });
  return { timestamp, landmarks };
};

const reachPrompt = () => {
  const verifier = createMovementVerifier(config);
  [0, 100, 200, 300, 400, 500, 600].forEach((timestamp) => verifier.processFrame(frameAt(timestamp)));
  return verifier;
};

const frameWithHandMotion = (timestamp: number, handOffsetX: number): PoseFrame => {
  const frame = frameAt(timestamp);
  frame.landmarks[15].x += handOffsetX;
  return frame;
};

const frameWithShouldersOnly = (timestamp: number): PoseFrame => {
  const frame = frameAt(timestamp);
  frame.landmarks.forEach((landmark, index) => {
    if (index !== 11 && index !== 12) landmark.visibility = 0;
  });
  return frame;
};

describe('movement verifier', () => {
  it('keeps seated inactivity time through hand movement', () => {
    const verifier = createMovementVerifier(config);
    [0, 100, 200, 300, 400].forEach((timestamp) => verifier.processFrame(frameAt(timestamp)));
    verifier.processFrame(frameWithHandMotion(500, 0.2));
    expect(verifier.processFrame(frameAt(600)).phase).toBe('awaiting-rise');
  });

  it('establishes a baseline using only the visible shoulders', () => {
    const verifier = createMovementVerifier(config);
    [0, 100, 200, 300, 400, 500, 600].forEach((timestamp) => verifier.processFrame(frameWithShouldersOnly(timestamp)));
    expect(verifier.processFrame(frameWithShouldersOnly(700)).phase).toBe('awaiting-rise');
  });

  it('keeps monitoring through torso shifts until the reminder is due', () => {
    const verifier = createMovementVerifier(config);
    [0, 100, 200, 300].forEach((timestamp) => verifier.processFrame(frameAt(timestamp)));
    expect(verifier.processFrame(frameAt(400, -0.2)).phase).toBe('monitoring');
    expect(verifier.processFrame(frameAt(500, -0.2)).phase).toBe('monitoring');
    expect(verifier.processFrame(frameAt(600, -0.2)).phase).toBe('awaiting-rise');
  });

  it('requires several stable rise frames before entering movement', () => {
    const verifier = reachPrompt();
    expect(verifier.processFrame(frameAt(700, -0.2)).phase).toBe('awaiting-rise');
    expect(verifier.processFrame(frameAt(800, -0.2)).phase).toBe('awaiting-rise');
    expect(verifier.processFrame(frameAt(900, -0.2)).phase).toBe('moving');
  });

  it('pauses on invalid tracking and preserves accumulated movement time', () => {
    const verifier = reachPrompt();
    [700, 800, 900].forEach((timestamp) => verifier.processFrame(frameAt(timestamp, -0.2)));
    const active = verifier.processFrame(frameAt(1_000, -0.2, 0.04));
    const paused = verifier.processFrame(frameAt(1_100, -0.2, 0.04, false));
    const resumed = verifier.processFrame(frameAt(1_200, -0.2, 0.08));
    expect(active.movementProgress).toBeGreaterThan(0);
    expect(paused.phase).toBe('paused-tracking');
    expect(resumed.movementProgress).toBeGreaterThanOrEqual(active.movementProgress);
  });

  it('keeps prior progress through low-motion frames and completes after valid movement time', () => {
    const verifier = reachPrompt();
    [700, 800, 900].forEach((timestamp) => verifier.processFrame(frameAt(timestamp, -0.2)));
    verifier.processFrame(frameAt(1_000, -0.2, 0.04));
    const pausedMotion = verifier.processFrame(frameAt(1_100, -0.2, 0.04));
    const snapshots = [1_200, 1_300, 1_400, 1_500, 1_600]
      .map((timestamp, index) => verifier.processFrame(frameAt(timestamp, -0.2, 0.08 + index * 0.04)));
    expect(pausedMotion.movementProgress).toBeGreaterThan(0);
    expect(snapshots.some((snapshot) => snapshot.phase === 'completed')).toBe(true);
  });

  it('waits for the user to return to the original seated baseline after completion', () => {
    const verifier = reachPrompt();
    [700, 800, 900].forEach((timestamp) => verifier.processFrame(frameAt(timestamp, -0.2)));
    [1_000, 1_100, 1_200, 1_300, 1_400].forEach((timestamp, index) => verifier.processFrame(frameAt(timestamp, -0.2, 0.04 + index * 0.04)));
    expect(verifier.processFrame(frameAt(1_500, -0.2, 0.28)).phase).toBe('awaiting-return');
    [1_600, 1_700, 1_800, 1_900].forEach((timestamp) => verifier.processFrame(frameAt(timestamp)));
    expect(verifier.processFrame(frameAt(2_000)).phase).toBe('monitoring');
  });
});
