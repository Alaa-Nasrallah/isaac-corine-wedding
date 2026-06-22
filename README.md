# Isaac & Corine Wedding

Wedding website for Isaac & Corine — June 20, 2026.

**Live site:** [https://isaac-corine-wedding.onrender.com](https://isaac-corine-wedding.onrender.com)

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy (Render)

| Setting | Value |
|---------|--------|
| Build Command | `npm install` |
| Start Command | `npm start` |
| Environment Variable | `LIVE_API_PROXY=on` |

Pushes to `main` redeploy automatically when connected to Render.

## RSVP

With `LIVE_API_PROXY=on`, guest lookup uses the live guest list. For a standalone deploy, set `LIVE_API_PROXY=off` and import guests into `server/guests.json`.
