import { withCameraTimeout } from './camera';
import { requestCamera, stopCamera } from './camera';
import { demoConfig } from './config';
import { createMovementVerifier, type VerifierSnapshot } from './movement-verifier';
import { createPoseDetector } from './pose-detector';
import { createRoutineVerifier, type RoutineSnapshot } from './routine-verifier';
import type { AppState } from './types';
import { createRoutineSoundTracker, createSoundPlayer } from './sound';
import { defaultSettings, type DesktopSettings, type CompanionStatus } from './desktop-settings';
import seatedArtUrl from './assets/translucent-seated-clean.png';
import routineArtUrl from './assets/movement-cue-atlas.png';
import standPromptUrl from './assets/stand-prompt.png';
import returnPromptUrl from './assets/seated-return-prompt.png';

const inactivityLabel = (seconds: number) => `${seconds} second demo`;
const routineLabel = (movement: RoutineSnapshot['movement']) => ({
  'overhead-reach': 'Overhead Reach',
  'side-bend-left': 'Side Bend Left',
  'side-bend-right': 'Side Bend Right',
  'torso-rotation': 'Torso Rotation',
}[movement]);

const characterMarkup = () => `
  <div class="companion" data-visual="monitoring" aria-hidden="true" style="--seated-art:url('${seatedArtUrl}');--routine-art:url('${routineArtUrl}');--stand-art:url('${standPromptUrl}');--return-art:url('${returnPromptUrl}')">
    <span class="monitoring-art"></span>
    <span class="stand-prompt-art"></span>
    <span class="return-prompt-art"></span>
    <span class="routine-cue"></span>
  </div>`;

