# feature/p2p-mediapipe-toggle

## Summary

- Added a P2P-only MediaPipe toggle to `public/p2p.html`.
- Added `public/js/mediaPipeClient.js` as a temporary MediaPipe processing helper.
- Updated `public/js/pages/p2pPage.js` to keep the original camera `localStream` and swap only the outgoing video track when the toggle changes.

## Files Changed

### `public/p2p.html`

- Added `#mediapipe-toggle`.
- Kept the page entry script as `/js/pages/p2pPage.js`.

### `public/js/mediaPipeClient.js`

- Replaced the placeholder file with a temporary P2P MediaPipe helper.
- Loads MediaPipe Pose from jsDelivr at runtime.
- Uses this processing path:

```text
local camera video track -> hidden video -> MediaPipe Pose -> skeleton canvas overlay -> canvas.captureStream()
```

- Produces a processed `MediaStream` with:
  - processed video from `canvas.captureStream()`
  - original audio tracks from the source stream
- Exposes cleanup through `session.stop()`.

### `public/js/pages/p2pPage.js`

- Imports `createP2PMediaPipeSession`.
- Adds P2P-only state:
  - `sendingStream`
  - `localVideoSender`
  - `mediaPipeSession`
- Stores the video `RTCRtpSender` returned by `peerConnection.addTrack()`.
- Uses `RTCRtpSender.replaceTrack()` so the call can switch between:
  - original camera video
  - MediaPipe processed video
- Updates `localVideo.srcObject` to preview whichever stream is currently being sent.

## Scope

- Server code was not changed.
- Socket.IO event names and signaling flow were not changed.
- P2P room creation/join flow was not changed.
- Group/mediasoup flow was not changed.
- Audio remains the original microphone track.

## Runtime Notes

- The browser must be able to load MediaPipe Pose assets from:

```text
https://cdn.jsdelivr.net/npm/@mediapipe/pose
```

- If MediaPipe fails to load, the toggle is turned off and the page falls back to the original camera video.
- The current temporary effect is a pose skeleton overlay drawn on top of the local video.
