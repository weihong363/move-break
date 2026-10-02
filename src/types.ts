export type AppPhase =
  | 'ready'
  | 'working'
  | 'camera-permission'
  | 'camera-loading'
  | 'camera-active'
  | 'camera-required';

export type AppState = {
  phase: AppPhase;
  remainingMs: number;
  durationMs: number;
  isPaused: boolean;
};
