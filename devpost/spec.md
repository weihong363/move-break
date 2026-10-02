---
doc: spec
status: approved
---

# MoveBreak — Technical Specification

## How This Works, In Plain Language

MoveBreak is one static browser app. The timer controls when a break begins. At that point the camera module asks for permission and sends video frames to an on-device pose model. The verifier smooths visible upper-body landmarks, establishes a still baseline, confirms a sustained upward torso movement, then confirms continued general movement. It advances a small state machine only while the landmarks are usable. The UI controller renders the corresponding message and progress.

This keeps the kernel real—camera-verified movement—without a server, stored data, exercise classifier, or precise seated-pose requirement. A local technical spike is the first build stage: MediaPipe Pose Landmarker remains the implementation unless MoveNet proves materially simpler or more reliable for this exact sequence.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`.

1. **Start** sets the app state to `working` and the timer module counts down from the configurable work duration.
2. At zero, the UI changes to `camera-permission`; no camera stream exists before this point.
3. **Enable camera** calls the browser camera API. On success, the preview receives the stream and the pose detector loads/runs locally. On rejection or failure, state is `camera-required` and the break remains incomplete.
4. The detector emits landmarks with a timestamp. The verifier accepts only frames with sufficient visible torso/upper-body landmarks, smooths them in a rolling window, and collects the baseline for 1.5 seconds by default.
5. From the baseline, the verifier looks for a sustained upward torso-center displacement normalized by torso scale. It enters `moving` only after the rise condition persists across several frames; a one-frame spike is ignored.
6. In `moving`, a normalized, smoothed multi-landmark displacement score accumulates valid movement time only while landmark coverage and tracking quality remain sufficient. Brief natural pauses or individual low-motion frames do not erase prior progress; invalid tracking pauses it. Four qualifying seconds complete the break by default.
7. The UI shows `completed` and enables **Start next session**. It stops the camera stream and returns to the initial timer state only when the user starts again.

## Stack

- **TypeScript + Vite** — learner-selected lightweight browser build and static output. [Vite documentation](https://vite.dev/guide/) and [static deployment guide](https://vite.dev/guide/static-deploy).
- **Native HTML, CSS, and DOM rendering** — no UI framework; one controlled render function is enough for this one-screen stateful flow.
- **MediaDevices `getUserMedia()`** — requests a video-only `MediaStream` when the break starts. [MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- **`@mediapipe/tasks-vision` Pose Landmarker** — preferred local landmark detector, configured for one pose and video frames. The app bundles a compatible pose model as a static asset. [MediaPipe web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).
- **No backend or persistence** — all operational data lives only in memory for the current page session.

The technical spike must confirm the browser build can load the model asset and that the detector produces usable upper-body landmarks from the development camera. MediaPipe's web video detection is synchronous, so the first implementation throttles inference to a modest frame rate; only measurable UI jank justifies moving detection to a worker.

## Where It Runs and How Someone Tries It

- Runs in a modern desktop browser on `localhost` during development. Camera access requires a secure context; `localhost` is suitable for development and the deployed site must use HTTPS.
- No API key, account, server, or data store is required.
- Install dependencies with `pnpm install`, then run `pnpm dev` and open the local Vite URL.
- For the demo, use the default 10-second work duration, remain still for roughly 1.5 seconds after enabling the camera, stand, then move for 4 seconds. Record this local flow for the submission video.
- After the local end-to-end flow is stable, deploy the Vite static output to Vercel or GitHub Pages. Deployment is optional and supplements, not replaces, the required video and public repository.

## Look and Feel

Implements `prd.md > Look and Feel`. CSS custom properties define a warm cream background, muted green primary color, and limited warm orange active/success color. Use a clean soft sans-serif system font stack, large timer numerals, rounded controls, spacious layout, and low-contrast borders. Copy remains supportive and short. A small CSS/SVG stick figure is optional and must not delay the working verification path.

## Components

### App Controller

Owns the application state and a single render path for the timer and break layouts. It translates timer, camera, and verifier events into user-visible messages. Implements `prd.md > Screens and Layout` and `prd.md > Feedback and recovery`.

### Timer

Starts, ticks, pauses, resets, and finishes the work countdown. It reads the configurable work duration and emits completion once. Implements `prd.md > Features and Behavior > Work session`.

### Camera

Requests video-only access only after **Enable camera**, attaches the resulting stream to the preview, exposes frames to the detector, and stops tracks on completion, reset, or retry. It maps permission and device errors to the required plain-language UI state. Implements `prd.md > States and Boundaries`.

### Pose Detector

Loads MediaPipe Pose Landmarker and the static model asset, processes throttled video frames, and returns timestamped landmarks. It has no product decision logic and reports no-pose or unusable-frame results to the verifier. Implements `prd.md > Features and Behavior > Movement verification`.

### Movement Verifier

Owns the finite states `baseline`, `awaiting-rise`, `moving`, `paused-tracking`, and `completed`. It smooths usable landmarks, derives torso center and body scale from shoulders and hips, detects a sustained rise, then measures general movement across visible upper-body landmarks. It never advances while coverage or tracking quality is too low. Implements `prd.md > Features and Behavior > Movement verification`.

### Configuration

Exports one typed configuration object for defaults and tuning: work duration (10 seconds), baseline window (1.5 seconds), movement duration (4 seconds), rolling-window size, required landmark coverage, rise displacement, movement score, and required consecutive rise frames. It keeps tuning explicit and avoids a complex scoring system.

## Data Model

All state is in memory and resets on page refresh.

```ts
type AppPhase =
  | 'ready'
  | 'working'
  | 'camera-permission'
  | 'baseline'
  | 'awaiting-rise'
  | 'moving'
  | 'paused-tracking'
  | 'camera-required'
  | 'completed';

