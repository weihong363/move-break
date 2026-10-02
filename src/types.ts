export type AppPhase =
  | 'ready'
  | 'working'
  | 'camera-permission'
  | 'camera-loading'
  | 'camera-active'
  | 'camera-required'
  | 'completed';

export type AppState = {
  phase: AppPhase;
  remainingMs: number;
  durationMs: number;
  isPaused: boolean;
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
