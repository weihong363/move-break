---
doc: checklist
status: approved
---

# MoveBreak Build Checklist

Build mode: fast

## Slices

- [x] **1. Start a short work session in the finished timer interface**
  Becomes usable: A polished local app opens to the warm MoveBreak timer screen; the user can select a short duration, start a 10-second work session, see the countdown, and pause or reset it.
  Why now: Establishes the real product surface and the first three steps of the core journey while keeping bootstrapping inside a usable feature.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Screens and Layout`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Stack`, `spec.md > Components > App Controller`, `spec.md > Components > Timer`, `spec.md > File Structure`
  Build: Scaffold the Vite TypeScript app, install dependencies, create the typed configuration, timer, controller, HTML, and CSS, then implement the work-timer UI and controls.
  Verify (mechanical): Run `pnpm build`; run the dev server; confirm a 10-second session counts down, pause holds time, reset restores the selected duration, and no camera permission is requested.
  Learner check: Open the local app, start, pause, and reset a short work session. Confirm it feels like a simple timer rather than a dashboard.
  Commit: `Add MoveBreak work timer`

- [ ] **2. Prove local camera and pose-tracking readiness**
  Becomes usable: A finished work session enters a deliberately plain movement-break proof screen. The user can enable the camera, see a local preview, and receive clear ready, retry, or framing feedback based on real local pose-tracking input.
  Why now: This is the unique kernel's highest-risk dependency, so it must be proven before investing in the verifier or polished movement-break UI.
  PRD ref: `prd.md > Core Journey`, `prd.md > Features and Behavior > Movement verification`, `prd.md > Feedback and recovery`
  Spec ref: `spec.md > Components > Camera`, `spec.md > Components > Pose Detector`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: Add camera lifecycle management, the MediaPipe model asset and detector, throttled video-frame processing, and only the plain permission, preview, readiness, and framing UI necessary for the proof. Do not polish the movement-break screen in this slice.
  Verify (mechanical): Run `pnpm build`; with a local camera, enter a break and confirm the preview and usable upper-body landmarks are reported; deny permission and confirm the break remains incomplete with retry guidance.
  Learner check: Complete one short timer cycle, enable the camera, and confirm the preview, usable-landmark readiness, and denial/retry message are clear enough to proceed.
  Commit: `Prove local camera pose tracking`

- [ ] **3. Complete a camera-verified movement break**
  Becomes usable: After a brief still baseline, the user can stand, move with short natural pauses, and see the activity break complete only after accumulated valid movement time reaches the configured threshold.
  Why now: Delivers the differentiating end-to-end behavior immediately after the technical spike has proven the necessary input is real.
  PRD ref: `prd.md > Features and Behavior > Movement verification`, `prd.md > Acceptance Criteria`
  Spec ref: `spec.md > Components > Movement Verifier`, `spec.md > Data Model > Signal Rules`, `spec.md > Decisions and Open Issues`
  Build: Implement the typed verifier state machine, rolling-window smoothing, landmark-coverage guard, baseline, stable rise confirmation, accumulated valid movement timing, paused-tracking behavior, configurable thresholds, and state-specific UI feedback. Add deterministic verifier tests using sample landmark sequences.
  Verify (mechanical): Run verifier tests and `pnpm build`; confirm sample sequences reject a one-frame rise, pause on invalid tracking without advancing, retain progress across short low-motion frames, and complete after four accumulated valid seconds. Confirm the live demo completes after stillness, rise, and movement.
  Learner check: Use the live camera flow: remain still, stand, move with a brief natural pause, and confirm that progress resumes and completion appears only after enough valid movement.
  Commit: `Add movement break verification`

- [ ] **4. Finish recovery behavior and demo readiness**
  Becomes usable: The full loop is coherent and presentation-ready: success stops the camera, **Start next session** resets only after an explicit action, all required recovery states are understandable, and the production build is valid.
  Why now: Finishes the demonstrated journey after the core verification is already usable, without expanding the product.
  PRD ref: `prd.md > States and Boundaries`, `prd.md > What We're Building`, `prd.md > Non-Goals`
  Spec ref: `spec.md > Core Journey Through the System`, `spec.md > Important Failure Modes`, `spec.md > Look and Feel`
  Build: Refine all state transitions and copy, ensure camera tracks stop on completion/reset/retry, add the completion and next-session flow, tune the visual hierarchy, document local demo steps, and verify the static build.
  Verify (mechanical): Run tests and `pnpm build`; manually exercise the full 10-second demo, permission denial, no-pose/framing guidance, tracking pause, completion, camera shutdown, and explicit next-session action.
  Learner check: Record or rehearse the complete one-minute demo and identify any confusing wording, timing, or visual state before final review.
  Commit: `Finish MoveBreak demo flow`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 2, test the timer-to-camera transition and local readiness feedback before verifier implementation.
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — focused investigation of the early pose-detection spike and its evidence
- [ ] Optional edit and transfer reflection addressed — offered after final review
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: pending build completion
Route and stops: pending build completion
Edit outcome: pending build completion
Reflection: pending build completion
Activity mode: focused alternative for an experienced plan-first developer

## Revisions
