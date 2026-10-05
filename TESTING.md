# MoveBreak verification

## Recorded mechanical checks — 2026-10-05

- `pnpm test`: 37 tests across six files passed.
- A separate clone of committed source installed with `pnpm install --frozen-lockfile`, then passed tests and `pnpm desktop:build`.
- Earlier packaged native smoke checks covered camera/model loading, Settings/save, dragging, hide controls, and continued hidden inference. These do not replace human pose verification.
- Git history scan reviewed 303 text blobs: no credential-pattern matches or unexpected project paths. Three directory-pattern matches were the unmodified MediaPipe virtual path `/home/web_user`. The scan is a focused review, not a guarantee against every possible secret.

## Reproducible build

Use Node.js 22.12+ LTS and pnpm 10. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm desktop:build
pnpm desktop:package
```

Open `release/MoveBreak-darwin-arm64/MoveBreak.app` on Apple Silicon. The unsigned app is a local demo build. Browser development uses `pnpm dev`; browser previews cannot validate native Tray/Settings/window behavior.

## Final acceptance run

Start seated at a stationary camera, with good lighting and both shoulders visible. Open Settings, expand Developer, enable demo mode, select four movements and a three-second hold, keep debug camera off, and Save. Restore daily preferences after testing.

1. Baseline completes, then the five-second reminder counts down. Small head/hand movement should not restart it.
2. “Time to move” waits for an actual stable rise. Remain seated briefly to check that no routine starts early.
3. Raise both wrists above shoulders. The cue stays visible, a green matched highlight appears, and matched/hold sounds play.
4. Follow left bend, right bend, and rotation in both directions. Each advances after valid held time.
5. Briefly leave the frame during a step. Progress pauses, current cue remains, and visibility guidance appears. Return and finish without losing accumulated progress.
6. Completion shows the resting figure. Stay standing: no new seated cycle should begin.
7. Sit near the original baseline. A distinct new-cycle cue plays; the next cycle receives the full five seconds.
8. Repeat the whole loop five times. Record pass/fail and any stuck/false completion state.

## Desktop and audio checks

- Drag background/character during monitoring, a routine, and completion. Red/yellow hide controls remain clickable.
- Locate the black figure in the macOS menu bar. Show companion, open Settings, pause/resume, and Quit work.
- Hide the window and wait for the reminder; reopen through the Tray. Confirm verification and audible cues continue.
- Save a changed duration, verify refreshed countdown, restart, and confirm preferences persist.
- Turn sound off and confirm reminder/hold/transition cues stop; restore the prior setting.
- If claiming launch-at-login, install at the final location and test a real logout/login. Registration-only smoke checks are insufficient.

## Evidence log

| Evidence | Status |
| --- | --- |
| Automated tests and clean-clone build | Passed |
| Latest normal-mode Overhead Reach with real movement | Awaiting human retest |
| All four movements / five consecutive native cycles | Awaiting human retest |
| Actual cue audibility and final menu-bar interactions | Awaiting human acceptance |
| Login session from installed location | Not performed |

Synthetic landmarks or developer state previews must never be presented as live camera acceptance evidence.
