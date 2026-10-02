export type Timer = {
  start: (remainingMs: number) => void;
  stop: () => void;
};

type TimerOptions = {
  onTick: (remainingMs: number) => void;
  onComplete: () => void;
};

export const createTimer = ({ onTick, onComplete }: TimerOptions): Timer => {
  let intervalId: number | undefined;
  let finishAt = 0;

  const stopInterval = () => {
    if (intervalId !== undefined) window.clearInterval(intervalId);
    intervalId = undefined;
  };

  const tick = () => {
    const remainingMs = Math.max(0, finishAt - Date.now());
    onTick(remainingMs);
    if (remainingMs === 0) {
      stopInterval();
      onComplete();
    }
  };

  const start = (remainingMs: number) => {
    stopInterval();
    finishAt = Date.now() + remainingMs;
    tick();
    intervalId = window.setInterval(tick, 100);
  };

  return {
    start,
    stop: stopInterval,
  };
};
