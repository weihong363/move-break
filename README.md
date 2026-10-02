# MoveBreak

MoveBreak is a small browser timer that requires a camera-verified movement break before the user can start the next work session. Video frames and pose detection stay on the device.

## Run locally

```sh
pnpm install
pnpm dev
```

Open the Vite URL in a modern desktop browser. Camera access works on `localhost`; a deployed build must use HTTPS.

## Demo flow

1. Use the 1-second demo duration for rapid iteration, or keep the default 10-second work duration for the recorded flow, then press **Start**.
2. When the break starts, press **Enable camera** and allow access.
3. Hold still for about 1.5 seconds.
4. Stand up, then move for 4 accumulated seconds. Brief natural pauses retain progress; lost tracking pauses it.
5. Confirm **Movement break completed**, then press **Start next session**.

If camera permission was denied, allow it in the browser's site settings before pressing **Try camera again**. A browser page cannot reset that permission itself.

## Verify

```sh
pnpm test
pnpm build
```
