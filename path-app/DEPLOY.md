# Deploying Fam at scale

The app supports two backends:

- **JSON files** (default): no env vars. Data lives in `data/*.json`. Good for local dev.
- **PostgreSQL + optional image storage**: set env vars below for production.

---

## Host on the internet (Render, one-click)

The repo includes a **Blueprint** so you can go from localhost to a live URL in a few minutes.

1. **Push your code** (including `render.yaml` at the **repo root**) to GitHub, GitLab, or Bitbucket.

2. **Sign in at [Render](https://render.com)** and connect the same repo.

3. **New → Blueprint**. Select the repo. Render will detect `render.yaml` at the root.

4. **Apply** (or **Create resources**). Render will:
   - Create a **PostgreSQL** database (`fam-db`).
   - Create a **Web Service** for the Fam app (root directory: `path-app`).
   - Run **schema** on first deploy (`npm run schema`), so tables and session store are created automatically.
   - Set `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`, and `USE_HTTPS` for you.

5. After the first deploy finishes, open the service URL (e.g. `https://fam-xxxx.onrender.com`). Sign up with a new account and create a fam to start using the app.

**Optional:** To enable image uploads (profile/moment photos) instead of base64, add [Supabase Storage](https://supabase.com) and set `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (and optionally `SUPABASE_STORAGE_BUCKET`) in the Render service **Environment** tab. See section 2 below.

**Note:** On the free tier the service may spin down when idle; the first request after idle can take a minute to respond.

---

## 1. PostgreSQL (required for scaling)

1. Create a Postgres database (e.g. [Supabase](https://supabase.com), [Neon](https://neon.tech), [Railway](https://railway.app)).
2. Run the schema once (creates tables and session store):

   ```bash
   psql "$DATABASE_URL" -f db/schema.sql
   ```

   Or from the app directory: `npm run schema` (uses `DATABASE_URL`; see `path-app/scripts/run-schema.js`).  
   Or in Supabase: SQL Editor → paste contents of `path-app/db/schema.sql` → Run.

3. Set in your host:

   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
   ```

4. Restart the app. Sessions are stored in Postgres when `DATABASE_URL` is set (multi-instance safe).

## 2. Image storage (optional but recommended)

Images can stay as base64 in the DB for small setups. For scale, use object storage so the DB only stores URLs.

### Supabase Storage

1. In Supabase: Storage → New bucket → name `uploads` → Public.
2. Get **Project URL** and **Service Role Key** (Settings → API).
3. Set:

   ```env
   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   SUPABASE_SERVICE_KEY=your_service_role_key
   SUPABASE_STORAGE_BUCKET=uploads   # optional, default is uploads
   ```

4. When users upload (profile/moment photos), the app uploads to this bucket and saves the public URL. If these are not set, the app falls back to base64 (works for local/dev).

## 3. Env summary

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | For production | Postgres connection string |
| `SESSION_SECRET` | Recommended | Strong random string for session signing |
| `SUPABASE_URL` | For image uploads | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | For image uploads | Service role key (not anon key) |
| `SUPABASE_STORAGE_BUCKET` | Optional | Bucket name (default: `uploads`) |
| `PORT` | Optional | Server port (default 3000) |
| `NODE_ENV` | Optional | `production` in prod |
| `USE_HTTPS` | Optional | Set to `1` in prod with HTTPS for secure cookies |

## 4. Deploy to Railway or Render (manual)

If you’re not using the Blueprint (`render.yaml` at repo root):

- **Root directory**: `path-app` (if your repo root is the monorepo).
- **Build**: `npm install`
- **Start**: `npm start` (or `node server.js`)
- Add **Postgres** add-on and set `DATABASE_URL`.
- Add the env vars from section 3 (at least `SESSION_SECRET`, `NODE_ENV`, `USE_HTTPS`).
- Run the schema once: from `path-app`, `npm run schema` (with `DATABASE_URL` set), or run `db/schema.sql` against the DB (see step 1).

## 5. Seeding (local JSON only)

The seed script uses the **file-based** DB (`db.js`), not Postgres:

```bash
npm run seed
```

To seed Postgres, use your own script or SQL that inserts into `users`, `moments`, `friends` (and optionally `comments`, `reactions`).
