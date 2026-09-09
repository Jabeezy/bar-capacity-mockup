# Door Count API (Railway)

Small Express API that stores each night's shift data in Postgres, so the
manager tab can read real history instead of the mocked-up array.

## Deploy to Railway

1. Push this `server/` folder to its own GitHub repo (or a `server` subfolder
   of your existing repo — Railway lets you set a root directory per service).
2. In Railway: **New Project → Deploy from GitHub repo**, pick this repo.
   - If it's a subfolder, set **Root Directory** to `server` in the service settings.
3. **Add a Postgres database**: New → Database → PostgreSQL. Railway
   auto-injects `DATABASE_URL` into your other service — no manual copying needed
   as long as both are in the same project.
4. Run the schema once: open the Postgres plugin's **Query** tab in Railway
   and paste in the contents of `schema.sql`, or connect with `psql` using the
   connection string Railway shows you.
5. In the API service's **Variables** tab, add:
   - `ALLOWED_ORIGIN` — your Netlify site URL (e.g. `https://your-bar-app.netlify.app`)
6. Railway will build and deploy automatically. Grab the public URL it gives
   the service (Settings → Networking → Generate Domain) — you'll need it for
   the frontend's `VITE_API_URL`.
7. Confirm it's alive: visit `https://<your-railway-domain>/api/health`, you
   should see `{"ok":true}`.

## Local testing (optional)

```
cd server
npm install
DATABASE_URL=<your-railway-postgres-url> npm start
```