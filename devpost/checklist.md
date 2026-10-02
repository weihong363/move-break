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

- [x] **4. Upgrade the companion avatar**
  Becomes usable: A seated SVG companion leads the experience, stands with the user, responds coarsely to arm movement or shoulder orientation, alerts with a short sound, and celebrates completion.
  Why now: The character-led layout is proven, and this replaces its primitive visual with a polished discrete-state companion without changing the detection flow.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Movement verification`
  Spec ref: `spec.md > Components > Companion Avatar`
  Build: Replace the CSS stick figure with a compact inline SVG avatar; map existing verifier phases and coarse movement signals; synthesize the prompt sound with Web Audio.
  Verify (mechanical): Run tests and `pnpm build`; confirm no new dependency was added and the camera debug path still exists.
  Learner check: Run one short demo loop and confirm the seated, alert, standing, moving, celebration, and seated-return presentations read clearly.
  Commit: `Upgrade companion avatar`

- [x] **5. Apply the blue companion visual**
  Becomes usable: Every avatar state uses the requested rounded luminous blue visual while preserving existing state mapping.
  Why now: The learner supplied the visual direction after validating the behavior, so this is a contained asset swap.
  PRD ref: `prd.md > Look and Feel`
  Spec ref: `spec.md > Components > Companion Avatar`
  Build: Bundle a six-pose blue sprite sheet and map existing avatar states to its frames with CSS.
  Verify (mechanical): Run tests and `pnpm build`; confirm the asset is bundled locally and no camera or detector code changes.
  Learner check: Confirm the blue companion reads clearly across the normal demo flow.
  Commit: `Apply blue companion visual`

- [x] **6. Drive the avatar from upper-body landmarks**
  Becomes usable: The blue companion has a live SVG upper-body rig whose torso, head, arms, and seated/standing mode follow smoothed local pose landmarks.
  Why now: The user requested responsive body-part motion while keeping the established camera and verifier pipeline intact.
  PRD ref: `prd.md > Movement verification`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Components > Companion Avatar`
  Build: Replace the static sprite with a small SVG rig; map shoulders, elbows, wrists, head, and hips into normalized transforms; add deterministic rig tests.
  Verify (mechanical): Run tests and `pnpm build`; confirm seated/standing and arm-transform outputs change from supplied pose frames.
  Learner check: Enable camera and compare arm and upper-body motion against the avatar in the hidden-preview experience.
  Commit: `Drive avatar from upper-body landmarks`

- [x] **7. Build static canonical translucent rigs**
  Becomes usable: The seated front-facing and standing upper-body avatars reconstruct from layers aligned on a shared canvas and preserve the established translucent cyan figure style.
  Why now: The learner rejected the invented SVG style and specified the earlier translucent figure artwork as the canonical source.
  PRD ref: `prd.md > Look and Feel`, `prd.md > Movement verification`
  Spec ref: `spec.md > Components > Companion Avatar`
  Build: Prepare full-canvas art layers from the canonical source; compose neutral seated and standing rigs; use nested arm layers with shoulder and elbow pivots; keep landmark driving disconnected.
  Verify (mechanical): Run tests and `pnpm build`; confirm all art layers are bundled locally, the neutral rigs reconstruct cleanly, and the manual pivot preview rotates nested arm layers around their joints.
  Learner check: Compare the seated rig, standing rig, and manual arm-pivot preview with the original translucent figure style.
  Commit: `Build static translucent avatar rigs`

- [x] **8. Rebuild the standing art rig for animation**
  Becomes usable: The standing companion uses a neutral, joint-friendly head, singular torso, and straight capsule arm segments in the approved translucent cyan style.
  Why now: Static reconstruction and pivots must be accepted before pose transforms can be trusted.
  Build: Replace fixed-bend standing art with neutral rig parts; assemble a single torso and nested straight limb segments; leave the pose adapter disconnected; retain a geometry overlay and manual pivot preview.
  Verify (mechanical): Run tests and `pnpm build`; confirm the neutral pose has no baked bend, intersecting glass layers, or outer part halo, and that manual arm pivots remain attached.
  Learner check: Compare the neutral standing pose and manual pivots before enabling camera-driven motion.
  Commit: `Rebuild standing rig assets`

- [x] **9. Add the four-pose movement routine**
  Becomes usable: After a verified rise, MoveBreak demonstrates and checks Overhead Reach, Side Bend Left, Side Bend Right, and Torso Rotation with a short hold timer and audible ticks.
  Build: Replace free-form movement completion with a routine verifier; use normalized wrist, shoulder, hip, width, and depth rules; pause rather than reset progress on brief tracking loss; show avatar demonstrations and countdown audio.
  Verify (mechanical): Run tests and `pnpm build`; exercise each rule, two-direction rotation, and paused tracking with deterministic landmark frames.
  Learner check: Run the complete camera routine and tune the hold thresholds if needed.
  Commit: `Add guided movement routine`

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
- The learner requested a more product-like avatar. The implementation uses a discrete companion state set and existing local pose signals rather than an animation system or new product feature.
- The learner selected a blue luminous companion style from the provided reference; its blue palette and rounded visual language carry into the live rig.
- The learner requested a live body-part-driven avatar. The static sprite was replaced with a small normalized SVG upper-body rig driven by existing local pose landmarks.
- The learner rejected the invented SVG appearance and made the prior translucent figure artwork canonical. The first standing pose-driven version exposed that fixed-bend artwork was unsuitable for joint animation, so camera-driven transforms are paused.
- The standing rig now uses a purpose-built neutral asset sheet with straight capsules, a singular torso, nested local arm segments, fixed z-order, and an opt-in joint geometry overlay for static validation.
- Free-form motion mirroring was replaced with one short camera-verified routine. The avatar now demonstrates the expected pose instead of tracking every limb continuously.
