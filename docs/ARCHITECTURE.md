# Architecture

hoagiefunctions is a mobile-first PWA for Princeton campus events - part of the
Hoagie app family. It's a Vite + React 19 + TypeScript single-page app with a
Zustand state layer that behaves like a real product (persistent, authorized,
notifying) and a Postgres/Supabase backend design it's built to graduate onto.

## Stack

- **Vite 8** build, **React 19**, **TypeScript** (strict; `noUnusedLocals`).
- **Tailwind CSS v4** - CSS-first `@theme` in `src/index.css`, no config file.
- **React Router v7** for routing, **Zustand 5** for state.
- **react-leaflet / Leaflet** + OpenStreetMap tiles for the campus map.
- **vite-plugin-pwa** for installability + offline caching.
- **Vitest** for the unit suite. **oxlint** for linting.

## Layers

```
src/
  data/seed.ts        Types + demo data. The single source of domain shapes.
  store.ts            Zustand store: persistence, selectors, authorized actions.
  lib/
    visibility.ts     canSeeEvent / canManageEvent - the authorization spec.
    validation.ts     sanitize + validate user input (mirrors DB constraints).
    notifications.ts  notification type + helpers (href, accent, relative time).
    ics.ts            RFC-5545 calendar export.
    datetime.ts       event time formatting + buckets.
  components/         Nav, shell, ErrorBoundary, and the ui/ kit.
  pages/              One component per route.
supabase/             schema.sql + policies.sql - the production data layer.
docs/                 This file + SECURITY.md.
```

### State (`store.ts`)

- One Zustand store holds `users`, `clubs`, `events`, `comments`, plus per-user
  `followingByUser`, `savedByUser`, and a flat `notifications` list.
- **Persistence:** wrapped in `persist` (localStorage, with an in-memory fallback
  for tests/SSR). `partialize` stores only data; `onRehydrateStorage` re-hydrates
  ad-hoc locations into the shared `buildingById` lookup. `resetDemo()` clears it.
- **Identity:** a `viewAs` switch maps to a concrete user id so perspectives can
  be demoed without a login. All per-user data is keyed by the effective user id,
  so follows/saves/notifications stay coherent when you switch.
- **Selectors** (`visibleEvents`, `recommendedEvents`, `myNotifications`, …)
  derive views; components that need a fresh array subscribe to the whole store
  and derive in render (a new-array selector would thrash `useSyncExternalStore`).
- **Actions** are the only mutation path and each is authorized before it writes;
  they return `ActionResult`/`CreateResult` so the UI can surface refusals.

### Authorization

`lib/visibility.ts` is the spec. The store calls it before every privileged
mutation (edit, door, approve, transfer, post-as-club); `supabase/policies.sql`
re-implements the identical predicates as RLS. See `docs/SECURITY.md`.

### Rendering / routing

- `AppShell` is the layout route: top pink bar, `TopNav` (with search + a
  notification bell that shows an unread count), the routed page wrapped in an
  `ErrorBoundary`, and a mobile `BottomTabBar`.
- Pages: Home (For-You feed), Calendar, Map, Event detail, Club detail, Create,
  Profile, Search, Notifications, plus a branded 404.

## Data flow (example: RSVP to a full event)

1. `EventDetail` calls `store.rsvp(id)`.
2. The store checks visibility + capacity; if full it adds the user to the
   event's `waitlistIds` and returns `{ ok: false, waitlisted: true }`.
3. The UI shows "On the waitlist · #N".
4. When an attendee later cancels, `cancelRsvp` promotes the first waitlister and
   pushes a `promotedFromWaitlist` notification to them; their bell increments.

In production, steps 2 and 4 are the `rsvp_to_event` / `cancel_rsvp` RPCs, run
atomically in Postgres - same behavior, race-safe.

## Testing

`npm test` runs the Vitest suite. Logic tests (Node): validation, datetime,
visibility, notifications, `.ics` generation, and the store's authorization /
waitlist / notification behavior - the store uses an in-memory storage shim so
these need no DOM. Component tests (jsdom, via React Testing Library) cover a few
UI leaves - `SaveButton`, `FollowButton`, `EventCard` - opting into jsdom with a
`// @vitest-environment jsdom` docblock per file.
