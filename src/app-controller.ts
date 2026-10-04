import { requestCamera, stopCamera } from './camera';
import { demoConfig } from './config';
import { createMovementVerifier, type VerifierSnapshot } from './movement-verifier';
import { createPoseDetector } from './pose-detector';
import { createRoutineVerifier, type RoutineSnapshot } from './routine-verifier';
import type { AppState } from './types';
import { createRoutineSoundTracker, createSoundPlayer } from './sound';
import seatedArtUrl from './assets/translucent-seated-clean.png';
import routineArtUrl from './assets/movement-cue-atlas.png';
import standPromptUrl from './assets/stand-prompt.png';

const inactivityLabel = (seconds: number) => `${seconds} second demo`;
const routineLabel = (movement: RoutineSnapshot['movement']) => ({
  'overhead-reach': 'Overhead Reach',
  'side-bend-left': 'Side Bend Left',
  'side-bend-right': 'Side Bend Right',
  'torso-rotation': 'Torso Rotation',
}[movement]);

const characterMarkup = () => `
  <div class="companion" data-visual="monitoring" aria-hidden="true" style="--seated-art:url('${seatedArtUrl}');--routine-art:url('${routineArtUrl}');--stand-art:url('${standPromptUrl}')">
    <span class="monitoring-art"></span>
    <span class="stand-prompt-art"></span>
    <span class="routine-cue"></span>
  </div>`;

