# Bar Capacity App

Door-count app: live add/remove counter, undo, shift reset, and a manager
audit view of past nights — now backed by a real database instead of mock data.

## How it fits together

- **Frontend** (this folder) — React/Vite, deployed on Netlify.
- **Backend** (`server/`) — Express API + Postgres, deployed on Railway.
  See `server/README.md` for deploy steps.

When door staff tap "Reset shift," the app sends the night's full activity
log to the API, which saves it to Postgres. The manager tab fetches from
that same API, so it always shows real, saved shifts — and polls every 30
seconds so a shift closed on one phone shows up on the manager's device
without needing a manual refresh.

## Run locally

```
npm install
npm run dev
```

By default the frontend talks to `http://localhost:3001` (the local API).
To point it at your deployed Railway API instead, copy `.env.example` to
`.env` and set `VITE_API_URL`.

## Deploy

1. Deploy `server/` to Railway first (see `server/README.md`) and grab its
   public URL.
2. Push this repo to GitHub, import it in Netlify (build command:
   `npm run build`, publish directory: `dist`).
3. In Netlify's site settings, add an environment variable
   `VITE_API_URL` pointing at your Railway API URL, then redeploy.

Netlify will auto-deploy the frontend on every push; Railway will
auto-deploy the API on every push to `server/`.