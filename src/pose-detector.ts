import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import type { PoseFrame, PoseLandmark } from './types';

type Detector = {
  start: (video: HTMLVideoElement, onFrame: (frame: PoseFrame) => void, onError: (message: string) => void) => Promise<void>;
  stop: () => void;
};

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

  const start = async (video: HTMLVideoElement, onFrame: (frame: PoseFrame) => void, onError: (message: string) => void) => {
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
      onError('MoveBreak could not start local pose tracking. Please try again.');
      return;
    }

    const detect = (timestamp: number) => {
      if (!landmarker) return;
      if (timestamp - lastDetectionAt >= 150 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        lastDetectionAt = timestamp;
        const result = landmarker.detectForVideo(video, timestamp);
        onFrame({ timestamp, landmarks: (result.landmarks[0] ?? []) as PoseLandmark[] });
      }
      frameId = window.requestAnimationFrame(detect);
    };

    frameId = window.requestAnimationFrame(detect);
  };

  return { start, stop };
};
