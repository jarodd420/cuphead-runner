# Fam on Glitch + Supabase (no credit card)

Step-by-step to get Fam live using free Glitch (app) and Supabase (database).

---

## Part 1: Supabase (database)

1. **Create account and project**
   - Go to [supabase.com](https://supabase.com) and sign up (no credit card).
   - **New project** → pick org, name (e.g. `fam`), database password (save it), region → **Create**.

2. **Run the schema (create tables)**
   - In the Supabase dashboard: **SQL Editor** → **New query**.
   - Open the file `path-app/db/schema.sql` from this repo and copy its **entire** contents.
   - Paste into the SQL Editor → **Run**. You should see “Success. No rows returned.”

3. **Get the connection string**
   - **Project Settings** (gear) → **Database**.
   - Under **Connection string** choose **URI**.
   - Copy the URI. It looks like:
     `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - Replace `[YOUR-PASSWORD]` with the database password you set when creating the project.
   - For Glitch (long-lived server), use the **Session** pooler (port **6543**) if Supabase shows both Session and Transaction; otherwise use the one URI they give you.

---

## Part 2: Glitch (app)

1. **Import the repo**
   - Go to [glitch.com](https://glitch.com) and sign in (e.g. GitHub).
   - **New project** → **Import from GitHub**.
   - Enter: `https://github.com/YOUR_USERNAME/cuphead-runner` (replace with your repo URL).
   - Glitch will clone the repo. The root `package.json` is set up so it installs and runs the app from `path-app`.

2. **Set environment variables**
   - In your Glitch project: **Tools** → **Environment** (or the **.env** panel).
   - Add:

   | Name            | Value |
   |-----------------|--------|
   | `DATABASE_URL`  | The Supabase connection string from Part 1 (with password filled in). |
   | `SESSION_SECRET`| A long random string (e.g. 32+ characters; generate one at [randomkeygen.com](https://randomkeygen.com) or similar). |
   | `NODE_ENV`      | `production` |
   | `USE_HTTPS`     | `1` |

   - Save. Glitch will restart the app.

3. **Open the app**
   - Use **Share** → **Live site** (e.g. `https://your-project.glitch.me`).
   - You should see the Fam login screen. Sign up with a new account, create a fam, and invite people.

---

## Troubleshooting

- **“relation does not exist” or schema errors**  
  Make sure you ran the full `path-app/db/schema.sql` in Supabase SQL Editor (Part 1, step 2).

- **“Connection refused” or database errors**  
  Check that `DATABASE_URL` in Glitch is exactly the Supabase URI, with the correct password and no extra spaces. Use the Session pooler (port 6543) for a persistent Node server.

- **App sleeps**  
  Glitch free tier may put the app to sleep after inactivity; the first load after that can take 30–60 seconds.

- **Need to re-run schema**  
  You can run `path-app/db/schema.sql` again in Supabase SQL Editor anytime; it uses `CREATE TABLE IF NOT EXISTS` so it won’t overwrite data.
