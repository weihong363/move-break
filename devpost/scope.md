---
doc: scope
status: approved
---

# MoveBreak scope

A small macOS companion that prompts a camera-verified micro-break after a prolonged seated baseline. Daily use happens in the companion, quick controls in the menu bar, configuration in a separate Settings window.

## Core loop

Explicit camera activation → stable seated baseline → configurable reminder → stable rise → four coarse pose holds → completion → stable return to the original seated baseline → fresh cycle. Small seated hand/head movements keep the timer running. Tracking loss pauses verification.

## MVP boundary

Electron companion and Tray, independent Settings, existing colorful translucent movement cues, local MediaPipe, tolerant upper-body heuristics, sound feedback, configurable demo timing. Defaults: 25 minutes, four movements, three-second holds; developer demo reminder: five seconds. Only local configuration persists.

## Excluded

Cloud inference, backend, accounts, analytics, saved camera/pose data, exercise scoring, medical claims, precise seated classification, full-body motion capture, mirrored rigs, large exercise libraries. No monitoring before camera permission is granted. No camera-free completion.
