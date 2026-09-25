# BaGdar frontend

Voice-first kiosk interface for the BaGdar tourist guide. The frontend follows the frozen contracts in `docs/api/` and does not call routing, STT, or LLM providers directly.

## Run

```bash
npm install
npm run dev
```

Vite proxies `/api` and `/static` to `http://localhost:8000` in development.

Development uses contract-shaped data from `src/mocks/` by default, so the full kiosk flow works without FastAPI. To test the real backend instead:

```bash
$env:VITE_USE_MOCKS='false'; npm run dev
```

Open `http://localhost:5173/?debug=1` for the tech-lead-only text fallback when no microphone is available. This control is never shown in the normal kiosk URL.

## Checks

```bash
npm run check
npm run build
```

## Kiosk behaviour

- sound above −42 dBFS wakes the idle screen;
- speech above −30 dBFS starts a turn and 1.2 seconds of silence ends it;
- Web Speech supplies text when supported, otherwise MediaRecorder sends `audio_b64`;
- the backend controls screens through ordered `actions` from `/api/dialog/turn`;
- session and QR timeouts come from `/api/config`;
- the last catalogue response is cached for the offline fallback.
- optional camera presence uses the browser face detector when available and a local motion fallback otherwise;
- HuskyLens or another hardware bridge can dispatch `bagdar:presence` with `{ detail: { present: true } }`.
