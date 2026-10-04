import { afterEach, expect, it, vi } from 'vitest';
import { createPoseDetector } from './pose-detector';

const detector = vi.hoisted(() => ({ detectForVideo: vi.fn(() => ({ landmarks: [[]] })), close: vi.fn() }));
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
  PoseLandmarker: { createFromOptions: vi.fn(async () => detector) },
}));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('continues timer-based inference without animation frames and cancels on stop', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  vi.stubGlobal('window', { setTimeout, clearTimeout, requestAnimationFrame: () => { throw new Error('hidden animation frames'); } });
  vi.stubGlobal('HTMLMediaElement', { HAVE_CURRENT_DATA: 2 });
  const frames = vi.fn();
  const error = vi.fn();
  const pose = createPoseDetector();
  await pose.start({ readyState: 4 } as HTMLVideoElement, frames, error);
  await vi.advanceTimersByTimeAsync(900);
  expect(frames.mock.calls.length).toBeGreaterThanOrEqual(5);
  expect(error).not.toHaveBeenCalled();
  pose.stop();
  const count = frames.mock.calls.length;
  await vi.advanceTimersByTimeAsync(900);
  expect(frames).toHaveBeenCalledTimes(count);
  expect(detector.close).toHaveBeenCalledOnce();
});
