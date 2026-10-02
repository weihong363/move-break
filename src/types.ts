export type AppPhase =
  | 'ready'
  | 'camera-loading'
  | 'camera-active'
  | 'camera-required';

export type AppState = {
  phase: AppPhase;
  inactivityDurationMs: number;
};

export type PoseLandmark = {
  x: number;
  y: number;
  visibility?: number;
};

export type PoseFrame = {
  timestamp: number;
  landmarks: PoseLandmark[];
};
