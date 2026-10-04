# MoveBreak

A macOS desktop companion for camera-verified micro-breaks. Small seated hand/head movements do not interrupt the reminder timer. Camera frames and MediaPipe pose processing stay on the device.

## Run

```sh
pnpm install
pnpm desktop
```

Build a local macOS app with `pnpm desktop:package`. Open `release/MoveBreak-darwin-arm64/MoveBreak.app` on Apple Silicon (the output architecture follows the build machine). This is a local unsigned build, not a notarized distribution.

## Three surfaces

- **Companion:** small, draggable, lightweight window with two macOS-style hide/minimize controls. The red control hides the companion; the yellow control minimizes it. Avatar, instruction, and progress only. Drag the top bar or avatar to move it; remaining reminder time shows minutes and seconds. Camera authorization appears once; later launches start monitoring automatically when macOS permission is already granted.
- **Menu bar:** labeled MoveBreak entry, monitoring status, next reminder, show companion, Settings, pause/resume, and Quit. Hiding the companion keeps monitoring active; pausing releases the camera.
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
