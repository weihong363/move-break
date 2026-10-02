import { requestCamera, stopCamera } from './camera';
import { demoConfig } from './config';
import { createMovementVerifier, type VerifierSnapshot } from './movement-verifier';
import { createPoseDetector } from './pose-detector';
import type { AppState } from './types';

const inactivityLabel = (seconds: number) => `${seconds} second demo`;

export const createAppController = (root: HTMLElement) => {
  const state: AppState = {
    phase: 'ready',
    inactivityDurationMs: demoConfig.inactivityDurationSeconds * 1_000,
  };
  let stream: MediaStream | undefined;
  let cameraErrorMessage = 'MoveBreak needs camera access to start local movement monitoring.';
  const detector = createPoseDetector();
  let verifier = createVerifier();

  function createVerifier() {
    return createMovementVerifier({ ...demoConfig, inactivityDurationMs: state.inactivityDurationMs });
  }

  const resetMonitoring = () => {
    verifier = createVerifier();
  };

  const enableCamera = async () => {
    state.phase = 'camera-loading';
    render();
    const video = root.querySelector<HTMLVideoElement>('video');
    if (!video) return;

    try {
      resetMonitoring();
      stream = await requestCamera(video);
      state.phase = 'camera-active';
      render();
      const activeVideo = root.querySelector<HTMLVideoElement>('video');
      if (!activeVideo || !stream) return;
      activeVideo.srcObject = stream;
      await activeVideo.play();
      await detector.start(activeVideo, (frame) => updateVerification(verifier.processFrame(frame)), handleDetectorError);
    } catch (error) {
      state.phase = 'camera-required';
      cameraErrorMessage = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Allow camera access in your browser settings, then try again. Monitoring cannot start without it.'
        : 'MoveBreak could not access a camera. Check that one is available, then try again.';
      render();
    }
  };

  const handleDetectorError = (message: string) => {
    detector.stop();
    stopCamera(stream);
    stream = undefined;
    cameraErrorMessage = message;
    state.phase = 'camera-required';
    render();
  };

  const updateVerification = (snapshot: VerifierSnapshot) => {
    const status = root.querySelector<HTMLElement>('[data-status]');
    const progress = root.querySelector<HTMLElement>('[data-progress]');
    if (!status || !progress) return;

    if (snapshot.phase === 'paused-tracking') {
      status.textContent = 'Keep both shoulders in view.';
      progress.textContent = 'Monitoring will continue when your stable baseline is visible.';
    } else if (snapshot.phase === 'baseline') {
      status.textContent = 'Hold still for a moment. MoveBreak is getting a baseline.';
      progress.textContent = `Getting ready… ${Math.round(snapshot.baselineProgress * 100)}%`;
    } else if (snapshot.phase === 'monitoring') {
      status.textContent = 'Monitoring gentle movement.';
      progress.textContent = `${Math.round(snapshot.inactivityProgress * 100)}% until a movement reminder`;
    } else if (snapshot.phase === 'awaiting-rise') {
      status.textContent = 'Time to move. Stand up and move for a few seconds.';
      progress.textContent = 'Waiting for a clear rise.';
    } else if (snapshot.phase === 'moving') {
      status.textContent = 'Nice — keep moving.';
      const seconds = Math.max(0, Math.ceil((1 - snapshot.movementProgress) * demoConfig.movementDurationMs / 1_000));
      progress.textContent = `${seconds} seconds remaining`;
    } else if (snapshot.phase === 'completed') {
      status.textContent = 'Movement break completed';
      progress.textContent = 'Nice. Sit back down when you are ready.';
    } else {
      status.textContent = 'Waiting for you to sit back down.';
      progress.textContent = 'Monitoring resumes from your usual seated position.';
    }
  };

  const setInactivityDuration = (seconds: number) => {
    state.inactivityDurationMs = seconds * 1_000;
    render();
  };

  const render = () => {
    if (state.phase === 'camera-active' || state.phase === 'camera-loading') {
      const isLoading = state.phase === 'camera-loading';
      root.innerHTML = `
        <section class="proof-card" aria-live="polite">
          <p class="eyebrow">MOVE BREAK</p>
          <h1>Gentle movement check</h1>
          <video class="camera-preview" autoplay muted playsinline></video>
          <p class="readiness" data-status>${isLoading ? 'Opening your camera…' : 'Hold still for a moment. MoveBreak is getting a baseline.'}</p>
          <p class="progress" data-progress>${isLoading ? '' : 'Getting ready… 0%'}</p>
          <p class="privacy-note">Camera processing stays on your device.</p>
        </section>`;
      return;
    }

    const isError = state.phase === 'camera-required';
    root.innerHTML = `
      <section class="home-card" aria-live="polite">
        <p class="eyebrow">MOVE BREAK</p>
        <div class="companion" aria-hidden="true">◔</div>
        <p class="state-label">${isError ? 'Camera access needed' : 'A gentle nudge when you stay still'}</p>
        <h1>${isError ? 'Monitoring paused' : 'Move a little, when you need it'}</h1>
        <p class="description">${isError ? cameraErrorMessage : 'MoveBreak keeps time while you stay seated, then asks you to stand up and move.'}</p>
        ${!isError ? `<label class="duration-control">Inactivity reminder after<select data-action="duration">${demoConfig.inactivityDurationOptions.map((seconds) => `<option value="${seconds}" ${state.inactivityDurationMs === seconds * 1_000 ? 'selected' : ''}>${inactivityLabel(seconds)}</option>`).join('')}</select></label>` : ''}
        <button class="primary-button" type="button" data-action="enable-camera">${isError ? 'Try camera again' : 'Enable camera'}</button>
        <p class="privacy-note">Camera processing stays on your device. Nothing is recorded or uploaded.</p>
      </section>`;
    root.querySelector<HTMLButtonElement>('[data-action="enable-camera"]')?.addEventListener('click', enableCamera);
    root.querySelector<HTMLSelectElement>('[data-action="duration"]')?.addEventListener('change', (event) => {
      setInactivityDuration(Number((event.target as HTMLSelectElement).value));
    });
  };

  render();
};
