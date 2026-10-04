# Deployment — GitHub + Vercel

Complete `SUPABASE_SETUP.md` first (or at least steps 1–3, creating the project and running the migration) — you'll need the API keys from it below.

## 1. Environment variables (required list)

| Variable                        | Required | Where it runs               | Notes                                             |
| ------------------------------- | -------- | --------------------------- | ------------------------------------------------- |
| `SUPABASE_URL`                  | Yes      | Server                      | From Supabase Project Settings → API              |
| `SUPABASE_PUBLISHABLE_KEY`      | Yes      | Server                      | `anon` `public` key                               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Server (secret)             | `service_role` key — never expose to the client   |
| `VITE_SUPABASE_URL`             | Yes      | Browser (baked in at build) | Same value as `SUPABASE_URL`                      |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes      | Browser (baked in at build) | Same value as `SUPABASE_PUBLISHABLE_KEY`          |
| `VITE_SUPABASE_PROJECT_ID`      | Yes      | Browser (baked in at build) | Your project ref                                  |
| `VITE_SITE_URL`                 | Yes      | Browser (baked in at build) | Must exactly match Supabase Auth's Site URL       |
| `GEMINI_API_KEY`                | Yes      | Server                      | Free key from https://aistudio.google.com/apikey  |
| `GEMINI_MODEL`                  | No       | Server                      | Optional override, defaults to `gemini-2.5-flash` |

No legacy platform or third-party proxy variable is required — this project talks directly to Supabase and Google's Gemini API.

## 2. Push to GitHub

```bash
git init                 # if not already a repo
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`.env` is already in `.gitignore` — confirm it wasn't committed (`git status` should not show it).

## 3. Import into Vercel

1. Go to **https://vercel.com/new** and import the GitHub repo.
2. No framework preset or build command changes are needed — this project's Nitro build (`vite.config.ts`) automatically targets the `vercel` preset when `VERCEL=1` is set, which Vercel sets for you, and outputs a Vercel Build Output API v3 bundle (`.vercel/output/`) that Vercel picks up directly.
3. Before the first deploy, open **Project Settings → Environment Variables** and add every variable from the table above (Production, and optionally Preview/Development).
4. Click **Deploy**.

## 4. Connect the domain back to Supabase

Once you know your Vercel URL (e.g. `https://focusflow-ai.vercel.app`, or a custom domain if you attach one):

1. In Vercel, set/confirm `VITE_SITE_URL` to that exact URL, then **redeploy** (it's baked in at build time, so changing it requires a rebuild).
2. In Supabase → **Authentication → URL Configuration**:
   - Set **Site URL** to the same URL.
   - Add `https://<your-domain>/auth/callback` and `https://<your-domain>/auth/callback?type=recovery` to **Redirect URLs**.

## 5. Full authentication flow test (run this after deploying)

- [ ] **Sign up** with a real, deliverable email address.
- [ ] **Email verification** — confirm the email arrives (check spam) and the link redirects to `/auth/callback`, then to the sign-in page with a "Email verified" toast.
- [ ] **Login** with the verified account.
- [ ] **Logout**.
- [ ] **Forgot password** — request a reset email, confirm it arrives.
- [ ] **Password reset** — click the link, confirm it opens `/auth/reset-password`, set a new password, confirm the "Password updated" toast and redirect to sign-in.
- [ ] **Login with the new password** to confirm it was actually updated.
- [ ] **Session persistence** — refresh the page while logged in; session should persist.
- [ ] **Protected routes** — while logged out, visiting a `/_authenticated` route directly should redirect to sign-in.

If email delivery fails at any step, revisit `SUPABASE_SETUP.md` step 7 (Custom SMTP) — Supabase's built-in mailer will not deliver to arbitrary user addresses in production.

## 6. Verify the AI features

- [ ] Add an activity and confirm it's classified (uses Gemini in the background).
- [ ] Open the AI coach, insights, DNA, and life-story features and confirm each responds without errors.
- [ ] If you see a `Missing GEMINI_API_KEY` error, confirm the variable is set in Vercel and redeploy.

## 7. Ongoing deploys

Every push to your main branch (or whichever branch you connect) triggers a new Vercel deployment automatically. Pull request branches get their own preview URLs — if you added the `https://*.vercel.app/auth/callback` wildcard to Supabase's Redirect URLs in `SUPABASE_SETUP.md` step 4, auth will work on those preview URLs too.
