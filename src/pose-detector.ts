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
  let generation = 0;

  const stop = () => {
    generation++;
    if (frameId !== undefined) window.clearTimeout(frameId);
    frameId = undefined;
    landmarker?.close();
    landmarker = undefined;
  };

  const start = async (video: HTMLVideoElement, onFrame: (frame: PoseFrame) => void, onError: (message: string) => void) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) { onError('MoveBreak could not read camera frames. Please try again.'); return; }
    let lastVideoTime: number | undefined;
    const currentGeneration = ++generation;
    try {
      const vision = await FilesetResolver.forVisionTasks('/wasm');
      const loaded = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task' },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      if (currentGeneration !== generation) { loaded.close(); return; }
      landmarker = loaded;
    } catch {
      if (currentGeneration !== generation) return;
      onError('MoveBreak could not start local pose tracking. Please try again.');
      return;
    }

    const detect = () => {
      if (!landmarker) return;
      const timestamp = performance.now();
      if (timestamp - lastDetectionAt >= 150 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        lastDetectionAt = timestamp;
        if (!video.videoWidth || !video.videoHeight || video.currentTime === lastVideoTime) {
          onFrame({ timestamp, landmarks: [] });
          frameId = window.setTimeout(detect, 150);
          return;
        }
        lastVideoTime = video.currentTime;
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        }
        // Explicitly consume camera pixels, independent of preview layout.
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const result = landmarker.detectForVideo(canvas, timestamp);
        onFrame({ timestamp, landmarks: (result.landmarks[0] ?? []) as PoseLandmark[] });
      }
      frameId = window.setTimeout(detect, 150);
    };

    frameId = window.setTimeout(detect, 0);
  };

  return { start, stop };
};