export const createAppController = (root: HTMLElement) => {
  const state: AppState = {
    phase: 'ready',
    inactivityDurationMs: demoConfig.inactivityDurationSeconds * 1_000,
  };
  let stream: MediaStream | undefined;
  let debugPreview = false;
  let lastVerifierPhase: VerifierSnapshot['phase'] | undefined;
  const previewMode = import.meta.env.DEV && new URLSearchParams(location.search).has('preview');
  const sound = createSoundPlayer();
  const routineSounds = createRoutineSoundTracker(demoConfig.routineHoldDurationMs, demoConfig.routinePulseIntervalMs);
  let routineAdvanceTimer: number | undefined;
  let cameraErrorMessage = 'MoveBreak needs camera access to start local movement monitoring.';
  const detector = createPoseDetector();
  let verifier = createVerifier();
  const routine = createRoutineVerifier({
    holdDurationMs: demoConfig.routineHoldDurationMs,
    smoothingWindow: demoConfig.smoothingWindow,
    overheadReachThreshold: 0.3,
    sideBendThreshold: 0.15,
    rotationWidthThreshold: 0.78,
    rotationDepthThreshold: 0.2,
  });

  function createVerifier() {
    return createMovementVerifier({ ...demoConfig, inactivityDurationMs: state.inactivityDurationMs });
  }

  const resetMonitoring = () => {
    verifier = createVerifier();
    routine.reset();
    routineSounds.reset();
    if (routineAdvanceTimer) window.clearTimeout(routineAdvanceTimer);
    routineAdvanceTimer = undefined;
  };

  const enableCamera = async () => {
    state.phase = 'camera-loading';
    render();
    const video = root.querySelector<HTMLVideoElement>('video');
    if (!video) return;

    try {
      resetMonitoring();
      void sound.prime();
      stream = await requestCamera(video);
      state.phase = 'camera-active';
      render();
      const activeVideo = root.querySelector<HTMLVideoElement>('video');
      if (!activeVideo || !stream) return;
      activeVideo.srcObject = stream;
      await activeVideo.play();
      await detector.start(activeVideo, (frame) => {
        const snapshot = verifier.processFrame(frame);
        const startsRoutine = snapshot.phase === 'routine' && lastVerifierPhase !== 'routine';
        if (startsRoutine) { routine.reset(); routineSounds.reset(); }
        if (snapshot.phase === 'routine' || (snapshot.phase === 'paused-tracking' && lastVerifierPhase === 'routine')) { updateRoutine(routine.processFrame(frame)); return; }
        updateVerification(snapshot);
      }, handleDetectorError);
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

  const showMonitoringArt = () => {
    const companion = root.querySelector<HTMLElement>('[data-visual]');
    companion?.setAttribute('data-visual', 'monitoring');
    companion?.removeAttribute('data-routine-pose');
  };

  const setGuidance = (message = '') => {
    const hint = root.querySelector<HTMLElement>('[data-guidance]');
    if (hint) { hint.textContent = message; hint.hidden = !message; }
  };

  const setPreviewVisible = (visible: boolean) => {
    root.querySelector<HTMLElement>('[data-camera-shell]')?.classList.toggle('camera-visible', visible);
    const toggle = root.querySelector<HTMLButtonElement>('[data-action="toggle-debug"]');
    if (toggle) toggle.textContent = debugPreview ? 'Hide camera debug' : 'Show camera debug';
  };

  const showMovementCue = (movement: RoutineSnapshot['movement']) => {
    const companion = root.querySelector<HTMLElement>('[data-visual]');
    companion?.setAttribute('data-visual', 'routine');
    companion?.setAttribute('data-routine-pose', movement);
  };

  const showStandPrompt = () => {
    const companion = root.querySelector<HTMLElement>('[data-visual]');
    companion?.setAttribute('data-visual', 'stand-prompt');
    companion?.removeAttribute('data-routine-pose');
  };

  const updateRoutine = (snapshot: RoutineSnapshot) => {
    const status = root.querySelector<HTMLElement>('[data-status]');
    const progress = root.querySelector<HTMLElement>('[data-progress]');
    const step = root.querySelector<HTMLElement>('[data-step]');
    if (!status || !progress) return;
    routineSounds.update(snapshot).forEach(sound.play);
    lastVerifierPhase = 'routine';
    showMovementCue(snapshot.movement);
    setPreviewVisible(debugPreview);
    setGuidance(snapshot.phase === 'paused-tracking' ? 'Step back so your upper body and hands are visible.' : '');
    if (step) step.textContent = `Step ${snapshot.movementIndex + 1} of 4 · ${routineLabel(snapshot.movement)}`;
    status.textContent = snapshot.instruction;
    const seconds = Math.max(0, Math.ceil((1 - snapshot.progress) * demoConfig.routineHoldDurationMs / 1_000));
    progress.textContent = snapshot.poseMatched
      ? `Matched — hold it · ${seconds} seconds remaining`
      : `Match the movement to continue · ${seconds} seconds remaining`;
    if (snapshot.phase === 'complete') {
      status.textContent = 'Movement break completed';
      progress.textContent = 'Nice. Sit back down when you are ready.';
      if (!previewMode) verifier.completeRoutine();
    } else if (snapshot.phase === 'movement-complete') {
      status.textContent = 'Nice!';
      progress.textContent = 'Moving to the next stretch…';
      if (!previewMode && !routineAdvanceTimer) routineAdvanceTimer = window.setTimeout(() => { routineAdvanceTimer = undefined; updateRoutine(routine.advance()); }, demoConfig.routineAdvanceDelayMs);
    } else if (snapshot.phase === 'demo') {
      progress.textContent = 'Follow the movement cue to begin.';
    }
  };

  const updateVerification = (snapshot: VerifierSnapshot) => {
    const status = root.querySelector<HTMLElement>('[data-status]');
    const progress = root.querySelector<HTMLElement>('[data-progress]');
    if (!status || !progress) return;
    if (snapshot.phase === 'awaiting-rise' && lastVerifierPhase !== 'awaiting-rise') sound.play('reminder');
    const previousPhase = lastVerifierPhase;
    if (snapshot.phase === 'monitoring' && previousPhase === 'awaiting-return') sound.play('new-cycle');
    if (snapshot.phase !== 'paused-tracking') lastVerifierPhase = snapshot.phase;
    setPreviewVisible(debugPreview);
    setGuidance();
    const step = root.querySelector<HTMLElement>('[data-step]');
    if (snapshot.phase === 'paused-tracking' && previousPhase === 'awaiting-rise') {
      setGuidance('Step back so your upper body and hands are visible.');
      return;
    }
    if (step) step.textContent = 'LOCAL MOVEMENT CHECK';
    if (snapshot.phase === 'paused-tracking') {
      showMonitoringArt();
      setGuidance('Keep both shoulders in view.');
      status.textContent = 'Keep both shoulders in view.';
      progress.textContent = 'Monitoring will continue when your stable baseline is visible.';
    } else if (snapshot.phase === 'baseline') {
      showMonitoringArt();
      setPreviewVisible(debugPreview);
      status.textContent = 'Hold still for a moment. MoveBreak is getting a baseline.';
      progress.textContent = `Getting ready… ${Math.round(snapshot.baselineProgress * 100)}%`;
    } else if (snapshot.phase === 'monitoring') {
      showMonitoringArt();
      setPreviewVisible(debugPreview);
      status.textContent = 'Monitoring';
      progress.textContent = `${Math.round(snapshot.inactivityProgress * 100)}% until a movement reminder`;
    } else if (snapshot.phase === 'awaiting-rise') {
      showStandPrompt();
      status.textContent = 'Stand up';
      progress.textContent = 'The routine begins once you are standing.';
    } else if (snapshot.phase === 'routine') {
      showMovementCue('overhead-reach');
      setPreviewVisible(debugPreview);
      status.textContent = 'Get ready to move';
      progress.textContent = 'Follow the movement cue.';
    } else if (snapshot.phase === 'completed') {
      showMovementCue('torso-rotation');
      setPreviewVisible(debugPreview);
      status.textContent = 'Break completed';
      progress.textContent = 'Nice. Sit back down when you are ready.';
    } else {
      showMovementCue('torso-rotation');
      setPreviewVisible(debugPreview);
      status.textContent = 'Sit down when you are ready';
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
          ${characterMarkup()}
          <p class="state-label" data-step>LOCAL MOVEMENT CHECK</p>
          <h1 class="readiness" data-status>${isLoading ? 'Opening your camera…' : 'Getting ready'}</h1>
          <p class="progress" data-progress>${isLoading ? '' : 'Getting ready… 0%'}</p>
          <p class="tracking-guidance" data-guidance hidden></p>
          <div class="camera-shell" data-camera-shell>
            <video class="camera-preview" autoplay muted playsinline></video>
            <p>Local camera debug view</p>
          </div>
          ${isLoading ? '' : '<button class="text-button debug-toggle" type="button" data-action="toggle-debug">Show camera debug</button>'}
          <p class="privacy-note">Camera processing stays on your device.</p>
        </section>`;
      root.querySelector<HTMLButtonElement>('[data-action="toggle-debug"]')?.addEventListener('click', () => {
        debugPreview = !debugPreview;
        setPreviewVisible(debugPreview);
      });
      return;
    }

    const isError = state.phase === 'camera-required';
    root.innerHTML = `
      <section class="home-card" aria-live="polite">
        <p class="eyebrow">MOVE BREAK</p>
        ${characterMarkup()}
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

  if (previewMode) state.phase = 'camera-active';
  render();
  if (previewMode) {
    const controls = document.createElement('div');
    const names = ['stand', 'overhead-reach', 'side-bend-left', 'side-bend-right', 'torso-rotation', 'tracking-paused', 'step-success', 'completed'];
    controls.innerHTML = `<label>Developer state preview <select>${names.map((name) => `<option>${name}</option>`).join('')}</select></label>`;
    root.append(controls);
    const preview = (name: string) => {
      if (name === 'stand') {
        updateVerification({ phase: 'awaiting-rise', baselineProgress: 1, inactivityProgress: 1, movementProgress: 0 });
        return;
      }
      const movements: RoutineSnapshot['movement'][] = ['overhead-reach', 'side-bend-left', 'side-bend-right', 'torso-rotation'];
      const index = Math.max(0, movements.indexOf(name as RoutineSnapshot['movement']));
      updateRoutine({ movement: name === 'completed' ? 'torso-rotation' : movements[index], movementIndex: name === 'completed' ? 3 : index, instruction: ['Reach up', 'Bend left', 'Bend right', 'Turn your upper body'][index], progress: 0.5, poseMatched: !['completed', 'tracking-paused', 'step-success'].includes(name), phase: name === 'completed' ? 'complete' : name === 'tracking-paused' ? 'paused-tracking' : name === 'step-success' ? 'movement-complete' : 'holding' });
    };
    controls.querySelector('select')?.addEventListener('change', (event) => { void sound.prime(); preview((event.target as HTMLSelectElement).value); });
    preview('stand');
  }
};