type DemoConfig = {
  workDurationMs: number;
  baselineDurationMs: number;
  movementDurationMs: number;
  smoothingWindow: number;
  minimumUsableLandmarks: number;
  riseThreshold: number;
  movementThreshold: number;
  consecutiveRiseFrames: number;
};
```

- **Timer state**: phase, remaining work milliseconds, and selected configuration. Updated by user actions and timer ticks; not persisted.
- **Camera state**: active `MediaStream` and error category. Created only during a break and released when that break ends.
- **Landmark samples**: a bounded rolling window of timestamped, visible torso/upper-body landmark coordinates. Discarded as it slides.
- **Verifier state**: baseline torso-center statistic, stable multi-frame rise confirmation count, accumulated valid movement time, and tracking pause status. It is derived from current samples and resets for each break.

### Signal Rules

Torso center is the midpoint or average of usable shoulder and hip landmarks. Body scale is the shoulder-to-hip distance when available; if hips are unavailable, a stable upper-body fallback scale is used. Rise is a decrease in image-space torso-center `y` from the baseline, divided by current body scale, sustained over the configured frame count. General movement is the mean smoothed frame-to-frame displacement of visible shoulders, hips, elbows, and wrists, normalized by body scale.

The verifier requires a configurable minimum number of visible landmarks. A rise requires stable confirmation across the configured consecutive frames, not a single threshold crossing. Missing coverage, no detected person, or detector confidence below the selected quality threshold pauses movement-time accumulation and tells the UI to request better framing or movement. Brief low-motion frames do not clear accumulated valid movement time. The verifier resets only when the user retries or restarts.

## File Structure

```text
move-break/
├── devpost/                     # Approved planning artifacts
├── public/
│   └── models/pose_landmarker.task  # Bundled MediaPipe-compatible model asset
├── src/
│   ├── main.ts                  # Bootstrap and DOM event wiring
│   ├── styles.css               # Global visual system and layouts
│   ├── app-controller.ts        # App phase transitions and rendering
│   ├── config.ts                # Typed demo and verifier thresholds
│   ├── types.ts                 # Shared app, landmark, and verifier types
│   ├── timer.ts                 # Work countdown behavior
│   ├── camera.ts                # MediaDevices lifecycle and preview setup
│   ├── pose-detector.ts         # MediaPipe initialization and frame detection
│   ├── movement-verifier.ts     # Baseline, rise, and movement state machine
│   └── movement-verifier.test.ts # Deterministic verifier tests using sample landmarks
├── index.html                   # Vite entry page
├── package.json                 # Scripts and dependencies
├── tsconfig.json                # TypeScript configuration
└── vite.config.ts               # Static build configuration
```

## External Services and Dependencies

- **Browser camera**: `navigator.mediaDevices.getUserMedia({ video: true, audio: false })`; no key, account, or cost. Browser permission and an available camera are required. [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- **MediaPipe Pose Landmarker**: `@mediapipe/tasks-vision` plus one static `.task` model file, initialized with `runningMode: 'VIDEO'` and one pose. No API call, cloud inference, key, rate limit, or recurring cost. [Official web setup and configuration](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).
- **Static host, later**: Vercel or GitHub Pages serves the built files over HTTPS. No server-side application behavior is needed. [Vite deployment options](https://vite.dev/guide/static-deploy).

## Important Failure Modes

- **Permission denied, no camera, or insecure deployment** → show that camera verification is required, keep the break incomplete, and provide retry guidance.
- **No usable pose or inadequate framing** → pause verification and show “Step back so your upper body is visible”; do not progress or expose debug data.
- **Temporary landmark-quality drop** → retain the current verifier stage but stop its progress timer until usable landmarks return.
- **Detector blocks the interface on a slow machine** → lower the inference cadence first; move to a worker only if the technical spike shows that throttling is insufficient.

## What Was Simplified and Why

- **One general movement verifier** instead of exercise classification or form scoring — it directly proves `scope.md > The Unique Kernel`.
- **Upper-body and torso signals** instead of mandatory full-body or seated-pose detection — desk occlusion and camera framing can hide legs.
- **One in-memory state controller** instead of a UI framework or global store — one page and one loop do not need more infrastructure.
- **Configurable constants** instead of adaptive calibration or a learned score — rapid demo tuning is more valuable than biomechanical precision.
- **Local recording first** instead of a required deployed environment — deployment does not improve the core proof and comes after it works locally.

## Decisions and Open Issues

- **Learner decision:** use TypeScript, Vite, native HTML/CSS, MediaDevices, local-only inference, and static hosting after local validation.
- **Learner decision:** prefer MediaPipe Pose Landmarker; consider MoveNet only if the first technical spike produces evidence that it is materially easier or more reliable for baseline → rise → movement.
- **Learner decision:** use the accepted 10-second work, 1.5-second baseline, and 4-second movement defaults, all exposed in `config.ts`.
- **Learner decision:** normalize torso-rise and multi-landmark motion signals by body scale, smooth with a short rolling window, require usable coverage, and ignore single-frame spikes.
- **Clarified uncertainty:** reliable seated classification is not required. The agreed fallback is low-movement baseline → normalized torso rise → sustained general movement, which the first spike will verify against the available camera framing.
- **Implementation check before UI integration:** confirm model asset loading, usable landmarks, and threshold behavior with live camera input. MoveNet is evaluated only if this check fails materially.
