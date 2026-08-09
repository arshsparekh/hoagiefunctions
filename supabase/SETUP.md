# Going live for $0 — backend + deploy setup

The whole stack can run on free tiers. Two pieces: **Supabase** (database + auth)
and a static host (**Vercel** or **Netlify**) for the app.

---

## 1. Backend: Supabase (free tier)

Free tier is plenty for a launch: 500 MB Postgres, 50,000 monthly active auth
users, 5 GB bandwidth, unlimited API requests.

1. Go to **supabase.com** → sign in with GitHub → **New project**.
   - Name it `hoagiefunctions`, pick a region near NJ (**East US**), set a DB
     password (save it), Free plan.
2. When it's ready, open **SQL Editor** and run the two files in this folder, in
   order:
   1. paste all of `schema.sql` → Run
   2. paste all of `policies.sql` → Run
   That creates every table, constraint, index, the RLS policies, and the secure
   RPCs (capacity/waitlist, notification fan-out).
3. **Settings → API**: copy the **Project URL** and the **anon public** key.
   You'll put these in the app's env (step 3).

### Auth (the "netID" piece) — the easy free path

Princeton runs on **Google Workspace** (`@princeton.edu`), and Supabase has
Google sign-in built in for free — so "Sign in with Google, restricted to
princeton.edu" effectively *is* netID sign-in, with zero custom code.

1. **Authentication → Providers → Google** → enable.
2. Create a Google OAuth client (Google Cloud Console → Credentials → OAuth
   client ID → Web app). Add Supabase's callback URL (shown on the provider
   page) as an authorized redirect URI. Paste the client ID/secret into Supabase.
3. Lock it to Princeton: either set the Google OAuth consent screen to
   "Internal" under the princeton.edu org (if you have access), or check
   `email.endsWith('@princeton.edu')` on first login and reject otherwise.
4. Add a trigger so a `profiles` row is created on first sign-in:

   ```sql
   create function handle_new_user() returns trigger
   language plpgsql security definer set search_path = public as $$
   begin
     insert into profiles (id, name, class_year, avatar_color)
     values (new.id, coalesce(new.raw_user_meta_data->>'full_name','New Student'), 2029, '#4B57D6')
     on conflict (id) do nothing;
     return new;
   end; $$;
   create trigger on_auth_user_created
     after insert on auth.users for each row execute function handle_new_user();
   ```

> True Princeton **CAS/netID** (not Google) needs an OIDC bridge in front of CAS —
> more work, and not needed to launch. Google-restricted-to-princeton.edu is the
> pragmatic v1.

### Seed data

Turn `src/data/seed.ts` into SQL `insert`s (or a small Node script using the
service-role key) to populate clubs/buildings/events for the demo. Keep it in a
`supabase/seed.sql` you run once.

---

## 2. Wire the app to Supabase

The store (`src/store.ts`) is deliberately the single seam. Today its actions
mutate in-memory state and persist to localStorage; to go live you swap that for
Supabase calls **behind the same action signatures** — pages/components don't
change.

1. `npm install @supabase/supabase-js`
2. `.env.local` (gitignored):
   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```
3. `src/lib/supabase.ts`:
   ```ts
   import { createClient } from '@supabase/supabase-js'
   export const supabase = createClient(
     import.meta.env.VITE_SUPABASE_URL,
     import.meta.env.VITE_SUPABASE_ANON_KEY,
   )
   ```
4. Replace the store internals:
   - **reads** (`visibleEvents`, `myClubs`, …) → `supabase.from('events').select(...)`
     — RLS filters rows automatically, so `visibleEvents` becomes a plain select.
   - **capacity-sensitive writes** → the RPCs: `supabase.rpc('rsvp_to_event', { p_event })`,
     `cancel_rsvp`, `approve_application`.
   - **simple writes** (comments, saves, follows, edits) → `insert`/`update`/`delete`;
     RLS enforces permissions server-side (the client guards stay as fast UX checks).
   - **realtime** (optional): `supabase.channel(...)` on `events`/`comments` to live-update.
   Because `ActionResult` already models `{ ok, reason }`, surfacing a policy
   denial from the server needs no UI change.
5. Swap `viewAs` for the real session (`supabase.auth.getUser()` / `onAuthStateChange`).

This is the one real chunk of work left — the schema, policies, and RPCs are done.

---

## 3. Deploy the frontend (free)

**Vercel** (easiest): vercel.com → New Project → import the GitHub repo →
framework auto-detects **Vite** → add the two `VITE_SUPABASE_*` env vars → Deploy.
`vercel.json` in the repo already handles SPA deep links (so shared `/event/:id`
links resolve). Every push to `main` auto-deploys.

**Netlify** works the same way (`public/_redirects` handles the SPA fallback).

You'll get a URL like `hoagiefunctions.vercel.app` to put in your application.

---

## TL;DR

| Piece | Free tool | Cost |
|---|---|---|
| Database + RLS | Supabase Postgres | $0 |
| Auth (netID-ish) | Supabase + Google (princeton.edu) | $0 |
| Hosting | Vercel / Netlify | $0 |
| CI | GitHub Actions | $0 |

Ready to run: `schema.sql`, `policies.sql`, `vercel.json`, `public/_redirects`.
Remaining work: point the store at Supabase (step 2) + add the sign-in button.
