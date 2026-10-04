import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestCamera, withCameraTimeout } from './camera';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('camera startup', () => {
  it('times out a pending permission request', async () => {
    vi.useFakeTimers();
    const outcome = expect(withCameraTimeout(new Promise(() => {}))).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(15_000);
    await outcome;
  });
  it('releases a stream arriving after startup timed out', async () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    let resolveCapture!: (stream: MediaStream) => void;
    const pending = new Promise<MediaStream>((resolve) => { resolveCapture = resolve; });
    vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: () => pending } });
    const video = { play: vi.fn() } as unknown as HTMLVideoElement;
    const outcome = expect(requestCamera(video)).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(15_000);
    await outcome;
    resolveCapture({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    await Promise.resolve();
    expect(stop).toHaveBeenCalledOnce();
    expect(video.play).not.toHaveBeenCalled();
  });
});
