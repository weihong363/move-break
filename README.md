# MoveBreak

MoveBreak is a small browser companion that watches for prolonged low movement, then requires a camera-verified movement break. Video frames and pose detection stay on the device.

## Run locally

```sh
pnpm install
pnpm dev
```

Open the Vite URL in a modern desktop browser. Camera access works on `localhost`; a deployed build must use HTTPS.

## Demo flow

1. Choose the 5-second inactivity demo threshold and press **Enable camera**.
2. Hold still for about 1.5 seconds to establish a baseline, then stay inactive until the movement prompt appears.
3. Stand up, then move for 4 accumulated seconds. Brief natural pauses retain progress; lost tracking pauses it.
4. Confirm **Movement break completed**, then watch local inactivity monitoring restart in the same camera session.

If camera permission was denied, allow it in the browser's site settings before pressing **Try camera again**. A browser page cannot reset that permission itself.

## Verify

```sh
pnpm test
pnpm build
```
