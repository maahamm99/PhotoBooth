# Together Booth

A synced online photo booth: friends and family in different places join one
"booth", see each other live, and take turns in front of a shared countdown
to build one matching strip — same filter, same frame color, same layout —
just like squeezing into a real photo booth together.

## How it works

- One person **opens a booth** and gets a 5-letter code; everyone else
  **joins with that code**. Up to 4 spots per booth; someone sharing one
  device/camera with another person can claim an extra spot for them too.
- Participants see each other through a small peer-to-peer video mesh
  (WebRTC), so you can actually pose together.
- The host picks a filter and a frame color — it updates live for everyone.
- When the host hits **Take the picture**, every filled spot gets its own
  3-second countdown, one after another — spot 1's countdown finishes and
  captures before spot 2's starts, and so on. Whoever owns the active spot
  captures a frame from their own camera at the count; everyone else just
  watches whose turn it is.

## Privacy: photos never touch a database or disk

- Every captured frame is **canvas-drawn and composited entirely in the
  browser** (see `client/src/utils/compose.js`) — the server never processes
  or re-encodes an image.
- A captured frame is relayed once, over the socket connection, only so the
  other participants' browsers can build the same final strip. The server
  holds it only in a plain in-memory `Map` for the few seconds a round takes
  (`server/index.js`, `room.round.submissions`) and the reference is dropped
  the instant the round finishes or is reset — nothing is written to disk,
  logged, or stored in a database (there is no database in this app).
- Once you close the booth or the round resets, there's nothing left on the
  server for that room's photos.

## Stack

- `server/` — Node + Express + Socket.IO. Holds room state in memory and
  relays WebRTC signaling, countdown timing, and captured frames. No
  database, no accounts.
- `client/` — Vite + React. Camera capture, the WebRTC mesh, the design
  controls, and canvas-based compositing of the final strip all happen in
  the browser.

## Running locally

```bash
npm run install:all   # installs server + client deps
npm run dev            # runs the API/socket server on :4000 and Vite on :5173
```

Open http://localhost:5173, open a booth, then open the booth link in
another tab (or send the code to a friend) to join.

## Production build

```bash
npm run build   # builds client/dist
npm start        # serves client/dist from the Express server on :4000 (or $PORT)
```

## Deploying so friends elsewhere can actually join

This needs a real public URL — it's a live server (Socket.IO + WebRTC
signaling), not a static site, so it can't be hosted on something like
GitHub Pages.

The repo includes a `render.yaml` blueprint for [Render](https://render.com)
(has a free tier and keeps WebSocket connections alive, unlike most
serverless hosts):

1. Push this repo to GitHub (already done if you're reading this there).
2. On Render: **New +** → **Blueprint** → connect this repo → **Apply**.
3. Render builds the client and starts the server on the port it assigns.
   You'll get a URL like `https://together-booth.onrender.com`.
4. Open that URL, start a booth, and send the code/link to anyone,
   anywhere.

The free plan spins the service down when idle, so the first request after
a while takes ~30s to wake up — normal for testing, worth upgrading if you
use this regularly.