export const createAppController = (root: HTMLElement) => {
  const desktop = window.moveBreak;
  let settings: DesktopSettings = { ...defaultSettings, demoMode: !desktop };
  let paused = false;
  let cameraAttempt = 0;
  let lastReported = '';
  const inactivityMs = () => settings.demoMode ? 5000 : settings.inactivityMinutes * 60_000;
  const report = (label: string, remainingSeconds?: number) => {
    const status: CompanionStatus = { monitoring: state.phase === 'camera-active' && !paused, label, remainingSeconds };
    const serialized = JSON.stringify(status);
    if (serialized !== lastReported) { desktop?.reportStatus(status); lastReported = serialized; }
  };
  const state: AppState = {
    phase: 'ready',
    inactivityDurationMs: inactivityMs(),
  };
  let stream: MediaStream | undefined;
  let debugPreview = false;
  let lastVerifierPhase: VerifierSnapshot['phase'] | undefined;
  const previewMode = import.meta.env.DEV && new URLSearchParams(location.search).has('preview');
  const sound = createSoundPlayer();
  let routineSounds = createRoutineSoundTracker(demoConfig.routineHoldDurationMs, demoConfig.routinePulseIntervalMs);
  let routineAdvanceTimer: number | undefined;
  let cameraErrorMessage = 'MoveBreak needs camera access to start local movement monitoring.';
  const detector = createPoseDetector();
  let verifier = createVerifier();
  let activeRoutineSettings = { ...settings };
  const makeRoutine = () => {
    activeRoutineSettings = { ...settings };
    return createRoutineVerifier({
    holdDurationMs: settings.holdSeconds * 1000,
    movementCount: settings.movementCount,
    smoothingWindow: demoConfig.smoothingWindow,
    overheadReachThreshold: 0.3,
    sideBendThreshold: 0.15,
    rotationWidthThreshold: 0.78,
    rotationDepthThreshold: 0.2,
    });
  };

  let routine = makeRoutine();

  function createVerifier() {
    return createMovementVerifier({ ...demoConfig, inactivityDurationMs: state.inactivityDurationMs });
  }

  const resetMonitoring = () => {
    state.inactivityDurationMs = inactivityMs();
    verifier = createVerifier();
    lastVerifierPhase = undefined;
    routine = makeRoutine();
    routineSounds = createRoutineSoundTracker(settings.holdSeconds * 1000, demoConfig.routinePulseIntervalMs);
    if (routineAdvanceTimer) window.clearTimeout(routineAdvanceTimer);
    routineAdvanceTimer = undefined;
  };

  const enableCamera = async () => {
    if (state.phase === 'camera-loading' || state.phase === 'camera-active') return;
    const attempt = ++cameraAttempt;
    paused = false;
    state.phase = 'camera-loading';
    render();
    const video = root.querySelector<HTMLVideoElement>('video');
    if (!video) return;

    try {
      resetMonitoring();
      void sound.prime();
      if (desktop && !await withCameraTimeout(desktop.requestCameraAccess())) throw new DOMException('Camera permission required', 'NotAllowedError');
      if (attempt !== cameraAttempt) return;
      const captured = await requestCamera(video);
      if (attempt !== cameraAttempt) { stopCamera(captured); return; }
      stream = captured;
      state.phase = 'camera-active';
      render();
      const activeVideo = root.querySelector<HTMLVideoElement>('video');
      if (!activeVideo || !stream) return;
      activeVideo.srcObject = stream;
      await activeVideo.play();
      if (attempt !== cameraAttempt) return;
      await detector.start(activeVideo, (frame) => {
        const snapshot = verifier.processFrame(frame);
        const startsRoutine = snapshot.phase === 'routine' && lastVerifierPhase !== 'routine';
        if (startsRoutine) { routine = makeRoutine(); routineSounds = createRoutineSoundTracker(settings.holdSeconds * 1000, demoConfig.routinePulseIntervalMs); }
        if (snapshot.phase === 'routine' || (snapshot.phase === 'paused-tracking' && lastVerifierPhase === 'routine')) { updateRoutine(routine.processFrame(frame)); return; }
        updateVerification(snapshot);
      }, handleDetectorError);
    } catch (error) {
      if (attempt !== cameraAttempt) return;
      stopCamera(stream); stream = undefined;
      state.phase = 'camera-required';
      cameraErrorMessage = error instanceof DOMException && error.name === 'NotAllowedError'
        ? 'Allow camera access in your browser settings, then try again. Monitoring cannot start without it.'
        : desktop ? 'Check macOS Privacy & Security → Camera, then try again.' : 'MoveBreak could not access a camera. Check that one is available, then try again.';
      render();
      report('Camera unavailable');
    }
  };

  const handleDetectorError = (message: string) => {
    detector.stop();
    stopCamera(stream);
    stream = undefined;
    cameraErrorMessage = message;
    state.phase = 'camera-required';
    render();
    report('Camera unavailable');
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

  const showReturnPrompt = () => {
    const companion = root.querySelector<HTMLElement>('[data-visual]');
    companion?.setAttribute('data-visual', 'return-prompt');
    companion?.removeAttribute('data-routine-pose');
  };

  const updateRoutine = (snapshot: RoutineSnapshot) => {
    const status = root.querySelector<HTMLElement>('[data-status]');
    const progress = root.querySelector<HTMLElement>('[data-progress]');
    const step = root.querySelector<HTMLElement>('[data-step]');
    if (!status || !progress) return;
    report(snapshot.phase === 'complete' ? 'Break complete' : 'Movement break');
    routineSounds.update(snapshot).forEach(sound.play);
    lastVerifierPhase = 'routine';
    showMovementCue(snapshot.movement);
    setPreviewVisible(debugPreview);
    setGuidance(snapshot.phase === 'paused-tracking' ? 'Step back so your upper body and hands are visible.' : '');
    if (step) step.textContent = `Step ${snapshot.movementIndex + 1} of ${activeRoutineSettings.movementCount} · ${routineLabel(snapshot.movement)}`;
    status.textContent = desktop && snapshot.movement === 'torso-rotation' ? 'Turn' : snapshot.instruction;
    const seconds = Math.max(0, Math.ceil((1 - snapshot.progress) * activeRoutineSettings.holdSeconds));
    progress.textContent = snapshot.poseMatched
      ? desktop ? `Keep going · ${seconds}s` : `Matched — hold it · ${seconds} seconds remaining`
      : desktop ? 'Follow along' : `Match the movement to continue · ${seconds} seconds remaining`;
    if (snapshot.phase === 'complete') {
      showReturnPrompt();
      if (step) step.textContent = 'BREAK COMPLETE';
      status.textContent = desktop ? 'Break complete' : 'Movement break completed';
      progress.textContent = desktop ? 'Sit down when ready' : 'Nice. Sit back down when you are ready.';
      if (!previewMode) verifier.completeRoutine();
    } else if (snapshot.phase === 'movement-complete') {
      status.textContent = 'Nice — next move';
      progress.textContent = desktop ? 'Next move…' : 'Moving to the next stretch…';
      if (!previewMode && !routineAdvanceTimer) routineAdvanceTimer = window.setTimeout(() => { routineAdvanceTimer = undefined; updateRoutine(routine.advance()); }, demoConfig.routineAdvanceDelayMs);
    } else if (snapshot.phase === 'demo') {
      progress.textContent = desktop ? 'Follow along' : 'Follow the movement cue to begin.';
    }
  };

  const updateVerification = (snapshot: VerifierSnapshot) => {
    const status = root.querySelector<HTMLElement>('[data-status]');
    const progress = root.querySelector<HTMLElement>('[data-progress]');
    if (!status || !progress) return;
    if (snapshot.phase === 'awaiting-rise' && lastVerifierPhase !== 'awaiting-rise') sound.play('reminder');
    const previousPhase = lastVerifierPhase;
    if (snapshot.phase === 'monitoring' && previousPhase === 'awaiting-return') {
      state.inactivityDurationMs = inactivityMs(); verifier.setInactivityDuration(state.inactivityDurationMs); sound.play('new-cycle');
    }
    report(snapshot.phase === 'monitoring' ? 'Monitoring' : snapshot.phase === 'baseline' ? 'Getting ready' : 'Movement break', snapshot.phase === 'monitoring' ? Math.ceil((1 - snapshot.inactivityProgress) * state.inactivityDurationMs / 1000) : undefined);
    if (snapshot.phase !== 'paused-tracking') lastVerifierPhase = snapshot.phase;
    setPreviewVisible(debugPreview);
    setGuidance();
    const step = root.querySelector<HTMLElement>('[data-step]');
    if (snapshot.phase === 'paused-tracking' && (previousPhase === 'awaiting-rise' || previousPhase === 'awaiting-return')) {
      setGuidance(previousPhase === 'awaiting-return' ? 'Keep both shoulders visible so MoveBreak can detect when you sit down.' : 'Step back so your upper body and hands are visible.');
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
      status.textContent = desktop ? 'Getting ready' : 'Hold still for a moment. MoveBreak is getting a baseline.';
      progress.textContent = `Getting ready… ${Math.round(snapshot.baselineProgress * 100)}%`;
    } else if (snapshot.phase === 'monitoring') {
      showMonitoringArt();
      setPreviewVisible(debugPreview);
      status.textContent = 'Monitoring';
      progress.textContent = desktop ? `${Math.ceil((1 - snapshot.inactivityProgress) * state.inactivityDurationMs / (settings.demoMode ? 1000 : 60_000))} ${settings.demoMode ? 'sec' : 'min'} until break` : `${Math.round(snapshot.inactivityProgress * 100)}% until a movement reminder`;
    } else if (snapshot.phase === 'awaiting-rise') {
      showStandPrompt();
      status.textContent = desktop ? 'Time to move' : 'Stand up';
      progress.textContent = desktop ? 'Stand up' : 'The routine begins once you are standing.';
    } else if (snapshot.phase === 'routine') {
      showMovementCue('overhead-reach');
      setPreviewVisible(debugPreview);
      status.textContent = 'Get ready to move';
      progress.textContent = 'Follow the movement cue.';
    } else if (snapshot.phase === 'completed') {
      showReturnPrompt();
      setPreviewVisible(debugPreview);
      status.textContent = 'Break completed';
      progress.textContent = desktop ? 'Sit down when ready' : 'Nice. Sit back down when you are ready.';
    } else {
      showReturnPrompt();
      setPreviewVisible(debugPreview);
      status.textContent = desktop ? 'Sit down when ready' : 'Sit down when you are ready';
      progress.textContent = desktop ? 'New round when seated' : 'Monitoring resumes from your usual seated position.';
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
        <p class="state-label">${desktop ? 'MOVEBREAK' : isError ? 'Camera access needed' : 'A gentle nudge when you stay still'}</p>
        <h1>${paused ? 'Paused' : isError ? 'Camera needed' : desktop ? 'Hello' : 'Move a little, when you need it'}</h1>
        <p class="description">${paused ? 'Resume from the menu bar.' : isError ? cameraErrorMessage : desktop ? 'Enable your camera to begin. Video stays on your device.' : 'MoveBreak keeps time while you stay seated, then asks you to stand up and move.'}</p>
        ${!isError && !desktop ? `<label class="duration-control">Inactivity reminder after<select data-action="duration">${demoConfig.inactivityDurationOptions.map((seconds) => `<option value="${seconds}" ${state.inactivityDurationMs === seconds * 1_000 ? 'selected' : ''}>${inactivityLabel(seconds)}</option>`).join('')}</select></label>` : ''}
        <button class="primary-button" type="button" data-action="enable-camera">${paused ? 'Resume' : isError ? 'Try camera again' : 'Enable camera'}</button>
        <p class="privacy-note">Camera processing stays on your device. Nothing is recorded or uploaded.</p>
      </section>`;
    root.querySelector<HTMLButtonElement>('[data-action="enable-camera"]')?.addEventListener('click', enableCamera);
    root.querySelector<HTMLSelectElement>('[data-action="duration"]')?.addEventListener('change', (event) => {
      setInactivityDuration(Number((event.target as HTMLSelectElement).value));
    });
  };

  const applySettings = (next: DesktopSettings) => {
    settings = next; sound.setEnabled(next.sound); debugPreview = next.debugCamera;
    setPreviewVisible(debugPreview);
    if (state.phase === 'ready' || state.phase === 'camera-required') state.inactivityDurationMs = inactivityMs();
  };
  if (desktop) {
    void desktop.getSettings().then(applySettings);
    desktop.onSettings(applySettings);
    desktop.onCommand((command) => {
      if (command === 'pause') {
        paused = true; cameraAttempt++; detector.stop(); stopCamera(stream); stream = undefined;
        if (routineAdvanceTimer) window.clearTimeout(routineAdvanceTimer);
        routineAdvanceTimer = undefined;
        state.phase = 'ready'; render(); report('Paused');
      } else if (command === 'resume') void enableCamera();
      else if (settings.demoMode && state.phase === 'camera-active') verifier.requestBreak();
    });
    report('Camera not enabled');
  }
  if (previewMode) state.phase = 'camera-active';
  render();
  if (previewMode) {
    const controls = document.createElement('div');
    const names = ['stand', 'overhead-reach', 'side-bend-left', 'side-bend-right', 'torso-rotation', 'tracking-paused', 'step-success', 'completed', 'awaiting-return', 'return-tracking-paused'];
    controls.innerHTML = `<label>Developer state preview <select>${names.map((name) => `<option>${name}</option>`).join('')}</select></label>`;
    root.append(controls);
    const preview = (name: string) => {
      if (name === 'awaiting-return' || name === 'return-tracking-paused') {
        const snapshot: VerifierSnapshot = { phase: 'awaiting-return', baselineProgress: 1, inactivityProgress: 0, movementProgress: 0 };
        updateVerification(snapshot);
        if (name === 'return-tracking-paused') updateVerification({ ...snapshot, phase: 'paused-tracking' });
        return;
      }
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
