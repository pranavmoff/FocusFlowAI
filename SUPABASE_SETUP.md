# Supabase Setup — New Project

This project has been fully detached from any previous Supabase project. Follow these steps in order to stand up a brand-new Supabase backend for it.

---

## 1. Create a new Supabase project

1. Go to **https://supabase.com/dashboard** and sign in.
2. Click **New Project**.
3. Choose an organization, give the project a name (e.g. `focusflow-ai`), generate/set a strong database password (save it somewhere safe — you won't need it for this app, but you'll want it for direct DB access later), and pick a region close to your users.
4. Click **Create new project** and wait for provisioning to finish (a couple of minutes).

## 2. Copy the required API keys

Go to **Project Settings → API** (left sidebar → gear icon → API).

| Value on this page                                                | Env var in this project                                                                                          |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Project URL                                                       | `SUPABASE_URL` and `VITE_SUPABASE_URL`                                                                           |
| `anon` `public` key                                               | `SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY`                                                   |
| `service_role` `secret` key                                       | `SUPABASE_SERVICE_ROLE_KEY` (server only — never put this in a `VITE_*` variable or it will ship to the browser) |
| Project ID (also visible in the URL / Project Settings → General) | `VITE_SUPABASE_PROJECT_ID`                                                                                       |

Paste these into your `.env` file (local) and, later, into Vercel's Environment Variables (production) — see `DEPLOYMENT.md`.

## 3. Run the SQL migration

The full schema (tables, RLS policies, functions, triggers, grants) lives in one file: `supabase/migrations/20260701000000_initial_schema.sql`. Run it once, either via the dashboard or the CLI.

**Option A — SQL Editor (fastest, no CLI needed)**

1. In the Supabase dashboard, go to **SQL Editor** → **New query**.
2. Open `supabase/migrations/20260701000000_initial_schema.sql` from this project, copy its entire contents, and paste it into the editor.
3. Click **Run**. It should complete with no errors and create 17 tables plus supporting functions/triggers.

**Option B — Supabase CLI**

```bash
npm install -g supabase
supabase login
# Edit supabase/config.toml first: replace "your-new-project-ref" with your
# actual project ref (Project Settings → General → Reference ID)
supabase link --project-ref <your-project-ref>
supabase db push
```

Either way, verify it worked: **Table Editor** in the dashboard should show `profiles`, `activities`, `goals`, `streaks`, `achievements`, `ai_insights`, `productivity_dna`, `dna_history`, `life_stories`, `habit_catalog` (pre-seeded with ~22 rows), `user_habits`, `habit_completions`, `emotion_entries`, `tasks`, `subtasks`, `activity_dataset`, and `activity_knowledge_base`.

## 4. Configure Authentication → URL Configuration

**Path:** left sidebar → **Authentication** → **URL Configuration**

### Site URL

Set this to your production domain (no trailing slash):

```
https://your-app.vercel.app
```

You'll come back and update this once you know your final Vercel URL — a placeholder is fine for now, but auth emails won't redirect correctly until this is set to the real domain.

### Redirect URLs

Add every URL this app can send users back to. Supabase only honors a `redirectTo` if it's listed here — otherwise it silently falls back to the Site URL.

| Environment                                        | Redirect URL to add                              |
| -------------------------------------------------- | ------------------------------------------------ |
| Local development                                  | `http://localhost:8080/auth/callback`            |
| Local development (reset flow)                     | `http://localhost:8080/auth/recovery`            |
| Local development (signup confirm)                 | `http://localhost:8080/auth/confirm-email`       |
| Vercel production                                  | `https://your-app.vercel.app/auth/callback`      |
| Vercel production (reset flow)                     | `https://your-app.vercel.app/auth/recovery`      |
| Vercel production (signup confirm)                 | `https://your-app.vercel.app/auth/confirm-email` |
| Vercel preview deployments (optional, recommended) | `https://*.vercel.app/auth/callback`             |

Replace `your-app.vercel.app` with your real domain once you have it (see `DEPLOYMENT.md`), and add it here too. If your dev server runs on a different port (see step 9), use that port instead of 8080 in the local rows above. Click **Save**.

