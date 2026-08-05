# Security notes

A short, honest threat model for hoagiefunctions - what's protected, how, and
what's explicitly out of scope for the current build.

## Trust boundaries

- **Identity is external.** Sessions come from Princeton netID / Hoagie SSO (see
  `supabase/README.md`). The app never handles passwords. In the current demo,
  identity is simulated by the "View as" switcher; nothing about the security
  design depends on that being the long-term auth.
- **The client is never trusted for authorization.** The Zustand store enforces
  permissions for good UX and as defense in depth, but the real boundary is
  Postgres row-level security (`supabase/policies.sql`). Both were written from
  one spec (`src/lib/visibility.ts`), so they cannot drift into disagreement
  silently.

## Authorization model

Two predicates cover the whole app and are enforced on **both** sides:

- `canSeeEvent` / `can_see_event` - discovery. `everyone` is public; `people`
  events are visible only to named invitees (and the host); `club` events only to
  confirmed members, badge holders, or admins of that club.
- `canManageEvent` / `can_manage_event` - the individual host, or an admin of the
  hosting club. Gates editing, the door check-in roster, and guestlist approvals.

Membership approvals, admin transfer, and event posting-as-a-club are all guarded
by "is an admin of this club" on both sides. The store returns `{ ok, reason }`
so a refusal is a normal, surfaced outcome rather than a thrown error.

Tested: `src/store.test.ts` asserts that a non-manager cannot edit an event, run
the door, approve applicants, approve members, or post as a club they don't run,
and that the blocked edit leaves data unchanged.

## Input handling

- **XSS:** all user text is rendered through React, which escapes by default.
  There is no `dangerouslySetInnerHTML` and no raw HTML sink anywhere in the app.
- **Sanitization + limits:** `src/lib/validation.ts` strips control and
  zero-width characters, normalizes whitespace, and bounds every field (title
  3–80, description ≤1000, capacity 1–100k, end-after-start, ≤24h, not in the
  past). The store re-sanitizes on `createEvent`/`updateEvent` so a crafted API
  payload gets the same treatment as the form. The same limits exist as Postgres
  `check` constraints, so a bad row can't be written even by bypassing the app.
- **`.ics` export** escapes per RFC 5545 (`src/lib/ics.ts`) to avoid calendar
  field injection; verified by tests.

## Concurrency / integrity

- Capacity and waitlist promotion are **atomic** in the backend
  (`rsvp_to_event` / `cancel_rsvp` use `SELECT … FOR UPDATE`), so two people can't
  race into the last seat and the promoted person is deterministic (FIFO).
- Notifications for other users can only be created by `SECURITY DEFINER`
  functions/triggers; clients have no INSERT policy on `notifications`, so nobody
  can forge a notification to someone else.

## Known limitations (current demo build)

- State lives in `localStorage`; it is per-device and unauthenticated. This is a
  deliberate stepping stone, not the end state - see the migration path in
  `supabase/README.md`.
- No rate limiting or audit log yet (both belong at the API/edge layer).
- Reservation "locking" is advisory within the app; a real deployment would back
  it with the unique/exclusion constraints hinted at in the schema.
