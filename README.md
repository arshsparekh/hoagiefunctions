# hoagiefunctions

Every function on campus, in one place. A mobile-first PWA for Princeton events -
eating-club nights, dorm parties, club GBMs, listening parties - built in the
Hoagie style. Browse a personalized feed, see what's happening on a live campus
map, RSVP or request a guestlist spot, and - if you run a club - post events,
approve members, and check people in at the door.

> Demo identity is simulated with a "View as" switcher (Arsh '28 / a club admin /
> a new student). Real deployment signs in with Princeton netID / Hoagie SSO -
> see [`supabase/README.md`](supabase/README.md).

## What it does

- **For-You feed** - events ranked by the clubs and tags you actually engage with.
- **Live map** - Leaflet + OpenStreetMap with custom pins, date/type filters, and
  a "reserved spaces" overlay.
- **RSVP, guestlist, and waitlist** - open events, RSVP events, and guestlist
  events with badge-based auto-accept. Full events put you on a waitlist and
  promote you (with a notification) when a seat frees.
- **Clubs** - membership requests, admin approvals, and admin succession.
- **Create + manage** - post as yourself or a club you run; edit details; run a
  door check-in roster; approve the guestlist.
- **Notifications** - a per-user feed: approvals, waitlist promotions, and new
  events from clubs/people you follow. Unread count in the nav.
- **Search** across events (visibility-aware), clubs, and people.
- **Saved events**, **follow** clubs/people, **share** links, and **add to
  calendar** (`.ics`).

Everything persists across reloads (localStorage), so it feels like a real app,
not a reset-on-refresh demo.

## Why it's more than a prototype

- **Authorization is real and layered.** `src/lib/visibility.ts` is the single
  spec for "who can see / manage what." The store enforces it before every
  mutation (defense in depth, tested), and `supabase/policies.sql` re-implements
  the exact same predicates as Postgres row-level security - the real boundary.
- **Input is validated + sanitized** in one place (`src/lib/validation.ts`),
  mirrored by `check` constraints in the schema.
- **It's tested.** `npm test` runs a Vitest suite over validation, datetime,
  visibility, notifications, `.ics`, and the store's authorization / waitlist /
  notification logic.
- **It's built to graduate to a backend.** `supabase/` holds the full Postgres
  schema, RLS policies, and atomic RPCs (capacity/waitlist, notification
  fan-out). The store is the single seam to swap `localStorage` for Supabase.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/SECURITY.md`](docs/SECURITY.md).

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # type-check + production build
npm run test     # Vitest unit suite
npm run lint     # oxlint
```

## Stack

Vite 8 · React 19 · TypeScript · Tailwind CSS v4 (CSS-first `@theme`) ·
React Router 7 · Zustand 5 · react-leaflet · vite-plugin-pwa · Vitest · oxlint.

## Project layout

```
src/
  data/seed.ts     Types + demo data (single source of domain shapes)
  store.ts         Zustand: persistence, selectors, authorized actions
  lib/             visibility · validation · notifications · ics · datetime
  components/       AppShell, TopNav, ErrorBoundary, ui/ kit
  pages/            Home · Calendar · Map · Event · Club · Create · Profile
                    · Search · Notifications
supabase/          schema.sql · policies.sql · README (the production data layer)
docs/              ARCHITECTURE.md · SECURITY.md
```
