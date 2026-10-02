---
doc: checklist
status: approved
---

# MoveBreak Build Checklist — Automatic Sedentary Detection Revision

Build mode: fast

## Slices

- [ ] **1. Start local low-movement monitoring**
  Becomes usable: The user can explicitly enable the camera, see a preview, complete a short baseline, and see a clear local monitoring state with a configurable 5-second demo inactivity threshold.
  Why now: Replaces the timer immediately with the new kernel while preserving the proven camera and pose pipeline.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Features and Behavior > Inactivity monitoring`
  Spec ref: `spec.md > Components > Inactivity Monitor`, `spec.md > Components > Camera`, `spec.md > Data Model`
  Build: Remove timer states and controls; add inactivity configuration, a low-movement monitor, active monitoring UI, and reliable-frame pause behavior.
  Verify (mechanical): Run tests and `pnpm build`; confirm a valid low-movement sequence accumulates to the threshold, meaningful movement resets it, and invalid frames pause it.
  Learner check: Enable the camera, complete the baseline, remain still, and confirm monitoring progress appears without a work timer.
  Commit: `Add sedentary monitoring`

- [ ] **2. Prompt and verify the automatic movement break**
  Becomes usable: Reaching the inactivity threshold clearly prompts the user to stand and move; the existing rise and accumulated movement verifier completes the break and resets monitoring in the same camera session.
  Why now: Connects the new automatic trigger to the already-proven local movement verification.
  PRD ref: `prd.md > Features and Behavior > Movement verification`, `prd.md > Acceptance Criteria`
  Spec ref: `spec.md > Components > Movement Verifier`, `spec.md > Core Journey Through the System`
  Build: Add prompted state, route frames from monitoring into the rise and movement states, reset inactivity data after completion, and update completion copy.
  Verify (mechanical): Run tests and `pnpm build`; confirm a low-movement threshold prompts a break, a stable rise plus accumulated movement completes it, and completion restarts monitoring without a new permission request.
  Learner check: Run the short live flow: baseline, 5 seconds still, prompt, stand, move, complete, then observe monitoring restart.
  Commit: `Add automatic break prompt`

- [ ] **3. Finish the revised demo flow**
  Becomes usable: The automatic sedentary-detection loop has clear recovery states, no timer language, accurate privacy copy, and documented rapid demo instructions.
  Why now: Finishes the new end-to-end experience after its core trigger and verification are working.
  PRD ref: `prd.md > States and Boundaries`, `prd.md > What We're Building`
  Spec ref: `spec.md > Important Failure Modes`, `spec.md > Look and Feel`
  Build: Refine monitoring, prompt, tracking-pause, permission, and completion states; update README and remove obsolete timer code.
  Verify (mechanical): Run tests and `pnpm build`; exercise baseline, inactivity prompt, permission denial, tracking pause, completion, and monitoring reset.
  Learner check: Rehearse the full automatic demo and report any confusing copy or timing.
  Commit: `Finish automatic MoveBreak demo`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1, test baseline and low-movement monitoring before the automatic prompt is connected.
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

- Automatic sedentary detection replaced the Pomodoro-style work timer — the learner changed the kernel to prolonged low movement → prompt → verified movement → monitoring reset.
