import { describe, expect, it } from 'vitest';
import { createMovementVerifier, type MovementConfig } from './movement-verifier';
import type { PoseFrame, PoseLandmark } from './types';

const config: MovementConfig = { baselineDurationMs: 300, inactivityDurationMs: 300, smoothingWindow: 2, riseThreshold: 0.15, returnThreshold: 0.15, consecutiveRiseFrames: 3, seatedReturnDurationMs: 300, seatedReturnMotionThreshold: 0.025, maxFrameGapMs: 500 };

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
    [1_100, 1_200, 1_300, 1_400].forEach((timestamp) => verifier.processFrame(frameAt(timestamp)));
    expect(verifier.processFrame(frameAt(1_500))).toMatchObject({ phase: 'monitoring', inactivityProgress: 0 });
  });

  it('requires the full five seconds after each seated return across three cycles', () => {
    const verifier = createMovementVerifier({ ...config, smoothingWindow: 1, inactivityDurationMs: 5000 });
    [0, 100, 200, 300].forEach((time) => verifier.processFrame(frameAt(time)));
    let start = 300;
    for (let cycle = 0; cycle < 3; cycle += 1) {
      for (let elapsed = 100; elapsed < 5000; elapsed += 100) {
        expect(verifier.processFrame(frameAt(start + elapsed)).phase).toBe('monitoring');
      }
      expect(verifier.processFrame(frameAt(start + 5000)).phase).toBe('awaiting-rise');
      [5100, 5200, 5300].forEach((offset) => verifier.processFrame(frameAt(start + offset, -0.2)));
      verifier.completeRoutine();
      [5400, 5500, 5600].forEach((offset) => {
        expect(verifier.processFrame(frameAt(start + offset)).phase).toBe('awaiting-return');
      });
      expect(verifier.processFrame(frameAt(start + 5700))).toMatchObject({ phase: 'monitoring', inactivityProgress: 0 });
      start += 5700;
    }
  });

  it('does not count missing tracking or a long frame gap as seated time', () => {
    const verifier = createMovementVerifier({ ...config, inactivityDurationMs: 5000 });
    [0, 100, 200, 300].forEach((time) => verifier.processFrame(frameAt(time)));
    expect(verifier.processFrame(frameAt(400)).inactivityProgress).toBe(0.02);
    expect(verifier.processFrame(frameAt(10_000))).toMatchObject({ phase: 'monitoring', inactivityProgress: 0.02 });
    verifier.processFrame(frameAt(10_100, 0, false));
    expect(verifier.processFrame(frameAt(20_000))).toMatchObject({ phase: 'monitoring', inactivityProgress: 0.02 });
  });
});
