import { requestCamera, stopCamera } from './camera';
import { demoConfig } from './config';
import { createMovementVerifier, type VerifierSnapshot } from './movement-verifier';
import { createPoseDetector } from './pose-detector';
import { createRoutineVerifier, type RoutineSnapshot } from './routine-verifier';
import type { AppState, PoseFrame } from './types';
import seatedRigUrl from './assets/translucent-seated-clean.png';
import standingRigSheetUrl from './assets/translucent-standing-rig-sheet.png';

const inactivityLabel = (seconds: number) => `${seconds} second demo`;
const routineLabel = (movement: RoutineSnapshot['movement']) => ({
  'overhead-reach': 'Overhead Reach',
  'side-bend-left': 'Side Bend Left',
  'side-bend-right': 'Side Bend Right',
  'torso-rotation': 'Torso Rotation',
}[movement]);

const characterMarkup = () => `
  <div class="avatar layered-avatar" data-avatar="seated" data-avatar-motion="still" data-rig-test="" data-rig-debug="false" aria-hidden="true" style="--seated-art:url('${seatedRigUrl}');--standing-rig-art:url('${standingRigSheetUrl}')">
    <span class="seated-rig" data-rig-root>
      <span class="rig-layer rig-desk"></span><span class="rig-layer rig-torso"></span><span class="rig-layer rig-head"></span>
      <span class="rig-arm-parent rig-left-upper"><span class="rig-layer rig-left-forearm"></span></span>
      <span class="rig-arm-parent rig-right-upper"><span class="rig-layer rig-right-forearm"></span></span>
    </span>
    <span class="standing-rig">
      <span class="standing-transform">
        <span class="standing-piece standing-torso"></span>
        <span class="standing-piece standing-head"></span>
        <span class="standing-segment standing-left-upper"><span class="standing-segment standing-left-forearm"><i class="rig-joint rig-left-wrist"></i></span><i class="rig-joint rig-left-elbow"></i></span>
        <span class="standing-segment standing-right-upper"><span class="standing-segment standing-right-forearm"><i class="rig-joint rig-right-wrist"></i></span><i class="rig-joint rig-right-elbow"></i></span>
        <i class="rig-joint rig-left-shoulder"></i><i class="rig-joint rig-right-shoulder"></i>
      </span>
    </span>
  </div>`;

