---
doc: spec
status: approved
---

# MoveBreak — Technical Specification

## How This Works, In Plain Language

MoveBreak is one static browser app. The user explicitly enables the camera at the start of a monitoring session, and video frames stay on-device for pose analysis. The verifier learns a stable baseline from the user's current desk position using visible shoulders, accumulates seated/stationary time through small movement, then prompts a break. It confirms a sustained upward torso movement and runs a four-pose desk-relief routine before waiting for a return near the original seated baseline. It advances only while the landmarks required by the current pose are usable.

This keeps the kernel real—camera-verified movement—without a server, stored data, exercise classifier, or precise seated-pose requirement. A local technical spike is the first build stage: MediaPipe Pose Landmarker remains the implementation unless MoveNet proves materially simpler or more reliable for this exact sequence.

## The Core Journey Through the System

Implements `prd.md > The Core Journey`.

1. **Enable camera** moves the app to `camera-loading`, requests camera access, attaches the stream to a hidden local preview, and starts local pose detection. On rejection or failure, state is `camera-required`.
2. The detector emits landmarks with a timestamp. The verifier accepts frames with both shoulders visible, smooths them, and collects a 1.5-second baseline at the user's current camera distance and seated position.
3. After the baseline, it accumulates valid seated/stationary time. The short demo default triggers a movement prompt after 5 seconds.
4. From the same active camera session, the verifier looks for a sustained upward torso-center displacement normalized by torso scale. It enters `routine` only after the rise condition persists across several frames; a one-frame spike is ignored.
5. The routine verifier checks four three-second holds: both wrists above shoulders, shoulder center left of hips, shoulder center right of hips, then opposite torso-rotation directions using shoulder depth or visible width change. Brief pose loss or invalid tracking pauses hold progress without clearing it.
6. The character-led UI shows `completed`, then waits for a stable return near the original seated baseline before resetting the inactivity monitor and resuming monitoring in the active camera session. A debug toggle reveals the preview for demo proof; tracking recovery reveals it automatically. A small Web Audio notification plays when the prompt begins.

## Stack

