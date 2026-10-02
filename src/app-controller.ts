import { demoConfig } from './config';
import { requestCamera, stopCamera } from './camera';
import { createMovementVerifier, type VerifierSnapshot } from './movement-verifier';
import { createPoseDetector } from './pose-detector';
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
  let stream: MediaStream | undefined;
  let readinessMessage = '';
  let cameraErrorMessage = 'Camera verification is required to complete this break.';
  const detector = createPoseDetector();
  let verifier = createMovementVerifier({ ...demoConfig });

  const timer = createTimer({
    onTick: (remainingMs) => {
      state.remainingMs = remainingMs;
      render();
    },
    onComplete: () => {
      state.phase = 'camera-permission';
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
    detector.stop();
    stopCamera(stream);
    stream = undefined;
    state.phase = 'ready';
    state.isPaused = false;
    state.remainingMs = state.durationMs;
    render();
  };

  const enableCamera = async () => {
    state.phase = 'camera-loading';
    render();
    const video = root.querySelector<HTMLVideoElement>('video');
    if (!video) return;

    try {
      verifier = createMovementVerifier({ ...demoConfig });
      stream = await requestCamera(video);
      state.phase = 'camera-active';
      readinessMessage = 'Hold still for a moment. MoveBreak is getting a baseline.';
      render();
      const activeVideo = root.querySelector<HTMLVideoElement>('video');
      if (!activeVideo || !stream) return;
      activeVideo.srcObject = stream;
      await activeVideo.play();
      await detector.start(activeVideo, (frame) => updateVerification(verifier.processFrame(frame)), (message) => {
        readinessMessage = message;
        root.querySelector<HTMLElement>('[data-readiness]')?.replaceChildren(message);
      });
    } catch (error) {
      state.phase = 'camera-required';
      cameraErrorMessage = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Allow camera access in your browser settings, then try again. Camera verification is required to complete this break.'
        : 'MoveBreak could not access a camera. Check that one is available, then try again.';
      render();
    }
  };

  const updateVerification = (snapshot: VerifierSnapshot) => {
    const status = root.querySelector<HTMLElement>('[data-readiness]');
    const progress = root.querySelector<HTMLElement>('[data-progress]');
    if (!status || !progress) return;
    if (snapshot.phase === 'paused-tracking') {
      status.textContent = 'Step back so your upper body is visible.';
      progress.textContent = 'Verification is paused until tracking is reliable.';
      return;
    }
    if (snapshot.phase === 'baseline') {
      status.textContent = 'Hold still for a moment. MoveBreak is getting a baseline.';
      progress.textContent = `Getting ready… ${Math.round(snapshot.baselineProgress * 100)}%`;
      return;
    }
    if (snapshot.phase === 'awaiting-rise') {
      status.textContent = 'Now get up and move.';
      progress.textContent = 'Waiting for a clear rise.';
      return;
    }
    if (snapshot.phase === 'moving') {
      status.textContent = 'Nice — keep moving.';
      progress.textContent = `${Math.max(0, Math.ceil((1 - snapshot.movementProgress) * demoConfig.movementDurationMs / 1_000))} seconds remaining`;
      return;
    }
    detector.stop();
    stopCamera(stream);
    stream = undefined;
    state.phase = 'completed';
    render();
  };

  const render = () => {
    if (state.phase === 'completed') {
      root.innerHTML = `
        <section class="proof-card" aria-live="polite">
          <p class="eyebrow">MOVE BREAK</p>
          <div class="companion" aria-hidden="true">✓</div>
          <h1>Movement break completed</h1>
          <p class="description">Nice. You’re ready for the next work session.</p>
          <button class="primary-button" type="button" data-action="reset">Start next session</button>
        </section>`;
      root.querySelector<HTMLButtonElement>('[data-action="reset"]')?.addEventListener('click', reset);
      return;
    }

    if (state.phase.startsWith('camera-')) {
      const isLoading = state.phase === 'camera-loading';
      const isError = state.phase === 'camera-required';
      root.innerHTML = `
        <section class="proof-card" aria-live="polite">
          <p class="eyebrow">MOVE BREAK</p>
          <h1>Movement break</h1>
          <p class="description">${isError ? cameraErrorMessage : 'Time to move. Stand up and move for a few seconds.'}</p>
          ${state.phase === 'camera-active' || isLoading ? '<video class="camera-preview" autoplay muted playsinline></video>' : ''}
          ${state.phase === 'camera-active' ? `<p class="readiness" data-readiness>${readinessMessage}</p><p class="progress" data-progress>Getting ready… 0%</p>` : ''}
          ${isLoading ? '<p class="readiness">Opening your camera…</p>' : ''}
          ${state.phase !== 'camera-active' ? `<button class="primary-button" type="button" data-action="enable-camera" ${isLoading ? 'disabled' : ''}>${isError ? 'Try camera again' : 'Enable camera'}</button>` : ''}
          <p class="privacy-note">Camera processing stays on your device.</p>
        </section>`;
      root.querySelector<HTMLButtonElement>('[data-action="enable-camera"]')?.addEventListener('click', enableCamera);
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
