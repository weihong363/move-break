---
doc: checklist
status: approved
---

# MoveBreak Build Checklist — Automatic Sedentary Detection Revision

Build mode: fast

## Slices

- [x] **1. Prove the automatic movement-break loop**
  Becomes usable: The user can explicitly enable the camera, see a preview, complete a short baseline, remain inactive through the configurable 5-second demo threshold, then stand and move to complete the break. Monitoring restarts only after they return near the original seated baseline.
  Why now: Low-movement accumulation and the prompt share one small verifier state machine, so proving the whole transition avoids a second integration pass.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Features and Behavior > Inactivity monitoring`
  Spec ref: `spec.md > Components > Movement Verifier`, `spec.md > Components > Camera`, `spec.md > Data Model`
  Build: Remove timer states and controls; add inactivity configuration, active monitoring UI, reliable-frame pause behavior, an automatic prompt, and same-session reset after completion.
  Verify (mechanical): Run tests and `pnpm build`; confirm seated hand or head movement keeps accumulating inactivity time, a stable rise resets it, invalid frames pause it, a stable rise plus accumulated movement completes the prompted break, and remaining upright does not create a new baseline.
  Learner check: Enable the camera, complete the baseline, remain still for the selected threshold, then stand and move to confirm completion and monitoring reset.
  Commit: `Add sedentary monitoring`

- [x] **2. Finish the revised demo flow**
  Becomes usable: The automatic sedentary-detection loop has clear recovery states, no timer language, accurate privacy copy, and documented rapid demo instructions.
  Why now: Finishes the new end-to-end experience after its core trigger and verification are working.
  PRD ref: `prd.md > States and Boundaries`, `prd.md > What We're Building`
  Spec ref: `spec.md > Important Failure Modes`, `spec.md > Look and Feel`
  Build: Refine monitoring, prompt, tracking-pause, permission, and completion states; update README and remove obsolete timer code.
  Verify (mechanical): Run tests and `pnpm build`; exercise baseline, inactivity prompt, permission denial, tracking pause, completion, and monitoring reset.
  Learner check: Rehearse the full automatic demo and report any confusing copy or timing.
  Commit: `Finish automatic MoveBreak demo`

- [x] **3. Make the character the primary interface**
  Becomes usable: The animated MoveBreak character communicates monitoring, prompt, rise, movement, completion, and seated-return states while the webcam stays hidden during normal use.
  Why now: The complete verified loop is stable, so this presentation pass makes the demo clearer without changing its camera or pose behavior.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`
  Spec ref: `spec.md > The Core Journey Through the System`
  Build: Add state-based CSS character animations; hide the camera preview by default; provide a debug toggle and automatic preview fallback for tracking recovery.
  Verify (mechanical): Run tests and `pnpm build`; confirm the camera pipeline remains active with the preview hidden and that the debug toggle or tracking pause reveals it.
  Learner check: Rehearse the character-led loop and briefly show the camera debug view during the demo.
  Commit: `Make character-led demo interface`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 1, test the full automatic low-movement loop.
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
- Low-movement accumulation and the automatic prompt were merged into the first revised slice because they are consecutive states in one verifier; this keeps the technical proof end-to-end.
- The learner requested a character-led demo surface. The local camera and pose pipeline remain unchanged; the preview is now a debug and recovery surface.
