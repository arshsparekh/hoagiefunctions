# Backend (Supabase / Postgres)

This folder is the **production data layer** hoagiefunctions is designed to run on.
The app ships today as a local-first PWA (state persisted in the browser via
`src/store.ts`), but every rule the client enforces was written to map 1:1 onto a
real Postgres schema with row-level security. That mapping is deliberate: it's how
you take a convincing demo to something students can actually trust with their
club rosters and guestlists.

## Files

| File | What it is |
|---|---|
| `schema.sql` | Tables, enums, constraints, indexes. One table per type in `src/data/seed.ts`. |
| `policies.sql` | RLS policies + helper functions + secure RPCs. The real authorization layer. |

Apply locally with the Supabase CLI:

```bash
supabase start
psql "$DATABASE_URL" -f supabase/schema.sql
psql "$DATABASE_URL" -f supabase/policies.sql
```

## How the client maps to it

| Client (`src/`) | Backend |
|---|---|
| `store.ts` selectors (`visibleEvents`, `myClubs`, …) | `select` under `events_select` RLS |
| `lib/visibility.ts` `canSeeEvent` | `can_see_event()` + `events_select` policy |
| `lib/visibility.ts` `canManageEvent` | `can_manage_event()` used by update/delete/approve policies |
| `store.rsvp` capacity + waitlist | `rsvp_to_event()` RPC (atomic, `SELECT … FOR UPDATE`) |
| `store.cancelRsvp` promotion | `cancel_rsvp()` RPC (+ `promotedFromWaitlist` notification) |
| `store.approveApplicant` | `approve_application()` RPC (manager-only) |
| notification fan-out on create | `trg_notify_followers` trigger |
| `lib/validation.ts` limits | `check` constraints on `events` (title 3–80, description ≤1000, capacity, time) |

The guards in the store are **defense in depth**. They give instant feedback and
keep the UI honest, but they are not the security boundary - RLS is. A user who
bypasses the UI and calls the REST/RPC endpoints directly is still bound by the
exact same predicates, because both sides were written from one spec.

## Identity: netID / Hoagie SSO

Identity is intentionally **not** built here - it's the one piece "anyone can
access easily" through the existing Hoagie identity stack. In production:

1. Students sign in with **Princeton CAS / netID** (or the shared Hoagie profile),
   surfaced to Supabase as an **OIDC provider**. Supabase Auth mints the session
   and populates `auth.users`.
2. A trigger on `auth.users` (or first-login upsert) creates the matching
   `profiles` row (name, class year, avatar color).
3. Every policy keys off `auth.uid()` - so the moment SSO is wired in, all of the
   authorization in `policies.sql` is live with zero app changes.

Until then, the app uses the demo "View as" switcher (`src/store.ts`) to stand in
for a session, which is why the store keeps identity swappable.

## Migration path (local-first → Supabase)

The store is already the single seam. To go live you swap its persistence for a
thin data client without touching a single page/component:

- Replace `persist(localStorage)` with a Supabase-backed repository behind the
  same `AppState` action signatures (`rsvp`, `createEvent`, …).
- Reads become `select`s (RLS-filtered); capacity-sensitive writes become the
  RPCs above; realtime subscriptions replace manual re-reads.
- Because `ActionResult` already models `{ ok, reason }`, surfacing a policy
  denial from the server needs no new UI.
