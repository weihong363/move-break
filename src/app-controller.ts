import { demoConfig } from './config';
import { createTimer } from './timer';
import type { AppState } from './types';

const formatTime = (milliseconds: number) => {
  const totalSeconds = Math.ceil(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const createAppController = (root: HTMLElement) => {
  const state: AppState = {
    phase: 'ready',
    durationMs: demoConfig.workDurationSeconds * 1_000,
    remainingMs: demoConfig.workDurationSeconds * 1_000,
    isPaused: false,
  };

  const timer = createTimer({
    onTick: (remainingMs) => {
      state.remainingMs = remainingMs;
      render();
    },
    onComplete: () => {
      state.phase = 'break-ready';
      state.isPaused = false;
      render();
    },
  });

  const setDuration = (seconds: number) => {
    state.durationMs = seconds * 1_000;
    state.remainingMs = state.durationMs;
    render();
  };

  const start = () => {
    state.phase = 'working';
    state.isPaused = false;
    timer.start(state.remainingMs);
    render();
  };

  const pause = () => {
    timer.stop();
    state.isPaused = true;
    render();
  };

  const reset = () => {
    timer.stop();
    state.phase = 'ready';
    state.isPaused = false;
    state.remainingMs = state.durationMs;
    render();
  };

  const render = () => {
    if (state.phase === 'break-ready') {
      root.innerHTML = `
        <section class="timer-card" aria-live="polite">
          <p class="eyebrow">MOVE BREAK</p>
          <div class="companion" aria-hidden="true">✦</div>
          <h1>Work session complete</h1>
          <p class="description">Your movement break is ready. Camera verification arrives in the next build step.</p>
          <button class="primary-button" type="button" data-action="reset">Back to timer</button>
        </section>`;
      root.querySelector<HTMLButtonElement>('[data-action="reset"]')?.addEventListener('click', reset);
      return;
    }

    const isWorking = state.phase === 'working';
    root.innerHTML = `
      <section class="timer-card" aria-live="polite">
        <p class="eyebrow">MOVE BREAK</p>
        <div class="companion" aria-hidden="true">◔</div>
        <p class="state-label">${isWorking ? 'Work session' : 'Ready when you are'}</p>
        <time class="timer" datetime="PT${Math.ceil(state.remainingMs / 1_000)}S">${formatTime(state.remainingMs)}</time>
        ${isWorking ? `
          <div class="button-row">
            <button class="secondary-button" type="button" data-action="pause">${state.isPaused ? 'Resume' : 'Pause'}</button>
            <button class="text-button" type="button" data-action="reset">Reset</button>
          </div>` : `
          <label class="duration-control">
            Work duration
            <select data-action="duration">
              ${demoConfig.workDurationOptions.map((seconds) => `<option value="${seconds}" ${state.durationMs === seconds * 1_000 ? 'selected' : ''}>${seconds} seconds</option>`).join('')}
            </select>
          </label>
          <button class="primary-button" type="button" data-action="start">Start</button>`}
        <p class="privacy-note">When the timer ends, MoveBreak will ask you to stand up and move. Camera processing stays on your device.</p>
      </section>`;

    root.querySelector<HTMLButtonElement>('[data-action="start"]')?.addEventListener('click', start);
    root.querySelector<HTMLButtonElement>('[data-action="pause"]')?.addEventListener('click', () => {
      if (state.isPaused) start();
      else pause();
    });
    root.querySelector<HTMLButtonElement>('[data-action="reset"]')?.addEventListener('click', reset);
    root.querySelector<HTMLSelectElement>('[data-action="duration"]')?.addEventListener('change', (event) => {
      setDuration(Number((event.target as HTMLSelectElement).value));
    });
  };

  render();
};
