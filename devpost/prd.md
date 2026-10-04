---
doc: prd
status: approved
---

# MoveBreak PRD

## Surfaces

- **Companion:** 320 × 480 frameless, draggable, lightweight window, always-on-top optional. Approved translucent characters, concise instruction and progress. No configuration controls. Webcam hidden except developer debug view.
- **Menu bar:** persistent icon, monitoring status, next reminder, Open MoveBreak, Settings…, pause/resume, Quit. Demo break action appears only in developer demo mode. Available while companion is hidden.
- **Settings:** separate compact normal window with General, Window, Startup, Privacy, collapsed Developer sections. Local configuration persists; no video or pose history is stored.

## Flow and copy

Enable camera → Getting ready → Monitoring → Time to move / Stand up → Reach up → Bend left → Bend right → Turn → Break complete → Sit down when ready → Monitoring. Only a confirmed rise starts the routine. A stable seated return restarts the full reminder duration.

Each pose has an animated cue, tolerant match, configurable accumulated valid hold time, progress and audio confirmation. Rotation accepts either direction first and requires both. Mismatch or unreliable tracking pauses progress. Keep the movement cue visible with a short visibility hint.

## Configuration

Reminder 1–120 minutes; movement count 1–4 in routine order; hold 1–15 seconds; sound; always-on-top; companion visibility; launch at login in packaged macOS app. Collapsed Developer: five-second demo reminder and debug camera. Changes apply only after Save settings; the companion immediately refreshes its timer and routine. Camera permission is requested on first use; granted permission enables automatic monitoring on later launches. Pause/resume stays in the menu bar.

## Privacy and acceptance

Local-only camera/pose processing. Pausing releases camera. Hiding companion keeps monitoring running. Tray reopening and independent Settings work. Every cycle waits for a real rise and seated return; no old rig appears in runtime.
