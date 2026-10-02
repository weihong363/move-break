---
doc: prd
status: approved
---

# MoveBreak — Product Requirements

A friendly, local-first break timer for desk workers that confirms a short movement break before starting the next work session. Source: `scope.md > The Unique Kernel`, `The Core Loop`, and `The POC Boundary`.

## The Core Journey

1. The user opens MoveBreak and sees a simple work-timer home screen; the camera is inactive.
2. They select or retain a short demo-friendly work duration and press **Start**.
3. The app shows the countdown and **Work session** state. Pause and reset, if present, remain secondary.
4. At zero, the app transitions to the movement-break screen and explains why camera access is needed.
5. The user presses **Enable camera**, grants permission, and sees a live preview. Without permission, the movement break cannot be completed.
6. The app establishes a low-movement or seated baseline, asks the user to stand or clearly rise, then acknowledges the detected transition.
7. The user continues general visible movement until a short configurable duration is met.
8. The app shows **Movement break completed**. The user explicitly presses **Start next session** to begin again.

## Screens and Layout

### Work timer

- App name, large central timer, and current state have visual priority.
- The primary action is **Start** before a session and the prominent countdown during one.
- A small secondary duration control supports short development and demo runs.
- A short bottom note explains that the later break asks the user to move and that camera processing remains on-device.
- The first screen never requests camera permission; it has no dashboard, stats, streaks, exercise library, or account controls.

### Movement break

- One consistent layout: **Movement break** title, camera preview, one primary instruction, lightweight progress/status indicator, and local-processing privacy note.
- No extra navigation or settings appear during verification.
- Permission state shows **Time to move**, an **Enable camera** action, and a simple local-only explanation.
- Baseline state says **Hold still for a moment** and visibly shows progress.
- Rise state says **Stand up** or **Now get up and move**; a detected rise immediately changes the feedback to **Nice — keep moving**.
- Sustained-movement state shows remaining time or equivalent progress without requiring a specific exercise.
- Completion state shows a visible success indicator, **Movement break completed**, supporting encouragement, and **Start next session**.

## Look and Feel

Warm, calm, playful desktop-companion feel: a warm off-white or cream background, muted green as the primary accent, and limited warm orange for active or success moments. Use rounded cards and controls, generous whitespace, minimal borders, and a clean, soft sans-serif with large readable timer numerals. Any movement guide is a small, friendly stick figure or flat illustration, never a realistic athletic body. Avoid harsh black, neon colors, high-contrast gym styling, technical dashboards, and corporate typography.

## Features and Behavior

### Work session

- The user starts the timer with one obvious action.
- At zero, the app visibly enters the break flow; it does not silently restart a timer.

### Movement verification

- Verification begins only after the user explicitly enables the camera.
- Completion requires: low-movement or seated baseline → clear rise or standing transition → general visible movement for a configurable short threshold.
- Precise seated-pose classification is optional. The same flow must remain valid when camera placement, desk occlusion, or partial visibility makes it unreliable.
- A visual suggestion may guide the user, but does not change completion requirements.

### Feedback and recovery

- Camera permission denial explains that camera verification is required for this MVP and shows a clear retry action; if the browser retains the denial, it tells the user to re-allow the camera in browser settings before retrying. The break remains incomplete.
- Insufficient visibility or unreliable tracking gives plain-language guidance, such as asking the user to step back or move more.
- Normal UI never exposes model details, confidence scores, landmarks, or debugging information.

## Acceptance Criteria

- [ ] A user can start a short work session from the home screen without a camera prompt.
- [ ] At zero, the user sees the movement-break screen and can explicitly enable the camera.
- [ ] If camera permission is denied, the UI explains that the break cannot be completed without it and offers retry; no camera-free completion path exists.
- [ ] With camera access, the UI visibly progresses through baseline, rise, and sustained-movement feedback.
- [ ] A baseline followed by a clear rise and general movement for the configured threshold produces the completion state.
- [ ] Completion never automatically starts another work timer; **Start next session** is required.
- [ ] Permission denial and insufficient visibility have understandable retry or guidance states.
- [ ] The UI tells users that camera processing stays on their device.

## States and Boundaries

- **Camera unavailable or denied** — verification does not start; the user sees that camera verification is required to complete this MVP break and a retry action. The break remains incomplete.
- **Tracking uncertain** — the app keeps the user in the applicable verification step with simple framing or movement guidance.
- **Completed** — the current break ends and awaits an explicit next-session action.
- **Privacy boundary** — camera use is opt-in at break time, frames stay local, and the MVP has no account, recording, or uploaded user data.

## Product Decisions

- The home screen is a timer first, not a camera or fitness interface, so camera permission is deferred until the break begins.
- General standing and movement prove the kernel; no exercise type or form is required.
- Camera verification is required to complete a movement break; there is no camera-free fallback for this MVP.
- A configurable short timer and movement threshold make the end-to-end loop demonstrable without a full Pomodoro wait.
- One movement-break layout changes its message by state to keep the flow easy to follow.
- The next session always requires an explicit user action.

## What We're Building

One browser-based flow containing a configurable work timer, an explicit movement-break transition, an opt-in local camera preview, understandable verification feedback, recovery guidance, completion, and a manual next-session action.

## Deferred From the POC

- Persistent streaks, longer-term history, and analytics, because the core demo does not require stored data.
- Multiple break routines and a richer animated guide, because general movement verification is the only required behavior.
- Camera calibration, because graceful framing guidance is sufficient for the demo.

## Non-Goals

- Exercise classification, form evaluation, fitness tracking, or health recommendations: MoveBreak validates a micro-break, not a workout.
- Accounts, backends, cloud processing, recording, social features, and camera-free completion: the complete MVP remains local, single-user, and camera-verified.
- Additional screens, dashboards, and automatic timer cycles: they weaken the focused end-to-end loop.

## Open Questions

- Exact default work duration and movement threshold values: decide during `4-spec`; they must remain short and configurable for demo use.
