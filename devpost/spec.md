---
doc: spec
status: approved
---

# MoveBreak technical specification

## Product and runtime

The primary product is a local macOS Electron companion with three surfaces: companion, menu bar, and dedicated Settings. TypeScript + Vite + native HTML/CSS render the UI. MediaDevices supplies video-only camera frames; bundled MediaPipe Pose Landmarker performs local inference. No backend, cloud inference, account, analytics, or camera/pose history.

The browser app remains a development prototype. Static hosting is optional and does not provide the native desktop surfaces. The early MediaPipe spike is complete; no model training or alternate detector is planned.

## Architecture

- `electron/main.mts`: singleton companion and Settings windows, retained Tray, secure asset protocol, camera permission, validated settings, launch-at-login and allowlisted IPC.
- `electron/preload.cts`: sandboxed typed bridge for settings, status, commands, camera access, window controls and dragging. Context isolation on; Node integration off.
- `src/app-controller.ts`: camera lifecycle, verifier handoff, presentation, audio and desktop status.
- `src/movement-verifier.ts`: baseline → monitoring → awaiting-rise → routine → awaiting-return. Unusable tracking reports a paused snapshot without advancing the underlying phase.
- `src/routine-verifier.ts`: demonstration → accumulated valid hold → step success → next movement → routine complete.
- `src/pose-detector.ts`: one pose, VIDEO mode, synchronous inference throttled to approximately one frame per 150 ms; detection/presence/tracking confidence 0.5.
- `src/window-drag.ts`: pointer capture sends start/move/end coordinates through validated IPC. Main moves the window by the pointer delta; controls and camera debug view are excluded.
- `src/settings-window.ts`, `src/desktop-settings.ts`: draft form, explicit save and validated local preferences.
- `src/sound.ts`: local synthesized feedback; audio failure never blocks verification.

`movebreak://app` serves bundled renderer files, `/wasm`, and `/models/pose_landmarker_lite.task` in a secure context. External window opening/navigation is blocked. Media permission is restricted to the companion's video capture.

## Camera and cycle boundaries

1. First use requires Enable camera and macOS permission. Denial/device/model errors show actionable guidance. A retry cannot reset an OS-denied permission.
2. Later launches automatically start camera monitoring when permission is already granted. Pause releases the detector and camera; resume establishes a new baseline.
3. Baseline collection uses the user's current desk position and distance, with both shoulders visible. Hips are optional. The user is expected to begin seated; this is not a seated-pose classifier.
4. Monitoring counts valid time toward the configured reminder; small seated hand/head/body movement does not reset it.
5. At the reminder, the cyan standing cue remains visible until a stable rise is confirmed. No routine pose may complete before that handoff.
6. Each selected movement accumulates matched time. Mismatch or invalid landmarks pauses progress rather than clearing the hold. A 650 ms step-success interval precedes automatic advancement.
7. Completion immediately begins seated-return detection, with the cyan neutral cue and “Sit down when ready”. Preserve the original baseline while the user remains standing.
8. A stable return near that baseline resets reminder time to zero and plays the new-cycle chime. Every cycle requires a new rise and the full selected routine.

Hiding or closing the companion keeps the process/camera active; Quit stops the app. Background throttling is disabled, but hidden-window inference cadence still requires a native experience check.

## Landmark rules and current thresholds

All thresholds are heuristics for a demo, not exercise scoring. Positions use a four-frame rolling average. Required landmark visibility is 0.55.

| Signal | Implemented rule / default |
| --- | --- |
| Baseline | Collect 1,500 ms of usable shoulder frames; capture smoothed torso height and shoulder width. No explicit stillness gate currently. |
| Scale | Shoulder-to-hip distance if both hips are usable; otherwise shoulder width. |
| Rise | `(baseline torso Y − current torso Y) / scale ≥ 0.16` for three consecutive usable frames. |
| Seated return | Torso distance from baseline / scale ≤ 0.16, shoulder motion ≤ 0.025, at least three confirming frames and 750 ms settled time. |
| Overhead Reach | Both wrists visible and above their shoulders by at least 0.30 shoulder widths. |
| Side Bend Left/Right | Anatomical direction, independent of mirrored preview. Shoulder-line tilt change ≥ 0.15, or shoulder-center/hip-center lateral shift change ≥ 0.15 shoulder widths. Hip-free tilt fallback permits one arm overhead. Reference captured at routine start. |
| Torso Rotation | Shoulder depth difference / width ≥ 0.20 gives direction; shoulder width ≤ 0.78 of the routine reference is a coarse turn fallback. Hold either direction first, then its opposite. Each side requires the configured hold duration. |

