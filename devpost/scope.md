---
doc: scope
status: approved
---

# MoveBreak scope

A small macOS companion that prompts a camera-verified micro-break after a prolonged seated baseline. Daily use happens in the companion, quick controls in the menu bar, configuration in a separate Settings window.

## Core loop

First-use camera activation → seated reference at the user's desk position → configurable reminder → stable rise → short predefined movement routine → completion → stable return to the original seated baseline → fresh cycle. Granted camera permission allows automatic startup on later launches. Small seated hand/head movements keep the timer running. Tracking loss pauses verification.

## MVP boundary

Electron companion and Tray, independent Settings, existing colorful translucent movement cues, local MediaPipe, tolerant upper-body heuristics, sound feedback, configurable demo timing. Defaults: 25 minutes, four movements, three-second holds; developer demo reminder: five seconds. Only local configuration persists.

The routine is Overhead Reach → Side Bend Left → Side Bend Right → Torso Rotation (both sides). Settings may select the first 1–4 movements. Avatar animations guide the user; pose landmarks verify the target rather than mirror the avatar. Hiding the companion keeps monitoring active; pause releases the camera.

## Demo assumptions and remaining proof

Start seated with a stationary camera and usable shoulders; precise seated classification and leg visibility are not required. Final native validation must cover repeated cycles and hidden monitoring. Standing before the prompt pauses seated monitoring until a stable seated return. Rotation uses shoulder depth or a width-plus-head-offset direction fallback. Real-camera reliability and login-session startup remain final experience checks. See `spec.md > Validation and demo assumptions`.

## Excluded

Cloud inference, backend, accounts, analytics, saved camera/pose data, exercise scoring, medical claims, precise seated classification, full-body motion capture, mirrored rigs, large exercise libraries. No monitoring before camera permission is granted. No camera-free completion.
