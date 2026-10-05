# Third-party notices and asset provenance

Reviewed 2026-10-05. This inventory records provenance; it does not grant rights to the maintainer's code or reference images.

## Dependencies and model

| Component | Use | License / source |
| --- | --- | --- |
| Electron | macOS windows, Tray, permissions | MIT; [included license](licenses/Electron-MIT.txt). Packaged Electron retains its Chromium `LICENSES.chromium.html`. |
| MediaPipe Tasks Vision | Browser pose inference; copied runtime files in `public/wasm/` | Installed package declares Apache-2.0; [upstream](https://github.com/google-ai-edge/mediapipe), [included license](licenses/Apache-2.0.txt). |
| Pose Landmarker Lite | `public/models/pose_landmarker_lite.task` | Google MediaPipe BlazePose GHUM model; [model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf) specifies Apache-2.0. [Download documentation](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker). |
| TypeScript | Type checking/build | Apache-2.0; installed package retains its license. |
| Vite, Vitest, Electron Packager | Development/build/test tools | MIT; installed packages retain their own license notices and dependency notices. |

Model SHA-256: `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`.

Copied MediaPipe runtimes are unmodified. Their `/home/web_user` string is an upstream virtual filesystem path, not a developer's personal directory. Libraries and pretrained weights are incorporated dependencies; no custom model was trained.

## Artwork

- `src/assets/translucent-figure-reference.png`: user-supplied translucent figure style reference.
- `src/assets/movement-cue-atlas.png`: AI-generated movement frames based on the approved reference, prepared for animation.
- `src/assets/translucent-seated-clean.png`, `stand-prompt.png`, `seated-return-prompt.png`: supplied/derived character images prepared during this project.
- `electron/assets/movebreak-icon.png`, `movebreak.icns`, and template Tray PNGs: derived from the user-supplied application icon, resized/converted for native use.

**Publication gate:** The maintainer must confirm ownership or permission to distribute the supplied references and their derivatives. AI generation/editing does not establish rights to the source reference. These assets are not automatically covered by a future code license.

## Audio

`src/sound.ts` synthesizes short oscillator tones locally using Web Audio. There are no downloaded music tracks, sampled video audio, or external sound files in the tracked project.

## Original project code

History begins on 2026-10-02 in an isolated repository. Reviewed historical paths are confined to MoveBreak source, assets, configuration, and planning documents. No unrelated parent-project paths were found. This is a history review, not proof of authorship or an eligibility declaration.

The maintainer's code-license decision is pending. Before public release, retain applicable dependency/model notices and confirm artwork rights.
