export type AppPhase = 'ready' | 'working' | 'break-ready';

export type AppState = {
  phase: AppPhase;
  remainingMs: number;
  durationMs: number;
  isPaused: boolean;
};