export const createAppController = (root: HTMLElement) => {
  const state: AppState = {
    phase: 'ready',
    inactivityDurationMs: demoConfig.inactivityDurationSeconds * 1_000,
  };
  let stream: MediaStream | undefined;
  let debugPreview = false;
  let rigPreview: 'seated' | 'standing' = 'seated';
  let pivotPreview = false;
  let rigDebug = false;
  let lastVerifierPhase: VerifierSnapshot['phase'] | undefined;
  let promptStartedAt: number | undefined;
  let notificationAudio: AudioContext | undefined;
  let routineAdvanceTimer: number | undefined;
  let routineCompleteTimer: number | undefined;
  let lastRoutineSecond: number | undefined;
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
    lastRoutineSecond = undefined;
    if (routineAdvanceTimer) window.clearTimeout(routineAdvanceTimer);
    if (routineCompleteTimer) window.clearTimeout(routineCompleteTimer);
    routineAdvanceTimer = undefined;
    routineCompleteTimer = undefined;
  };

  const primeNotificationAudio = async () => {
    notificationAudio ??= new AudioContext();
    if (notificationAudio.state === 'suspended') await notificationAudio.resume();
  };

  const playNotification = () => {
    const context = notificationAudio;
    if (!context || context.state !== 'running') return;
    [0, 0.12].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = index === 0 ? 523 : 659;
      gain.gain.setValueAtTime(0.0001, context.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + 0.18);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + 0.2);
    });
  };

  const playRoutineTick = (finalSecond: boolean) => {
    const context = notificationAudio;
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = finalSecond ? 880 : 660;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.11);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
  };

  const enableCamera = async () => {
    state.phase = 'camera-loading';
    render();
    const video = root.querySelector<HTMLVideoElement>('video');
    if (!video) return;

    try {
      resetMonitoring();
      void primeNotificationAudio();
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
        if (startsRoutine) { routine.reset(); lastRoutineSecond = undefined; }
        if (snapshot.phase === 'routine' || (snapshot.phase === 'paused-tracking' && lastVerifierPhase === 'routine')) { updateRoutine(routine.processFrame(frame), frame); return; }
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

  const setAvatar = (nextState: string, motion: VerifierSnapshot['avatarMotion'] = 'still') => {
    const avatar = root.querySelector<HTMLElement>('[data-avatar]');
    avatar?.setAttribute('data-avatar', nextState);
    avatar?.setAttribute('data-avatar-motion', motion);
  };

  const updateRigPreview = () => {
    const avatar = root.querySelector<HTMLElement>('[data-avatar]');
    avatar?.setAttribute('data-avatar', rigPreview);
    avatar?.setAttribute('data-rig-test', pivotPreview ? 'arms' : '');
    avatar?.setAttribute('data-rig-debug', String(rigDebug));
    const poseButton = root.querySelector<HTMLButtonElement>('[data-action="toggle-rig-pose"]');
    const pivotButton = root.querySelector<HTMLButtonElement>('[data-action="toggle-rig-pivots"]');
    const debugButton = root.querySelector<HTMLButtonElement>('[data-action="toggle-rig-debug"]');
    if (poseButton) poseButton.textContent = rigPreview === 'seated' ? 'Preview standing rig' : 'Preview seated rig';
    if (pivotButton) pivotButton.textContent = pivotPreview ? 'Reset arm pivots' : 'Preview arm pivots';
    if (debugButton) debugButton.textContent = rigDebug ? 'Hide rig geometry' : 'Show rig geometry';
  };

  const setPreviewVisible = (visible: boolean) => {
    root.querySelector<HTMLElement>('[data-camera-shell]')?.classList.toggle('camera-visible', visible);
    const toggle = root.querySelector<HTMLButtonElement>('[data-action="toggle-debug"]');
    if (toggle) toggle.textContent = debugPreview ? 'Hide camera debug' : 'Show camera debug';
  };

  const setRoutineAvatar = (movement: RoutineSnapshot['movement']) => {
    const avatar = root.querySelector<HTMLElement>('[data-avatar]');
    if (!avatar) return;
    avatar.setAttribute('data-avatar', 'moving');
    avatar.setAttribute('data-routine-pose', movement);
  };

  const updateRoutine = (snapshot: RoutineSnapshot, frame: PoseFrame) => {
    const status = root.querySelector<HTMLElement>('[data-status]');
    const progress = root.querySelector<HTMLElement>('[data-progress]');
    if (!status || !progress) return;
    lastVerifierPhase = 'routine';
    setRoutineAvatar(snapshot.movement);
    setPreviewVisible(debugPreview || snapshot.phase === 'paused-tracking');
    if (snapshot.phase === 'paused-tracking') { status.textContent = 'Keep both shoulders and hands in view.'; progress.textContent = 'Routine progress is paused.'; return; }
    if (snapshot.phase === 'complete') { status.textContent = 'Movement break completed'; progress.textContent = 'Nice. Sit back down when you are ready.'; if (!routineCompleteTimer) routineCompleteTimer = window.setTimeout(() => { verifier.completeRoutine(); routineCompleteTimer = undefined; }, demoConfig.routineAdvanceDelayMs); return; }
    if (snapshot.phase === 'movement-complete') { status.textContent = 'Nice!'; progress.textContent = 'Moving to the next stretch…'; if (!routineAdvanceTimer) routineAdvanceTimer = window.setTimeout(() => { routine.advance(); routineAdvanceTimer = undefined; lastRoutineSecond = undefined; }, demoConfig.routineAdvanceDelayMs); return; }
    status.textContent = `${routineLabel(snapshot.movement)} · ${snapshot.instruction}`;
    const seconds = Math.max(0, Math.ceil((1 - snapshot.progress) * demoConfig.routineHoldDurationMs / 1_000));
    progress.textContent = snapshot.phase === 'holding' ? `Hold it · ${seconds} seconds` : 'Match the avatar to begin.';
    if (snapshot.phase === 'holding' && seconds !== lastRoutineSecond) { lastRoutineSecond = seconds; playRoutineTick(seconds <= 1); }
  };

  const updateVerification = (snapshot: VerifierSnapshot) => {
    const status = root.querySelector<HTMLElement>('[data-status]');
    const progress = root.querySelector<HTMLElement>('[data-progress]');
    if (!status || !progress) return;
    if (snapshot.phase === 'awaiting-rise' && lastVerifierPhase !== 'awaiting-rise') {
      promptStartedAt = performance.now();
      playNotification();
    }
    if (snapshot.phase !== 'awaiting-rise') promptStartedAt = undefined;
    lastVerifierPhase = snapshot.phase;

    root.querySelector<HTMLElement>('[data-avatar]')?.removeAttribute('data-routine-pose');
    if (snapshot.phase === 'paused-tracking') {
      setAvatar('inspect');
      setPreviewVisible(true);
      status.textContent = 'Keep both shoulders in view.';
      progress.textContent = 'Monitoring will continue when your stable baseline is visible.';
    } else if (snapshot.phase === 'baseline') {
      setAvatar('seated');
      setPreviewVisible(debugPreview);
      status.textContent = 'Hold still for a moment. MoveBreak is getting a baseline.';
      progress.textContent = `Getting ready… ${Math.round(snapshot.baselineProgress * 100)}%`;
    } else if (snapshot.phase === 'monitoring') {
      setAvatar('seated');
      setPreviewVisible(debugPreview);
      status.textContent = 'Monitoring';
      progress.textContent = `${Math.round(snapshot.inactivityProgress * 100)}% until a movement reminder`;
    } else if (snapshot.phase === 'awaiting-rise') {
      const justPrompted = promptStartedAt !== undefined && performance.now() - promptStartedAt < 700;
      setAvatar(justPrompted ? 'alert' : 'standing');
      setPreviewVisible(debugPreview);
      status.textContent = justPrompted ? 'Time to move' : 'Stand up';
      progress.textContent = justPrompted ? 'Stand up and move for a few seconds.' : 'Waiting for a clear rise.';
    } else if (snapshot.phase === 'routine') {
      setAvatar('standing');
      setPreviewVisible(debugPreview);
      status.textContent = 'Get ready to move';
      progress.textContent = 'Follow the avatar.';
    } else if (snapshot.phase === 'completed') {
      setAvatar('celebrate');
      setPreviewVisible(debugPreview);
      status.textContent = 'Break completed';
      progress.textContent = 'Nice. Sit back down when you are ready.';
    } else {
      setAvatar('seated');
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
          <p class="state-label">LOCAL MOVEMENT CHECK</p>
          <h1 class="readiness" data-status>${isLoading ? 'Opening your camera…' : 'Getting ready'}</h1>
          <p class="progress" data-progress>${isLoading ? '' : 'Getting ready… 0%'}</p>
          <div class="camera-shell" data-camera-shell>
            <video class="camera-preview" autoplay muted playsinline></video>
            <p>Local camera debug view</p>
          </div>
          ${isLoading ? '' : '<button class="text-button debug-toggle" type="button" data-action="toggle-debug">Show camera debug</button>'}
          ${isLoading ? '' : '<button class="text-button debug-toggle" type="button" data-action="toggle-rig-debug">Show rig geometry</button>'}
          <p class="privacy-note">Camera processing stays on your device.</p>
        </section>`;
      root.querySelector<HTMLButtonElement>('[data-action="toggle-debug"]')?.addEventListener('click', () => {
        debugPreview = !debugPreview;
        setPreviewVisible(debugPreview);
      });
      root.querySelector<HTMLButtonElement>('[data-action="toggle-rig-debug"]')?.addEventListener('click', () => {
        rigDebug = !rigDebug;
        updateRigPreview();
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
        ${!isError ? '<div class="rig-preview-controls"><button class="text-button" type="button" data-action="toggle-rig-pose">Preview standing rig</button><button class="text-button" type="button" data-action="toggle-rig-pivots">Preview arm pivots</button><button class="text-button" type="button" data-action="toggle-rig-debug">Show rig geometry</button></div>' : ''}
        <p class="privacy-note">Camera processing stays on your device. Nothing is recorded or uploaded.</p>
      </section>`;
    root.querySelector<HTMLButtonElement>('[data-action="enable-camera"]')?.addEventListener('click', enableCamera);
    root.querySelector<HTMLSelectElement>('[data-action="duration"]')?.addEventListener('change', (event) => {
      setInactivityDuration(Number((event.target as HTMLSelectElement).value));
    });
    root.querySelector<HTMLButtonElement>('[data-action="toggle-rig-pose"]')?.addEventListener('click', () => {
      rigPreview = rigPreview === 'seated' ? 'standing' : 'seated';
      updateRigPreview();
    });
    root.querySelector<HTMLButtonElement>('[data-action="toggle-rig-pivots"]')?.addEventListener('click', () => {
      pivotPreview = !pivotPreview;
      updateRigPreview();
    });
    root.querySelector<HTMLButtonElement>('[data-action="toggle-rig-debug"]')?.addEventListener('click', () => {
      rigDebug = !rigDebug;
      updateRigPreview();
    });
  };

  render();
};
