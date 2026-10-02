---
doc: prd
status: approved
---

# MoveBreak — Product Requirements

A friendly, local-first sedentary-break companion for desk workers that prompts and verifies a short movement break after a prolonged seated or stationary state. Small hand and head movement does not cancel the reminder. Source: `scope.md > The Unique Kernel`, `The Core Loop`, and `The POC Boundary`.

## The Core Journey

1. The user opens MoveBreak and sees a simple monitoring home screen; the camera is inactive.
2. They select or retain a short demo-friendly inactivity threshold and press **Enable camera**.
3. The app shows the MoveBreak character, learns the user's current seated/stationary baseline through the local camera pipeline, then monitors local pose movement.
4. When the inactivity threshold is reached, the UI clearly prompts the user to stand and move.
5. The app confirms a stable rise, then accumulates general visible movement until the configurable duration is met.
6. The app shows **Movement break completed**, then waits for the user to sit back near their original baseline before restarting inactivity monitoring in the active camera session.

## Screens and Layout

### Monitoring home

- App name, current monitoring state, one primary **Enable camera** action, and a small inactivity-threshold control have visual priority.
- Before the camera is enabled, a short note explains why monitoring is needed and that processing stays on-device.
- After permission, the animated MoveBreak character, current state, and elapsed low-movement progress replace the setup controls. The live preview stays hidden by default.
- The MVP has no dashboard, stats, streaks, exercise library, account controls, or work-session timer.

### Movement break

- One consistent layout: animated MoveBreak character, one primary instruction, lightweight progress/status indicator, and local-processing privacy note. The camera preview stays secondary.
- No extra navigation or settings appear during verification.
- Initial permission state shows **Start gentle monitoring**, an **Enable camera** action, and a simple local-only explanation.
- Baseline state says **Hold still for a moment** and visibly shows progress, then changes to a calm monitoring state.
- Monitoring state uses a subtle idle/breathing character animation and says **Monitoring**.
- Inactivity state highlights the companion, plays a short in-browser notification sound, and says **Time to move**.
- Rise state moves the companion from a seated to standing pose and says **Stand up**; a detected rise immediately changes the feedback to **Keep moving**.
- Sustained-movement state shows remaining time or equivalent progress without requiring a specific exercise.
- Completion state uses a brief celebration animation and says **Break completed**, then waits for the user to sit back near their original baseline before restarting local inactivity monitoring.
- Return state uses a resting character animation and says **Sit down when you're ready**.

## Look and Feel

Warm, calm, playful desktop-companion feel: a warm off-white or cream background, muted green as the primary accent, and limited warm orange for active or success moments. Use rounded cards and controls, generous whitespace, minimal borders, and a clean, soft sans-serif with large readable status text. The companion uses a rounded luminous blue mascot style across all states. Avoid harsh black, neon colors, high-contrast gym styling, technical dashboards, and corporate typography.

## Features and Behavior

### Inactivity monitoring

- The user explicitly enables the camera once, after a clear local-only explanation.
- After a usable baseline, the app accumulates reliable seated/stationary time. Small hand, head, and upper-body movements do not interrupt it.
- The inactivity threshold is configurable and has a short demo-friendly default.
- Low movement triggers the break prompt; this is the product's differentiating behavior.

### Movement verification

- Verification uses the same active local camera session after the inactivity prompt.
- Completion requires: low-movement or seated baseline → inactivity threshold → clear rise or standing transition → general visible movement for a configurable short threshold. After completion, the app waits for the user to return near their original seated baseline before restarting inactivity timing.
- Precise seated-pose classification is optional. The same flow must remain valid when camera placement, desk occlusion, or partial visibility makes it unreliable.
- A visual suggestion may guide the user, but does not change completion requirements.
- A small debug toggle can reveal the local camera preview during a demo. The preview also appears when tracking quality is insufficient to help the user reframe.
- During sustained movement, coarse local signals can animate the companion: arm movement produces a wave/stretch and a large shoulder-width change flips its facing direction. This is illustrative feedback, not exercise classification.

### Feedback and recovery

- Camera permission denial explains that camera verification is required for this MVP and shows a clear retry action; if the browser retains the denial, it tells the user to re-allow the camera in browser settings before retrying. The break remains incomplete.
- Insufficient visibility or unreliable tracking gives plain-language guidance, such as asking the user to step back or move more.
- Normal UI never exposes model details, confidence scores, landmarks, or debugging information.

## Acceptance Criteria

- [ ] A user can explicitly enable the local camera from the home screen and see a preview.
- [ ] During normal monitoring, the animated character is primary and the camera preview is hidden unless the debug toggle or tracking recovery needs it.
- [ ] A usable baseline leads to a visible low-movement monitoring state.
- [ ] A sustained seated or stationary state for the configured threshold triggers a clear movement-break prompt; small hand and head movements do not reset it.
- [ ] If camera permission is denied, the UI explains that the break cannot be completed without it and offers retry; no camera-free completion path exists.
- [ ] With camera access, the UI visibly progresses through baseline, rise, and sustained-movement feedback.
- [ ] A baseline followed by a clear rise and general movement for the configured threshold produces the completion state.
- [ ] Remaining upright after completion does not create a new baseline; returning near the original seated baseline resumes the inactivity timer.
- [ ] Completion resets the inactivity monitor without requiring a work-session timer or new camera permission.
- [ ] Permission denial and insufficient visibility have understandable retry or guidance states.
- [ ] The UI tells users that camera processing stays on their device.

## States and Boundaries

- **Camera unavailable or denied** — verification does not start; the user sees that camera verification is required to complete this MVP break and a retry action. The break remains incomplete.
- **Tracking uncertain** — the app keeps the user in the applicable verification step with simple framing or movement guidance.
- **Monitoring** — the camera session is active after explicit user consent; only reliable low-movement time advances the inactivity threshold.
- **Completed** — the current break ends; the app waits for a return near the original seated baseline, then resumes observation in the same camera session.
- **Privacy boundary** — camera use is opt-in at the start of monitoring, frames stay local, and the MVP has no account, recording, or uploaded user data.

## Product Decisions

- The home screen offers explicit camera-enabled monitoring, because automatic low-movement detection is the core product behavior.
- General standing and movement prove the kernel; no exercise type or form is required.
- Camera verification is required to complete a movement break; there is no camera-free fallback for this MVP.
- Configurable short inactivity and movement thresholds make the end-to-end loop demonstrable in seconds.
- One movement-break layout changes its message by state to keep the flow easy to follow.
- Completing a break resumes monitoring in the existing camera session after the user returns near the original seated baseline.

## What We're Building

One browser-based flow containing opt-in local camera monitoring, a configurable inactivity threshold, an explicit movement-break prompt, understandable verification feedback, recovery guidance, movement completion, and monitoring reset.

## Deferred From the POC

- Persistent streaks, longer-term history, and analytics, because the core demo does not require stored data.
- Multiple break routines and a richer animated guide, because general movement verification is the only required behavior.
- Camera calibration, because graceful framing guidance is sufficient for the demo.

## Non-Goals

- Exercise classification, form evaluation, fitness tracking, or health recommendations: MoveBreak validates a micro-break, not a workout.
- Accounts, backends, cloud processing, recording, social features, and camera-free completion: the complete MVP remains local, single-user, and camera-verified.
- Work timers, Pomodoro cycles, productivity dashboards, and background monitoring: they are not required to prove the focused low-movement-to-break loop.

## Open Questions

- Exact default inactivity and movement threshold values: decide during `4-spec`; they must remain short and configurable for demo use.
