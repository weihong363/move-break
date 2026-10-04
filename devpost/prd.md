---
doc: prd
status: approved
---

# MoveBreak PRD

## Surfaces

- **Companion:** 320 × 480 frameless, draggable, lightweight window, always-on-top optional. Approved translucent characters, concise instruction and progress. No configuration controls. Webcam hidden except developer debug view.
- **Menu bar:** persistent icon, monitoring status, next reminder, Open MoveBreak, Settings…, pause/resume, Quit. Demo break action appears only in developer demo mode. Available while companion is hidden.
- **Settings:** separate compact normal window with General, Window, Startup, Privacy, collapsed Developer sections. Local configuration persists; no video or pose history is stored.

The companion has one fixed footprint across all normal states, a uniform cream background, and no scrollbar. Background/artwork/text are draggable. Red close and yellow minimize controls both hide the companion to the menu bar; Quit is a separate menu action. The menu-bar icon is the black figure from the application logo with a transparent background and no text title. The application icon retains only the supplied rounded tile.

## Flow and copy

Enable camera → Getting ready → Monitoring → Time to move / Stand up → Reach up → Bend left → Bend right → Turn → Break complete → Sit down when ready → Monitoring. Only a confirmed rise starts the routine. A stable seated return restarts the full reminder duration.

Each pose has an animated cue, tolerant match, configurable accumulated valid hold time, progress and audio confirmation. Rotation accepts either direction first and requires both. Mismatch or unreliable tracking pauses progress. Keep the movement cue visible with a short visibility hint.

| Movement | Coarse success condition |
| --- | --- |
| Overhead Reach | Both wrists above shoulders. |
| Side Bend Left / Right | Clear upper-body lean in the named anatomical direction; shoulder tilt can substitute for hidden hips. Both arms overhead is not required. |
| Torso Rotation | Clear turn each way, either side first; configured hold applies separately to both sides. |

Cues demonstrate real pose changes in short loops, with stable centering. The cyan neutral figure is shown while waiting for rise or seated return. Monitoring shows `M:SS` until the reminder. Sound marks reminder, step start, pose match, ongoing matched hold/countdown, step completion, full completion and seated return/new cycle. Sound can be disabled in Settings.

## Configuration

Reminder 1–120 minutes; movement count 1–4 in routine order; hold 1–15 seconds; sound; always-on-top; companion visibility; launch at login in packaged macOS app. Collapsed Developer: five-second demo reminder and debug camera. Changes apply only after Save settings; the companion immediately refreshes its timer and routine. Camera permission is requested on first use; granted permission enables automatic monitoring on later launches. Pause/resume stays in the menu bar.

## Privacy and acceptance

Local-only camera/pose processing. Pausing releases camera. Hiding companion keeps monitoring running. Tray reopening and independent Settings work. Every cycle waits for a real rise and seated return; no old rig appears in runtime.

Camera permission denial blocks monitoring and completion. Retry includes guidance to re-enable an OS-denied permission; it cannot reset the permission itself. Initial setup assumes the user is seated at their normal desk distance. No camera-free bypass.

## Remaining acceptance checks

- Complete two consecutive native cycles: reminder → confirmed rise → selected routine → seated return → full fresh reminder duration.
- Small seated movements must not reset timing; standing before the reminder should not count as seated time. The latter is not yet enforced by the current monitor.
- Check both bend directions and both rotation directions with the demo camera; shoulder-width-only rotation cannot confirm the opposite side.
- Tracking loss or a long detection interruption must not advance a hold. A long-gap guard remains to be verified in the routine.
- Verify monitoring while hidden, menu-bar reopen/Settings/pause/resume/Quit, audio after automatic startup, latest icons, and login launch at the final installed location.

Current build/test and smoke evidence are recorded in the spec. These checks distinguish the intended behavior from what has already been validated.
