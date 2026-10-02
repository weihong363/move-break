import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

type Readiness =
  | { kind: 'ready'; usableLandmarks: number }
  | { kind: 'framing'; usableLandmarks: number }
  | { kind: 'error'; message: string };

type Detector = {
  start: (video: HTMLVideoElement, onReadiness: (value: Readiness) => void) => Promise<void>;
  stop: () => void;
};

const upperBodyIndexes = [11, 12, 13, 14, 15, 16, 23, 24];

const countUsableLandmarks = (landmarks: Array<{ visibility?: number }>) =>
  upperBodyIndexes.filter((index) => (landmarks[index]?.visibility ?? 0) >= 0.5).length;

export const createPoseDetector = (): Detector => {
  let landmarker: PoseLandmarker | undefined;
  let frameId: number | undefined;
  let lastDetectionAt = 0;

  const stop = () => {
    if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    frameId = undefined;
    landmarker?.close();
    landmarker = undefined;
  };

  const start = async (video: HTMLVideoElement, onReadiness: (value: Readiness) => void) => {
    try {
      const vision = await FilesetResolver.forVisionTasks('/wasm');
      landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task' },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
    } catch {
      onReadiness({ kind: 'error', message: 'MoveBreak could not start local pose tracking. Please try again.' });
      return;
    }

    const detect = (timestamp: number) => {
      if (!landmarker) return;
      if (timestamp - lastDetectionAt >= 150 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        lastDetectionAt = timestamp;
        const result = landmarker.detectForVideo(video, timestamp);
        const usableLandmarks = countUsableLandmarks(result.landmarks[0] ?? []);
        onReadiness(usableLandmarks >= 4 ? { kind: 'ready', usableLandmarks } : { kind: 'framing', usableLandmarks });
      }
      frameId = window.requestAnimationFrame(detect);
    };

    frameId = window.requestAnimationFrame(detect);
  };

  return { start, stop };
};
