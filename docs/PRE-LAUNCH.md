# Pre-launch checklist

Everything between "the demo works" and "real Princeton students are using it."
Grouped by priority. `supabase/SETUP.md` covers standing up the DB/auth/host —
this covers everything else. Items marked **[done]** already ship in the repo.

---

## A. Blockers — can't launch without these

- [ ] **Wire the store to Supabase.** Today all data lives in `localStorage`.
  Point `src/store.ts` actions at Supabase (see `supabase/SETUP.md` §2). This is
  the one big remaining build task; the schema, RLS, and RPCs are done.
- [ ] **Real sign-in.** Replace the `viewAs` demo switch with Supabase auth
  (Google restricted to `@princeton.edu`). Create the `profiles` row on first
  login (trigger in SETUP.md). Gate the whole app behind being signed in.
- [ ] **Seed the real reference data.** Insert the actual eating clubs + campus
  buildings so the map and hosts resolve. Decide: launch with a curated set of
  real clubs, or let clubs self-register (needs an approval flow).
- [ ] **Bootstrap the first admins.** Someone has to be able to grant club-admin.
  Pick a super-admin (you), and either (a) hand-set `club_admins` rows in the DB
  for the initial club leads, or (b) build a tiny "claim your club" request +
  manual approval. Without this, no one can post as a club.
- [ ] **Secrets hygiene.** `.env.local` is gitignored; the **anon** key is fine
  in the client, the **service-role** key is server-only (never in the app / never
  committed). Rotate anything that ever touched a commit.

## B. Safety & trust — do before real students post

Comments and events are user-generated. You need a way to deal with bad content
*before* strangers can post, not after.

- [ ] **Reporting.** Add a "Report" action on events and comments (a `reports`
  table: reporter, target, reason, status). Even a basic one.
- [ ] **Moderation.** A super-admin view to review reports and hide/remove
  content. `deleteComment`/`deleteEvent` already authorize host+admin; add a
  platform-moderator role for cross-club takedowns.
- [ ] **Block / mute** (nice-to-have): let users hide a person's posts.
- [ ] **Rate limiting.** Cap posting frequency (Supabase Edge Function or a
  per-user counter) so one account can't spam events/comments.
- [ ] **Content limits are enforced** **[done]** — length + sanitization in
  `lib/validation.ts` and DB `check` constraints; no raw-HTML sinks (XSS-safe).

## C. Legal & privacy — required once you collect student data

*(Not legal advice — run these by someone who knows Princeton's policies / a
lawyer. Talk to the Hoagie leads; the family likely already has templates.)*

- [ ] **Privacy policy** — what you collect (name, class year, email, RSVPs),
  why, retention, who can see it, how to delete it. Link it in the footer.
- [ ] **Terms of use / community guidelines** — acceptable content, enforcement.
- [ ] **Data minimization** — only store what you need; don't log emails in URLs
  (the app already avoids this).
- [ ] **Account/data deletion** — a "delete my account" path (RLS + a cascade).
- [ ] **FERPA / student-data awareness** — event attendance is arguably sensitive;
  keep guest lists visible only to hosts + attendees (the RLS already does this).
  Confirm with Princeton before launch.

## D. Operations — set up around launch day

- [ ] **Error tracking** — Sentry (free tier) in the app + Supabase logs. You
  want to know when something breaks for a real user.
- [ ] **Uptime monitoring** — UptimeRobot / BetterStack (free) pinging the site.
- [ ] **Analytics (privacy-friendly)** — Plausible / Umami / PostHog (free tiers).
  Track pages + key actions (RSVP, create, sign-up) to see what's used.
- [ ] **Backups** — Supabase free tier keeps limited backups; for real data,
  schedule a periodic `pg_dump` (a cron / GitHub Action) somewhere safe.
- [ ] **CI is green on main** **[done]** — `.github/workflows/ci.yml` runs
  lint + tests + build on every push.
- [ ] **A staging project** — a second free Supabase project + a Vercel preview
  so you test migrations before they hit real users.

## E. Product polish — improves launch, not required

- [ ] **Social share previews (OG images).** Add `<meta>` tags + a per-event
  Open Graph image so a shared `/event/:id` link looks good in iMessage/Slack.
  (This version has the Web Share + copy-link action, but no OG image yet.)
- [ ] **Email digests / reminders.** In-app notifications ship today; add email
  via Supabase + Resend (free tier) for "event tomorrow" / weekly digest. Optional
  web push for installed PWAs.
- [ ] **Onboarding.** A short first-run: pick interests/clubs to follow so the
  "For You" feed isn't empty on day one.
- [ ] **Custom domain** — e.g. a `hoagie` subdomain; Vercel/Netlify give free
  HTTPS. Update the PWA `start_url`/manifest if the origin changes.
- [ ] **Pagination.** The feed/search load all events; once there are hundreds,
  paginate the Supabase queries (indexes already exist in `schema.sql`).
- [ ] **Empty/loading/offline states** — mostly **[done]** (skeletons, empty
  states, error boundary, PWA offline cache); re-check once data is remote.
- [ ] **Accessibility** — strong already **[done]** (dialogs, focus management,
  skip link, AA contrast, combobox ARIA). Do one screen-reader pass on the live
  build.

## F. Hoagie-family fit — since this is a Hoagie app

- [ ] **Shared identity.** If Hoagie has a common auth / profile service, use it
  instead of standalone Google so a student's Hoagie profile carries across apps
  (the codebase already treats identity as a swappable seam).
- [ ] **Deployment conventions.** Match how the other Hoagie apps deploy/host and
  get `functions` listed in the family (the app switcher, shared nav, etc.).
- [ ] **Design consistency** **[done-ish]** — matches the Hoagie system (pink
  brand, Nunito/Inter, the pink bar + white nav). Sanity-check against the latest
  hoagiemail/hoagieplan before shipping.
- [ ] **Talk to the leads early** — for an interview/club-entry project, showing
  up with "here's the app, here's how it plugs into Hoagie, here's the launch
  plan" is the whole point.

---

## Suggested rollout

1. **Wire Supabase + auth + seed clubs + set yourself super-admin** (Section A).
2. **Add reporting + a moderation view** (Section B) — minimum to let others post.
3. **Privacy policy + terms** in the footer (Section C).
4. **Deploy to a custom URL, add Sentry + analytics** (Section D).
5. **Soft launch to 2–3 friendly clubs.** Watch errors/analytics, fix, iterate.
6. **Open to campus** once it's stable and moderated.

Don't build all of E/F before launching — ship the A→C core to a few clubs,
learn, then layer the rest.
