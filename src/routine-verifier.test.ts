import { describe, expect, it } from 'vitest';
import { createRoutineVerifier, type RoutineConfig } from './routine-verifier';
import type { PoseFrame, PoseLandmark } from './types';

const config: RoutineConfig = { holdDurationMs: 300, smoothingWindow: 1, overheadReachThreshold: 0.25, sideBendThreshold: 0.15, rotationWidthThreshold: 0.78, rotationDepthThreshold: 0.2 };

const frameAt = (timestamp: number): PoseFrame => {
  const landmarks: PoseLandmark[] = Array.from({ length: 25 }, () => ({ x: 0.5, y: 0.5, visibility: 0 }));
  [[11, 0.4, 0.4], [12, 0.6, 0.4], [15, 0.32, 0.62], [16, 0.68, 0.62], [23, 0.42, 0.62], [24, 0.58, 0.62]]
    .forEach(([index, x, y]) => { landmarks[index] = { x, y, visibility: 1 }; });
  return { timestamp, landmarks };
};

const held = (routine: ReturnType<typeof createRoutineVerifier>, makeFrame: (time: number) => PoseFrame, start = 0) => [start, start + 100, start + 200, start + 300].map((time) => routine.processFrame(makeFrame(time))).at(-1)!;
const reach = (time: number) => { const frame = frameAt(time); frame.landmarks[15].y = 0.2; frame.landmarks[16].y = 0.2; return frame; };
const leftBend = (time: number) => { const frame = frameAt(time); frame.landmarks[11].x -= 0.08; frame.landmarks[12].x -= 0.08; return frame; };
const rightBend = (time: number) => { const frame = frameAt(time); frame.landmarks[11].x += 0.08; frame.landmarks[12].x += 0.08; return frame; };
const rotate = (time: number, direction: -1 | 1) => { const frame = frameAt(time); frame.landmarks[11].z = direction * 0.08; frame.landmarks[12].z = -direction * 0.08; return frame; };