The monitor/rise/return verifier excludes frame gaps longer than 500 ms and pauses on missing shoulders. The routine verifier clears its timestamp on missing required landmarks; it currently has no equivalent long-gap cutoff. See validation gaps below.

## Configuration and persistence

User settings persist only in Electron `userData/settings.json`. Operational phase, baseline, pose samples and hold time remain in memory and reset on restart.

| Setting | Default / allowed values |
| --- | --- |
| Reminder | 25 minutes / integer 1–120 |
| Movements | 4 / first 1–4 movements in fixed routine order |
| Hold | 3 seconds / integer 1–15; rotation applies this to each side |
| Sound | On |
| Always on top / show companion | On / On |
| Launch at login | Off; packaged macOS app only |
| Developer demo / camera debug | Off / Off; collapsed section |

Developer demo overrides the reminder with 5 seconds. Baseline/rise/return/gap parameters live in `src/config.ts`; routine match thresholds currently live in `makeRoutine()` in `src/app-controller.ts`. They are code tuning values, not additional Settings controls.

Save settings validates and persists the draft, applies native window/startup options, and refreshes the companion. Reminder progress resets while preserving the session's original seated baseline; an active routine restarts using the new count/hold values. Save does not request camera permission again.

## Presentation and audio

- Companion: fixed 320 × 480 footprint in every normal state, no scrollbar; opaque cream content with transparent rounded corners. No dashboard or settings controls.
- Red and yellow controls both hide to the menu-bar entry; neither quits. No third maximize button. Noninteractive background, artwork and text support explicit pointer dragging.
- Monitoring uses the static seated artwork. Stand prompt and seated-return wait use the cyan neutral figure. Four movement cues use the approved colorful 6 × 4 atlas with 1.8–2-second frame loops, transitions and target holds. Per-frame anchor offsets maintain figure position; no single-image pulsing or live mirrored rig.
- Webcam hidden by default. Developer debug enables preview; tracking loss keeps the current cue and adds a short guidance message.
- Monitoring countdown shows minutes and seconds (`M:SS`); routine shows matched/hold progress and brief success feedback.
- Application icon retains the supplied green figure inside a white rounded tile with transparent exterior. Tray uses the corresponding black transparent template silhouette, no MB title. Stable Tray identity preserves placement; its initial preferred position is near the right edge to avoid the center notch.
- Sounds: reminder, movement start, matched pose, ongoing matched beat (750 ms), countdown ticks/final tick, step completion, full completion and distinct new-cycle chime. Full completion reuses the reminder melody. Sound is deduplicated across frames; mismatch/tracking loss pauses ongoing feedback. Current tone gain is twice the initial implementation. No downloaded video audio is used.

## Build and verification

- `pnpm install` then `pnpm dev`: browser development.
- `pnpm test`: current suite has 30 tests across five files, covering verifier/routine/sound/settings behavior.
- `pnpm desktop:build`: renderer and Electron main/preload TypeScript builds.
- `pnpm desktop:package`: local architecture-specific macOS `.app` in `release/`, with camera usage description and ICNS icon. Signing, notarization and an installer are outside the current local demo.
- Development-only `?preview` exercises presentation states without camera verification; it is not evidence of live pose matching.

Native smoke checks have covered local camera/model loading, separate Settings/save refresh, explicit dragging with actual position changes, hide controls and Tray placement metadata. Final acceptance still needs a complete repeated native routine, hidden-window monitoring, the latest visible icons/Tray menu, and launch-at-login at the final installed location. Unit tests do not establish real-camera reliability.

## Known implementation and validation gaps

1. **Sedentary semantics:** monitoring currently counts all usable shoulder frames without checking baseline-relative standing/movement. The intended behavior counts seated time and ignores small seated movements, but standing before the prompt can still count. Do not describe this as robust continuous seated classification; validate/fix this within the existing heuristic scope before claiming that behavior.
2. **Rotation fallback:** shoulder-width contraction detects a turn but cannot identify both opposite directions. The second side needs a usable shoulder-depth signal; test this with the demo camera before claiming a hip-free two-sided rotation always works.
3. **Routine timing gaps:** long inference interruptions may be credited to a matched hold because the routine lacks the monitor's 500 ms gap guard. Validate interruptions before final demo acceptance.
4. **Camera stability:** initial standing, camera relocation, and changes in hip visibility can distort baseline-relative rise/return. Initial seated setup and a stationary camera remain demo assumptions.
5. **Native lifecycle:** confirm hidden monitoring, audio after automatic startup, Tray accessibility on the actual menu bar, and login launch. These remain experience checks, not additional product features.
