# MoveBreak

A macOS desktop companion for camera-verified micro-breaks. Small seated hand/head movements do not interrupt the reminder timer. Camera frames and MediaPipe pose processing stay on the device.

For developers, students, and other desk users who want a small companion that verifies a movement break instead of merely dismissing a reminder.

## Run

```sh
pnpm install --frozen-lockfile
pnpm desktop
```

Build a local macOS app with `pnpm desktop:package`. Open `release/MoveBreak-darwin-arm64/MoveBreak.app` on Apple Silicon (the output architecture follows the build machine). This is a local unsigned build, not a notarized distribution.

## Three surfaces

- **Companion:** fixed 320 × 480, draggable, lightweight window with two macOS-style hide/minimize controls. The red and yellow controls hide the companion while menu-bar monitoring remains available; yellow sends it to the menu bar rather than the Dock. Avatar, instruction, and progress only. Drag the top bar or avatar to move it; remaining reminder time shows minutes and seconds. Camera authorization appears once; later launches start monitoring automatically when macOS permission is already granted.
- **Menu bar:** black figure icon (MoveBreak tooltip), monitoring status, next reminder, show companion, Settings, pause/resume, and Quit. Hiding the companion keeps monitoring active; pausing releases the camera.
- **Settings:** independent native window. Open from the menu bar, app menu (⌘,), Dock context menu, or companion context menu. Reminder duration, 1–4 movements, hold time, sound, always-on-top, visibility, and launch at login. Local preferences survive restarts; video and pose data are not saved. Developer options are collapsed by default.

Defaults: 25-minute reminder, four movements, three-second holds. Edit settings, then click Save settings to apply them immediately. Saving restarts the reminder timer and any active routine while preserving the seated baseline. Developer demo mode uses a five-second reminder; debug camera is optional. Launch at login is available in the packaged app; it opens MoveBreak, but monitoring starts automatically if camera permission was previously granted.

## Demo loop

Enable camera → establish seated baseline → inactivity reminder → confirmed stand → reach up → bend left → bend right → turn both ways → break complete → confirmed seated return → fresh reminder cycle. Valid pose holds accumulate; tracking loss pauses progress. The approved colorful sprite animations remain the main visual.

For native camera denial, allow MoveBreak in macOS **Privacy & Security → Camera** before retrying. Retrying cannot reset an OS permission.

The browser prototype remains available with `pnpm dev` on localhost. It has no native tray/window features.

## Checks

```sh
pnpm test
pnpm desktop:build
```

## Stack and workflow

TypeScript, Vite, native HTML/CSS, Electron, browser MediaDevices, and bundled MediaPipe Pose Landmarker. No backend, model training, accounts, analytics, or cloud inference.

The Devpost Learn Skill Pack guided scope → PRD → technical specification → implementation checklist. Codex implemented small slices with tests and user experience checkpoints. Product feedback moved the project from a work timer to seated monitoring, then from live avatar mirroring to four predefined movement cues. The current planning documents are in [devpost/scope.md](devpost/scope.md), [devpost/prd.md](devpost/prd.md), [devpost/spec.md](devpost/spec.md), and [devpost/checklist.md](devpost/checklist.md).

## Tested platform and limitations

Local packaging is tested on macOS Apple Silicon. Intel macOS, Windows, and Linux are untested. Start seated with a stationary front camera; both shoulders must be usable, and overhead reach needs both wrists in frame. Tracking loss pauses timing. The heuristics approximate movement and do not assess posture, exercise form, or medical conditions.

The latest normal-mode camera-frame fix passes automated tests, but final real-camera acceptance and five consecutive human-followed routines remain open. Actual login-session startup also remains untested. See [TESTING.md](TESTING.md) for the acceptance procedure and recorded evidence.

## Attribution and publication

Dependency, model, artwork, and audio provenance are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Public publication is pending the maintainer's license choice and confirmation of rights to supplied reference artwork. No open-source license grant is active yet.