## 5. Configure Authentication → Providers → Email

**Path:** left sidebar → **Authentication** → **Providers** → **Email**

- Confirm **Email** provider is **enabled** (it is by default on a new project).
- Confirm **Confirm email** is **enabled** — this makes `signUp()` require email verification before the account can sign in, which is what this app expects (see `src/routes/auth.callback.tsx`).

## 6. Configure email verification & password reset (Email Templates)

**Path:** left sidebar → **Authentication** → **Emails** → **Templates**

⚠️ **Do not use the default `{{ .ConfirmationURL }}` variable for Confirm signup or Reset Password.** That link is a one-time Supabase URL that gets consumed by whatever loads it first — including many email clients' automatic link-scanners/prefetchers — often before the user ever clicks it. That's what produces an `otp_expired` error on a link that was never intentionally used. This app instead lands the user on an intermediate FocusFlow page that only spends the one-time token after an explicit button click (`src/routes/auth.recovery.tsx` and `src/routes/auth.confirm-email.tsx`). For that to work, edit both templates to use `{{ .TokenHash }}` and `{{ .RedirectTo }}` instead:

**Reset Password** template — set the link/button URL to:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery
```

**Confirm signup** template — set the link/button URL to:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup
```

`{{ .RedirectTo }}` resolves to whatever `redirectTo`/`emailRedirectTo` the app passed when calling `resetPasswordForEmail`/`signUp` (see `src/lib/site-url.ts`), so this works for both local development and production without any template changes between environments. Save each template after editing.

## 7. Email delivery (SMTP)

**Path:** left sidebar → **Authentication** → **Emails** → **SMTP Settings**

By default, a new Supabase project sends auth emails through Supabase's **built-in mailer**, which is intentionally rate-limited (a small number of emails/hour) and **only delivers to email addresses belonging to members of your Supabase organization**. This is fine for your own testing during setup, but:

- **For real users, you must enable Custom SMTP** with a transactional email provider (Resend, SendGrid, Mailgun, Postmark, etc.):
  1. Create an account and verify a sending domain with your chosen provider.
  2. Toggle **Enable Custom SMTP** on this page.
  3. Enter Host, Port, Username, Password, and a Sender email matching the authenticated domain (e.g. `no-reply@yourdomain.com`).
  4. Save, then send a test invite (**Authentication → Users → Add User → Send invitation**) to confirm delivery.

## 8. Password-change behavior

This app's reset flow (`updateUser({ password })` on `/auth/reset-password`) already fully satisfies "user sets a new password, redirect to sign in, password successfully updated" — no extra configuration needed for that.

Two related, optional settings you may want:

- **Secure password change** (Authentication → Providers → Email → advanced settings, or Authentication → Policies depending on dashboard version): when enabled, Supabase requires a user to have signed in recently (or reauthenticate) before `updateUser({ password })` succeeds. This is a security hardening option, not required for the app to function, since the reset flow already establishes a fresh session via the emailed recovery link.
- **A "your password was changed" notification email is not sent automatically by Supabase** — there's no built-in toggle for it. If you want one, the standard approach is a Supabase **Auth Hook** ("Send Email" hook) or a Database Webhook on `auth.users` that fires on password-related updates and calls your own email-sending function. This is an enhancement beyond what the app currently does; the app already gives the user an in-app confirmation ("Password updated. Please sign in with your new password.") immediately after a successful reset.

## 9. Local development

Fill in `.env` (copy from `.env.example` if needed) with the values from step 2, plus:

```
VITE_SITE_URL="http://localhost:8080"
```

If port 8080 is already in use on your machine, set `PORT=8081` (or any free port) in `.env` and update `VITE_SITE_URL` to match — do not hardcode the port anywhere in source, both of these are read from the environment (`vite.config.ts` and `src/lib/site-url.ts`).

Then:

```bash
npm install
npm run dev
```

Visit `http://localhost:8080` (or your configured `PORT`) and run through sign up → verify → login → logout → forgot password → reset.

## 10. Production

Once deployed (see `DEPLOYMENT.md`), come back to steps 4 and update the Site URL and Redirect URLs with your real Vercel domain.
