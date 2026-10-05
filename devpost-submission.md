# MoveBreak

> Local draft prepared at the user's request on 2026-10-05. Nothing has been sent to Devpost. Current connected account does not show registration for Build With AI: Basics. Account eligibility, registration, public links, artwork rights, and final live-demo evidence remain open; the formal prepare stage is not marked complete.

## One-line Summary

A small macOS companion that turns prolonged sitting into a guided, camera-verified micro-break, with pose processing kept on your device.

## Problem

Desk workers can dismiss a break reminder without actually moving. I wanted a small companion that makes the movement itself the completion condition.

## Solution

MoveBreak learns an initial seated reference at the user's desk. Small hand and head movements do not interrupt the reminder. When the configured seated time is reached, it asks the user to stand, waits for a clear rise, and guides four short movements: reach overhead, bend left, bend right, and turn both ways. Local pose matching and a short hold complete each step. After the routine, MoveBreak waits for a seated return before beginning a fresh cycle.

## Why This Matters

The target users are developers, students, and other desk workers. The companion provides a clear action rather than another dashboard: stand, follow a short cue, then return to work. It makes no medical or exercise-form claims.

## How We Used AI

MediaPipe Pose Landmarker estimates body landmarks locally. Small heuristic state machines use those landmarks for rise detection and tolerant movement matching; no model was trained. AI-assisted artwork preparation produced the predefined movement cues from the approved translucent visual reference. Those cues demonstrate a movement rather than mirror the user.

## How We Used Codex

Codex worked through the Devpost Learn Skill Pack's scope, PRD, technical specification, and build checklist with explicit scope limits. Implementation used small Git checkpoints, automated checks, and user feedback on the camera flow. The project evolved from a timer to seated monitoring. Feedback also replaced an increasingly complex live avatar rig with a short predefined routine. The main learning question is how the structured workflow helps an already experienced AI-assisted developer control scope and finish a coherent product.

## Key Features

- Small desktop companion with animated instructions, matched highlights, hold progress, and audible cues.
- Local seated-baseline monitoring and stable rise/seated-return transitions.
- Four coarse movement checks; brief mismatch or tracking loss pauses accumulated progress.
- Persistent menu-bar entry and dedicated Settings with explicit Save.
- Configurable reminder/hold duration and a five-second developer demo mode.
- Local preferences; no stored camera footage or pose history.

## Architecture

TypeScript + Vite + native HTML/CSS render the companion. Electron provides macOS windows, Tray, permissions, and settings persistence. MediaDevices supplies video frames to a bundled local MediaPipe Pose Landmarker. Separate monitoring and routine verifiers drive state, visuals, progress, and synthesized Web Audio tones. There is no backend or cloud inference.

## Testing Instructions

On macOS Apple Silicon, install Node.js 22.12+ LTS and pnpm 10, then run:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm desktop:package
```

Open `release/MoveBreak-darwin-arm64/MoveBreak.app`. Enable camera access, start seated at a fixed front camera, then enable demo mode in Settings → Developer and Save. Follow the stand prompt and four movements; sit again after completion. Debug camera is optional and should remain off for final product acceptance. See `TESTING.md` for recovery, repeat-cycle, sound, and native-control checks.

Automated checks and clean-clone desktop build passed. Final human-followed normal-mode acceptance is pending; the draft must not claim that this final evidence already exists.

## Public Demo Link

Pending. This is a desktop app; local run instructions are provided above. No hosted web demo is currently published.

## Public Repository Link

https://github.com/weihong363/move-break — verified public; current project source has not yet been pushed. License choice and artwork-rights confirmation remain pending.

## Demo Video

Pending recording and publication. Aim for a 75–90 second video showing the packaged app and real movement verification. The live submission requirements request 1–3 minutes; target this range while remaining under three minutes.

Suggested English narration (the detailed seven-scene recording plan is in `DEMO.md`):

- **0–10s:** “Break reminders are easy to dismiss without moving. MoveBreak makes movement the way to complete a break.”
- **10–20s:** “It is a small macOS companion. Camera processing stays on the device. For this demo, the seated reminder is five seconds.”
- **20–55s:** “Once I stand, it guides a reach, a bend to each side, and a turn both ways. A green highlight and sound confirm a matched pose. Holding it completes the step.” Show the actual four steps without simulated completion.
- **55–65s:** “The break is complete. When I sit again, a fresh reminder cycle begins.”
- **65–80s:** “The menu bar provides quick controls, and Settings stay separate. MediaPipe and simple landmark rules verify the movements locally.”
- **80–90s:** “The Devpost planning workflow helped structure the work. User feedback narrowed a complex avatar experiment into four clear movement cues.”

## Screenshot Shot List

Capture from the actual packaged app after acceptance:

1. Monitoring with a seconds-level countdown.
2. Stand prompt before the routine begins.
3. Matched reach with highlight and hold progress.
4. Completed routine / seated-return state.
5. Menu-bar menu alongside the dedicated Settings window.

Do not use developer state previews as evidence of camera verification. Review the desktop recording for private notifications before publication.

## Submission Readiness Notes

Completed locally: source and planning documents, 37 automated tests, clean-clone installation/build, unsigned native packaging, README workflow/limitations, and dependency/model provenance inventory.

Remaining: registration, code license decision, supplied-artwork rights, final real-camera acceptance, menu/audio acceptance, public repository, recorded video, personal form answers, and explicit final submission confirmation.

## Known Limitations

- Tested locally on macOS Apple Silicon; other platforms are untested.
- Unsigned/unnotarized demo build.
- Start seated with a stationary camera; no precise sitting classification or medical analysis.
- Overhead reach requires both wrists visible; lighting and framing affect pose reliability.
- Final normal-mode reach retest and five consecutive human routines remain pending.
- Actual launch after logout/login remains untested; omit a verified-startup claim until tested.

## TODO Official Form Fields

Live requirements fetched on 2026-10-05. Personal selections below must come from the participant, not inference.

| Field ID | Field | Prepared answer / missing input |
| --- | --- | --- |
| 28614 | Individual / Team | Participant must confirm. |
| 28615 | Country of residence | Participant must provide. |
| 28616 | Organization, optional | Participant must provide if applicable. |
| 28617 | Eligibility confirmation | Participant must personally confirm official eligibility and project origin. |
| 28618 | Resources actually used | Participant selects Intro video / Live build session / Cup of Joe office hours / Discord / None truthfully. |
| 28619 | AI cost effects | Participant selects actual cost/limit experience. |
| 28620 | Confidence, 1–5 | Participant provides their own rating. |
| 28621 | Improvement feedback, optional | Suggested topic: clearer scope-change checkpoints and a concise boundary between mechanical verification and human camera acceptance. Confirm that this reflects your view. |
| 28624 | Value categories | Participant selects actual value categories. |
| 28625 | Value explanation, optional | Suggested draft: “I used MoveBreak to compare a structured scope → PRD → spec workflow with my existing plan-first process and to practice keeping an AI-assisted project small enough to ship.” |
| 28916 | Main technology requirement | “I used the Devpost Learn Skill Pack to define scope, user requirements, a technical specification, and a sequenced implementation checklist. Codex implemented and verified small slices, while I supplied product constraints and experience feedback. The planning documents are included in the repository and reflect the final desktop companion and guided routine.” |
| 28917 | Age of majority | Participant must personally confirm. |

No Codex session-ID question appeared in the live fields; none is recorded here.