- **TypeScript + Vite** — learner-selected lightweight browser build and static output. [Vite documentation](https://vite.dev/guide/) and [static deployment guide](https://vite.dev/guide/static-deploy).
- **Native HTML, CSS, and DOM rendering** — no UI framework; one controlled render function is enough for this one-screen stateful flow.
- **MediaDevices `getUserMedia()`** — requests a video-only `MediaStream` when the user starts monitoring. [MDN reference](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).
- **`@mediapipe/tasks-vision` Pose Landmarker** — preferred local landmark detector, configured for one pose and video frames. The app bundles a compatible pose model as a static asset. [MediaPipe web guide](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js).
- **No backend or persistence** — all operational data lives only in memory for the current page session.

The technical spike must confirm the browser build can load the model asset and that the detector produces usable upper-body landmarks from the development camera. MediaPipe's web video detection is synchronous, so the first implementation throttles inference to a modest frame rate; only measurable UI jank justifies moving detection to a worker.

## Where It Runs and How Someone Tries It

- Runs in a modern desktop browser on `localhost` during development. Camera access requires a secure context; `localhost` is suitable for development and the deployed site must use HTTPS.
- No API key, account, server, or data store is required.
- Install dependencies with `pnpm install`, then run `pnpm dev` and open the local Vite URL.
- For the demo, enable the camera, remain still for roughly 1.5 seconds to establish a baseline, remain inactive for the 5-second demo threshold, then stand and move for 4 seconds. Record this local flow for the submission video.
- After the local end-to-end flow is stable, deploy the Vite static output to Vercel or GitHub Pages. Deployment is optional and supplements, not replaces, the required video and public repository.

## Look and Feel

Implements `prd.md > Look and Feel`. CSS custom properties define a warm cream background, muted green primary color, and limited warm orange active/success color. Use a clean soft sans-serif system font stack, rounded controls, spacious layout, and low-contrast borders. Copy remains supportive and short. A small CSS/SVG stick figure is optional and must not delay the working verification path.

## Components

### App Controller

Owns monitoring, prompt, and verification UI state. It translates camera, detector, and verifier events into user-visible messages. Implements `prd.md > Screens and Layout` and `prd.md > Feedback and recovery`.

### Companion Avatar

Uses the translucent cyan human artwork supplied by the learner. The seated front-facing rig remains static. The standing rig has been rebuilt from a neutral head, singular torso, and four straight capsule arm segments; it has a fixed hierarchy: torso → head, left upper arm → left forearm, and right upper arm → right forearm. Upper arms rotate only around shoulder pivots; forearms inherit their upper-arm transform and rotate locally around elbow pivots. The static rig and its geometry overlay are the current implementation checkpoint. The MediaPipe transform adapter remains disconnected until the learner accepts this neutral reconstruction. During movement, a coarse arm-displacement signal adds responsive glow. The browser Web Audio API synthesizes a brief two-note prompt sound after the user has enabled monitoring. No animation library or new service is required.

### Camera

Requests video-only access after **Enable camera**, attaches the resulting stream to the preview, exposes frames to the detector, and stops tracks only when monitoring ends, reset, or retry requires it. It maps permission and device errors to the required plain-language UI state. Implements `prd.md > States and Boundaries`.

### Pose Detector

Loads MediaPipe Pose Landmarker and the static model asset, processes throttled video frames, and returns timestamped landmarks. It has no product decision logic and reports no-pose or unusable-frame results to the verifier. Implements `prd.md > Features and Behavior > Movement verification`.

### Movement Verifier

Owns the finite states `baseline`, `monitoring`, `awaiting-rise`, `routine`, `awaiting-return`, `paused-tracking`, and `completed`. It smooths usable landmarks, derives torso center and body scale from shoulders and hips, and accumulates seated/stationary time through small upper-body movement. It hands off to the routine verifier after a stable rise, then waits for the user to return near their original seated baseline before restarting monitoring. It never advances while coverage or tracking quality is too low. Implements `prd.md > Features and Behavior > Inactivity monitoring` and `Movement verification`.

### Configuration

Exports one typed configuration object for defaults and tuning: baseline window (1.5 seconds), inactivity threshold (5 seconds), movement duration (4 seconds), rolling-window size, rise and return displacement, movement score, and required consecutive confirmation frames. It keeps tuning explicit and avoids a complex scoring system.

## Data Model

All state is in memory and resets on page refresh.

```ts
type AppPhase =
  | 'ready'
  | 'camera-permission'
  | 'baseline'
  | 'monitoring'
  | 'break-prompted'
  | 'awaiting-rise'
  | 'routine'
  | 'paused-tracking'
  | 'camera-required'
  | 'completed';

type DemoConfig = {
  inactivityDurationMs: number;
  baselineDurationMs: number;
  routineHoldDurationMs: number;
  smoothingWindow: number;
  riseThreshold: number;
  returnThreshold: number;
  overheadReachThreshold: number;
  sideBendThreshold: number;
  rotationWidthThreshold: number;
  rotationDepthThreshold: number;
  consecutiveRiseFrames: number;
};
```

- **Inactivity state**: phase, accumulated valid low-movement milliseconds, and selected configuration. Updated by user actions and reliable landmark frames; not persisted.
- **Camera state**: active `MediaStream` and error category. Created when monitoring starts and remains active across the completed break reset.
- **Landmark samples**: a bounded rolling window of timestamped, visible torso/upper-body landmark coordinates. Discarded as it slides.
- **Verifier state**: original seated torso-center statistic, stable multi-frame rise and return confirmation counts, accumulated valid movement time, and tracking pause status. The seated reference persists for the camera session; rise confirmation and movement time reset whenever the user returns to it, so every break uses the same mechanism.

### Signal Rules

Torso center is the midpoint or average of usable shoulder and hip landmarks. Body scale is the shoulder-to-hip distance when available; if hips are unavailable, a stable upper-body fallback scale is used. Rise is a decrease in image-space torso-center `y` from the baseline, divided by current body scale, sustained over the configured frame count. General movement is the mean smoothed frame-to-frame displacement of visible shoulders, hips, elbows, and wrists, normalized by body scale.

The verifier uses both visible shoulders as the minimum reliable reference, so it does not prescribe a camera distance or require the full upper body. The short baseline learns the user's own stable seated position and shoulder width. During monitoring, visible hand, head, and other small upper-body movement keeps accumulating inactivity time. A rise requires stable confirmation across the configured consecutive frames, not a single threshold crossing. After break completion, the original baseline remains authoritative: the verifier waits for a stable return within the configured normalized distance before resetting the inactivity timer. Missing shoulders, no detected person, or detector confidence below the selected quality threshold pauses all timing. Brief low-motion frames do not clear accumulated valid movement time.

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
│   ├── routine-verifier.ts       # Four-pose local routine state machine and landmark rules
│   ├── config.ts                # Typed demo and verifier thresholds
│   ├── types.ts                 # Shared app, landmark, and verifier types
│   ├── camera.ts                # MediaDevices lifecycle and preview setup
│   ├── pose-detector.ts         # MediaPipe initialization and frame detection
│   ├── movement-verifier.ts     # Baseline, low-movement, rise, and movement state machine
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

- **Permission denied, no camera, or insecure deployment** → show that local monitoring cannot start, and provide retry guidance. When the browser retains a denied permission, explain that the user must re-allow the camera in browser settings before retrying.
- **No usable pose or inadequate framing** → pause verification and ask the user to keep both shoulders in view; do not progress or expose debug data.
- **Temporary landmark-quality drop** → retain the current verifier stage but stop its progress timer until usable landmarks return.
- **Detector blocks the interface on a slow machine** → lower the inference cadence first; move to a worker only if the technical spike shows that throttling is insufficient.

## What Was Simplified and Why

- **One heuristic monitor and movement verifier** instead of posture classification or form scoring — it directly proves `scope.md > The Unique Kernel`.
- **Upper-body and torso signals** instead of mandatory full-body or seated-pose detection — desk occlusion and camera framing can hide legs.
- **One in-memory state controller** instead of a UI framework or global store — one page and one loop do not need more infrastructure.
- **Configurable constants** instead of adaptive calibration or a learned score — rapid demo tuning is more valuable than biomechanical precision.
- **Local recording first** instead of a required deployed environment — deployment does not improve the core proof and comes after it works locally.
- **Static canonical art rigs before landmark driving** — the seated and standing translucent rigs must reconstruct from a shared canvas and pass manual pivot checks before MediaPipe transforms are re-enabled.
- **Clean compositing before glow** — the rig uses no per-part halo. Source layers preserve internal glass transparency only, use feathered masks with joint overlap, and receive one final drop shadow at the assembled avatar container.

## Decisions and Open Issues

- **Learner decision:** use TypeScript, Vite, native HTML/CSS, MediaDevices, local-only inference, and static hosting after local validation.
- **Learner decision:** prefer MediaPipe Pose Landmarker; consider MoveNet only if the first technical spike produces evidence that it is materially easier or more reliable for baseline → rise → movement.
- **Learner decision:** use 1.5-second baseline, 5-second demo inactivity, and 4-second movement defaults, all exposed in `config.ts`.
- **Learner decision:** normalize torso-rise and multi-landmark motion signals by body scale, smooth with a short rolling window, require usable coverage, and ignore single-frame spikes.
- **Clarified uncertainty:** reliable seated classification is not required. The agreed fallback is low-movement baseline → normalized torso rise → four coarse upper-body pose holds, which the first spike will verify against the available camera framing.
- **Implementation check before UI integration:** confirm model asset loading, usable landmarks, and threshold behavior with live camera input. MoveNet is evaluated only if this check fails materially.
- **Avatar implementation checkpoint:** static seated and standing reconstruction plus manual pivot previews were accepted. MediaPipe now drives only the standing rig during rise and movement verification; seated monitoring remains static.
