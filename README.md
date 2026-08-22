# Together Booth

A synced online photo booth: friends and family in different places join one
"booth", see each other live, and a synchronized countdown captures a photo
on every screen at the same instant. Everyone gets the exact same strip —
same filter, same frame color, same layout — just like squeezing into a real
photo booth together.

## How it works

- One person **opens a booth** and gets a 5-letter code; everyone else
  **joins with that code**.
- Participants see each other through a small peer-to-peer video mesh
  (WebRTC), so you can actually pose together.
- The host picks a filter, a frame color and a layout (film strip or grid) —
  it updates live for everyone.
- When the host hits **Take the picture**, a synced countdown fires on every
  screen. Each browser captures its own camera frame at the same moment and
  sends it to the server, which hands everyone back one composed image.

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