describe('routine verifier', () => {
  it('completes after the configured number of movements', () => {
    const routine = createRoutineVerifier({ ...config, movementCount: 1 });
    held(routine, reach);
    expect(routine.advance()).toMatchObject({ phase: 'complete', movementIndex: 0 });
  });
  it('requires a held overhead reach', () => {
    const routine = createRoutineVerifier(config);
    expect(held(routine, reach).phase).toBe('movement-complete');
  });

  it('reports current matching separately from retained hold progress', () => {
    const routine = createRoutineVerifier(config);
    expect(routine.processFrame(reach(0))).toMatchObject({ phase: 'holding', poseMatched: true });
    const matched = routine.processFrame(reach(100));
    const lost = routine.processFrame(frameAt(200));
    expect(lost).toMatchObject({ phase: 'holding', poseMatched: false, progress: matched.progress });
    expect(routine.processFrame(reach(250)).poseMatched).toBe(true);
  });

  it('accepts left and right bends with normalized torso shift', () => {
    const routine = createRoutineVerifier(config);
    held(routine, reach); routine.advance();
    expect(held(routine, leftBend, 400)).toMatchObject({ movement: 'side-bend-left', phase: 'movement-complete' });
    routine.advance();
    expect(held(routine, rightBend, 800).phase).toBe('movement-complete');
  });

  it('requires both rotation directions', () => {
    const routine = createRoutineVerifier(config);
    held(routine, reach); routine.advance(); held(routine, leftBend, 400); routine.advance(); held(routine, rightBend, 800); routine.advance();
    expect(held(routine, (time) => rotate(time, -1), 1_200).rotationStep).toBe('other-side');
    expect(held(routine, (time) => rotate(time, 1), 1_600).phase).toBe('movement-complete');
    expect(routine.processFrame(frameAt(2_000)).phase).toBe('movement-complete');
    expect(routine.advance()).toMatchObject({ phase: 'complete', movement: 'torso-rotation', movementIndex: 3 });
    expect(routine.processFrame(frameAt(2_100))).toMatchObject({ phase: 'complete', movement: 'torso-rotation', movementIndex: 3 });
  });

  it('accepts anatomical bends with either camera orientation', () => {
    for (const mirrored of [false, true]) {
      const orient = (frame: PoseFrame) => {
        if (mirrored) frame.landmarks.forEach((point) => { point.x = 1 - point.x; });
        return frame;
      };
      const routine = createRoutineVerifier(config);
      held(routine, (time) => orient(reach(time))); routine.advance();
      expect(held(routine, (time) => orient(rightBend(time)), 400).phase).toBe('demo');
      expect(held(routine, (time) => orient(leftBend(time)), 800).phase).toBe('movement-complete');
      routine.advance();
      expect(held(routine, (time) => orient(rightBend(time)), 1200).phase).toBe('movement-complete');
    }
  });

  it('accepts shoulder tilt without visible hips or wrists', () => {
    const routine = createRoutineVerifier(config);
    held(routine, reach); routine.advance();
    const tilt = (time: number, direction: number) => {
      const frame = frameAt(time);
      [15, 16, 23, 24].forEach((index) => { frame.landmarks[index].visibility = 0; });
      frame.landmarks[11].y += direction * 0.025;
      frame.landmarks[12].y -= direction * 0.025;
      return frame;
    };
    expect(held(routine, (time) => tilt(time, 1), 400).phase).toBe('movement-complete');
    routine.advance();
    expect(held(routine, (time) => tilt(time, -1), 800).phase).toBe('movement-complete');
  });

  it('pauses immediately on shoulder loss despite smoothed history', () => {
    const routine = createRoutineVerifier({ ...config, smoothingWindow: 4 });
    held(routine, reach); routine.advance();
    const hidden = leftBend(400); hidden.landmarks[11].visibility = 0;
    expect(routine.processFrame(hidden)).toMatchObject({ phase: 'paused-tracking', progress: 0 });
  });

  it('accepts a side bend with one arm overhead and the other lowered', () => {
    const routine = createRoutineVerifier(config);
    held(routine, reach); routine.advance();
    const oneArmBend = (time: number, direction: number) => {
      const frame = frameAt(time);
      frame.landmarks[11].y += direction * 0.06;
      frame.landmarks[12].y -= direction * 0.06;
      frame.landmarks[15] = { x: 0.65, y: 0.18, visibility: 1 };
      frame.landmarks[16] = { x: 0.72, y: 0.8, visibility: 1 };
      frame.landmarks[23].visibility = 0;
      frame.landmarks[24].visibility = 0;
      return frame;
    };
    expect(held(routine, (time) => oneArmBend(time, 1), 400).phase).toBe('movement-complete');
    routine.advance();
    expect(held(routine, (time) => oneArmBend(time, -1), 800).phase).toBe('movement-complete');
  });

  it('pauses rather than clears progress when tracking disappears', () => {
    const routine = createRoutineVerifier(config);
    routine.processFrame(reach(0));
    routine.processFrame(reach(100));
    const hidden = reach(200); hidden.landmarks[15].visibility = 0;
    expect(routine.processFrame(hidden).phase).toBe('paused-tracking');
    expect(routine.processFrame(reach(300)).progress).toBeGreaterThan(0);
  });
});

describe('routine recovery', () => {
  it('retains progress without crediting long gaps or missing tracking', () => {
    const routine = createRoutineVerifier(config);
    routine.processFrame(reach(0));
    const progress = routine.processFrame(reach(100)).progress;
    expect(routine.processFrame(reach(10000)).progress).toBe(progress);
    const missing = reach(10100); missing.landmarks[15].visibility = 0;
    routine.processFrame(missing);
    expect(routine.processFrame(reach(20000)).progress).toBe(progress);
    expect(routine.processFrame(reach(20100)).progress).toBeGreaterThan(progress);
  });
  it('accepts opposite turns without depth and rejects width-only/head-only changes', () => {
    const routine = createRoutineVerifier(config);
    const withHead = (frame: PoseFrame) => { frame.landmarks[0] = { x: 0.5, y: 0.2, visibility: 1 }; return frame; };
    held(routine, t => withHead(reach(t))); routine.advance();
    held(routine, t => withHead(leftBend(t)),400); routine.advance();
    held(routine, t => withHead(rightBend(t)),800); routine.advance();
    const turn = (t: number, direction: number, narrow = true) => {
      const frame = withHead(frameAt(t));
      if (narrow) { frame.landmarks[11].x = 0.43; frame.landmarks[12].x = 0.57; }
      frame.landmarks[0].x += direction * 0.06;
      return frame;
    };
    expect(held(routine,t => turn(t,0),1200).progress).toBe(0);
    expect(held(routine,t => turn(t,1,false),1600).progress).toBe(0);
    expect(held(routine,t => turn(t,-1),2000).rotationStep).toBe('other-side');
    expect(held(routine,t => turn(t,-1),2400)).toMatchObject({ progress: 0, poseMatched: false });
    expect(held(routine,t => turn(t,1),2800).phase).toBe('movement-complete');
  });
});
