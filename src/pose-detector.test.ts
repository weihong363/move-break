import { afterEach, expect, it, vi } from 'vitest';
import { createPoseDetector } from './pose-detector';

const detector = vi.hoisted(() => ({ detectForVideo: vi.fn((_input: HTMLCanvasElement, _timestamp: number) => ({ landmarks: [[]] })), close: vi.fn() }));
vi.mock('@mediapipe/tasks-vision', () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async () => ({})) },
  PoseLandmarker: { createFromOptions: vi.fn(async () => detector) },
}));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('continues timer-based inference without animation frames and cancels on stop', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
  vi.stubGlobal('window', { setTimeout, clearTimeout, requestAnimationFrame: () => { throw new Error('hidden animation frames'); } });
  vi.stubGlobal('HTMLMediaElement', { HAVE_CURRENT_DATA: 2 });
  const drawImage = vi.fn();
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }) };
  vi.stubGlobal('document', { createElement: () => canvas });
  let frozen = false;
  const video = { readyState: 4, videoWidth: 640, videoHeight: 480, get currentTime() { return frozen ? 0.9 : performance.now() / 1000; } };
  const frames = vi.fn();
  const error = vi.fn();
  const pose = createPoseDetector();
  await pose.start(video as HTMLVideoElement, frames, error);
  await vi.advanceTimersByTimeAsync(900);
  expect(frames.mock.calls.length).toBeGreaterThanOrEqual(5);
  expect(error).not.toHaveBeenCalled();
  expect(canvas).toMatchObject({ width: 640, height: 480 });
  expect(drawImage).toHaveBeenCalled();
  expect(detector.detectForVideo.mock.calls[0][0]).toBe(canvas);
  frozen = true;
  await vi.advanceTimersByTimeAsync(300);
  const detections = detector.detectForVideo.mock.calls.length;
  await vi.advanceTimersByTimeAsync(450);
  expect(detector.detectForVideo).toHaveBeenCalledTimes(detections);
  expect(frames.mock.calls.at(-1)?.[0]).toMatchObject({ landmarks: [] });
  pose.stop();
  const count = frames.mock.calls.length;
  await vi.advanceTimersByTimeAsync(900);
  expect(frames).toHaveBeenCalledTimes(count);
  expect(detector.close).toHaveBeenCalledOnce();
});
