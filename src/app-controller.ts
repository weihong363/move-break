import { requestCamera, stopCamera } from './camera';
import { createAvatarRigDriver, type AvatarRigPose } from './avatar-rig';
import { demoConfig } from './config';
import { createMovementVerifier, type VerifierSnapshot } from './movement-verifier';
import { createPoseDetector } from './pose-detector';
import type { AppState } from './types';
import seatedRigUrl from './assets/translucent-seated-clean.png';
import standingRigUrl from './assets/translucent-standing-clean.png';

const inactivityLabel = (seconds: number) => `${seconds} second demo`;

const characterMarkup = () => `
  <div class="avatar layered-avatar" data-avatar="seated" data-avatar-motion="still" data-rig-test="" aria-hidden="true" style="--seated-art:url('${seatedRigUrl}');--standing-art:url('${standingRigUrl}')">
    <span class="seated-rig" data-rig-root>
      <span class="rig-layer rig-desk"></span><span class="rig-layer rig-torso"></span><span class="rig-layer rig-head"></span>
      <span class="rig-arm-parent rig-left-upper"><span class="rig-layer rig-left-forearm"></span></span>
      <span class="rig-arm-parent rig-right-upper"><span class="rig-layer rig-right-forearm"></span></span>
    </span>
    <span class="standing-rig">
      <span class="standing-transform">
        <span class="standing-layer standing-torso"></span>
        <span class="standing-layer standing-head"></span>
        <span class="standing-arm standing-left-upper"><span class="standing-layer standing-left-forearm"></span></span>
        <span class="standing-arm standing-right-upper"><span class="standing-layer standing-right-forearm"></span></span>
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
  let lastVerifierPhase: VerifierSnapshot['phase'] | undefined;
  let promptStartedAt: number | undefined;
  let notificationAudio: AudioContext | undefined;
  let cameraErrorMessage = 'MoveBreak needs camera access to start local movement monitoring.';
  const detector = createPoseDetector();
  const avatarRig = createAvatarRigDriver(demoConfig.smoothingWindow);
  let verifier = createVerifier();

  function createVerifier() {
    return createMovementVerifier({ ...demoConfig, inactivityDurationMs: state.inactivityDurationMs });
  }

  const resetMonitoring = () => {
    verifier = createVerifier();
    avatarRig.reset();
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
        const startsStanding = snapshot.phase === 'awaiting-rise' && lastVerifierPhase !== 'awaiting-rise';
        if (startsStanding) avatarRig.reset();
        const rigPose = ['awaiting-rise', 'moving', 'completed'].includes(snapshot.phase) ? avatarRig.update(frame) : undefined;
        updateVerification(snapshot, rigPose);
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

  const applyStandingRig = (pose: AvatarRigPose | undefined) => {
    if (!pose) return;
    const avatar = root.querySelector<HTMLElement>('[data-avatar]');
    if (!avatar) return;
    const transforms = {
      torso: pose.torso, head: pose.head, 'left-upper': pose.leftUpperArm, 'left-forearm': pose.leftForearm,
      'right-upper': pose.rightUpperArm, 'right-forearm': pose.rightForearm,
    };
    Object.entries(transforms).forEach(([part, transform]) => {
      avatar.style.setProperty(`--${part}-x`, `${transform.x}px`);
      avatar.style.setProperty(`--${part}-y`, `${transform.y}px`);
      avatar.style.setProperty(`--${part}-rotate`, `${transform.rotate}deg`);
      avatar.style.setProperty(`--${part}-scale`, String(transform.scale));
    });
  };

  const updateRigPreview = () => {
    const avatar = root.querySelector<HTMLElement>('[data-avatar]');
    avatar?.setAttribute('data-avatar', rigPreview);
    avatar?.setAttribute('data-rig-test', pivotPreview ? 'arms' : '');
    const poseButton = root.querySelector<HTMLButtonElement>('[data-action="toggle-rig-pose"]');
    const pivotButton = root.querySelector<HTMLButtonElement>('[data-action="toggle-rig-pivots"]');
    if (poseButton) poseButton.textContent = rigPreview === 'seated' ? 'Preview standing rig' : 'Preview seated rig';
    if (pivotButton) pivotButton.textContent = pivotPreview ? 'Reset arm pivots' : 'Preview arm pivots';
  };

  const setPreviewVisible = (visible: boolean) => {
    root.querySelector<HTMLElement>('[data-camera-shell]')?.classList.toggle('camera-visible', visible);
    const toggle = root.querySelector<HTMLButtonElement>('[data-action="toggle-debug"]');
    if (toggle) toggle.textContent = debugPreview ? 'Hide camera debug' : 'Show camera debug';
  };

  const updateVerification = (snapshot: VerifierSnapshot, rigPose?: AvatarRigPose) => {
    const status = root.querySelector<HTMLElement>('[data-status]');
    const progress = root.querySelector<HTMLElement>('[data-progress]');
    if (!status || !progress) return;
    if (snapshot.phase === 'awaiting-rise' && lastVerifierPhase !== 'awaiting-rise') {
      promptStartedAt = performance.now();
      playNotification();
    }
    if (snapshot.phase !== 'awaiting-rise') promptStartedAt = undefined;
    lastVerifierPhase = snapshot.phase;
    if (['awaiting-rise', 'moving', 'completed'].includes(snapshot.phase)) applyStandingRig(rigPose);

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
    } else if (snapshot.phase === 'moving') {
      setAvatar('moving', snapshot.avatarMotion);
      setPreviewVisible(debugPreview);
      status.textContent = 'Keep moving';
      const seconds = Math.max(0, Math.ceil((1 - snapshot.movementProgress) * demoConfig.movementDurationMs / 1_000));
      progress.textContent = `${seconds} seconds remaining`;
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
        ${!isError ? '<div class="rig-preview-controls"><button class="text-button" type="button" data-action="toggle-rig-pose">Preview standing rig</button><button class="text-button" type="button" data-action="toggle-rig-pivots">Preview arm pivots</button></div>' : ''}
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
  };

  render();
};
