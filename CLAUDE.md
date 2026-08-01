# hoagiefunctions - project context for all sessions

**hoagiefunctions** is a member of the Hoagie app family (alongside hoagiemail,
hoagieplan, hoagieclub, hoagiestuff). It is a mobile-first React web app / PWA for
campus events, calendars, maps, and clubs. This file captures the conventions every
change must follow so the app stays consistent.

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme`, configured in `src/index.css` - there is
  no `tailwind.config.js`)
- **React Router v7** (`react-router-dom`, `<BrowserRouter>` + `<Routes>`)
- **Zustand** for global state (`src/store.ts`, built on `src/data/seed.ts`)
- **vite-plugin-pwa** for the installable manifest + service worker

```bash
npm run dev       # http://localhost:5173
npm run build     # tsc -b && vite build
npm run preview   # serve the production build (needed to test the PWA/SW)
npm run lint      # oxlint
```

## Design system - match this exactly

This is the real **Hoagie** design language. Do not invent new colors, radii, or
shadows; use the tokens below (defined in the `@theme` block of `src/index.css`).

### Fonts (loaded via Google Fonts `<link>` in `index.html`)

| Family | Weights | Role | Tailwind |
|---|---|---|---|
| **Inter** | 300–700 | UI + body | `font-sans` (default) |
| **Nunito** | 400, 700 | brand wordmark + large headings | `font-brand` |
| **JetBrains Mono** | 400, 500 | code / mono data | `font-mono` |

- **Body text is 14px.** Base heading elements (`h1`–`h6`) are **16px**. These base
  sizes are set in the `@layer base` block - don't override them globally.
- "Large headings" (page titles, hero text) use **`font-brand`** (Nunito) at a
  larger explicit size, e.g. `font-brand font-bold text-[22px] text-pink-900`.

### Color tokens

**The brand is pink** (hoagiefunctions' unique Hoagie color). The scale is named
`pink-*` (primary brand color is **`pink-500` `#DB2777`**, hover **`pink-600`
`#BE185D`**):

| Shade | Hex | | Shade | Hex |
|---|---|---|---|---|
| `pink-900` | `#4C0A29` | | `pink-300` | `#F17BAC` |
| `pink-800` | `#7E1544` | | `pink-200` | `#F7ABCB` |
| `pink-700` | `#9D174D` | | `pink-100` | `#FBD5E6` |
| `pink-600` | `#BE185D` | | `pink-50`  | `#FDEBF3` |
| `pink-500` | `#DB2777` | | `pink-25`  | `#FEF4F8` |
| `pink-400` | `#E84D91` | | | |

Neutrals & semantic:

| Token | Hex | Usage |
|---|---|---|
| `canvas` | `#FBE7F0` | **light-pink page background** (body + AppShell) |
| `text` | `#343434` | primary text (default body color) |
| `muted` | `#808080` | secondary / muted text |
| `border` | `#EEEEEE` | default borders, dividers |
| `border-muted` | `#F1F1F1` | subtle borders |
| `surface` | `#F7F7F7` | subtle background fills |
| `success` / `success-bg` | `#52BD95` / `#F5FBF8` | positive |
| `danger` / `danger-bg` | `#D14343` / `#FDF4F4` | errors / destructive |
| `warning` / `warning-bg` | `#FFB020` / `#FFFAF2` | warnings |
| `accent` | `#DE7548` | orange accent (sparing) |

Use them as normal Tailwind color utilities: `text-muted`, `bg-surface`,
`border-border`, `text-pink-500`, `bg-pink-50`, `bg-canvas`, etc.

**Hoagie layout signature:** a `pink-500` bar across the very top (in `AppShell`),
then the white `TopNav`, then the `canvas` (light-pink) page background. Cards stay
white so they pop on the tint. The `FillName 'purple'` is kept for seed
compatibility but now renders **pink** (see `FILL_STYLES`) - there is no purple in
the app.

### Radius & shadow

- **Radius:** only `rounded-sm` (**4px**) and `rounded-md` (**8px**) exist. Don't use
  `rounded-lg`/`rounded-xl`/`rounded-full` for cards or controls (avatars/pills that
  genuinely need a circle are the only exception).
- **Elevation:** the single elevation is **`shadow-hoagie`**
  (`0 0 1px rgba(100,100,100,.3), 0 2px 4px -2px rgba(100,100,100,.47)`). Use it for
  cards, popovers, and raised surfaces instead of Tailwind's default shadows.

## App shell & layout

- `src/components/AppShell.tsx` is the layout route: a white **`TopNav`** with a
  `border-border` bottom border, the routed page in `<main>`, and a mobile-only
  **`BottomTabBar`**.
- **Wordmark:** `hoagie` in Nunito extrabold + `functions` in a lighter weight - the
  same construction as `hoagiemail` / `hoagieplan`. See `Wordmark.tsx`; keep this
  pattern for any Hoagie sub-brand.
- **Navigation is responsive:** primary links (Home, Calendar, Map, Profile) render
  inline on `md+` in the top nav and collapse into the icon `BottomTabBar` on mobile.
  Create lives in the top nav on `md+` and in the mobile-only `CreateFab` below it -
  so exactly one "+" shows at any width. The app is **mobile-first**.
- Content lives in a centered container (`mx-auto max-w-*` with horizontal padding)
  and must keep bottom padding on mobile so the fixed tab bar never overlaps content.

## UI components

Reusable presentational components live in **`src/components/ui/`**. Build pages
from these rather than re-styling pills/cards inline. They read static labels via
`buildingById` / `tagById` from the seed and live user/club/event data from the store.

| Component | Purpose |
|---|---|
| `Fill` | Base pill for a `FillName` - 4px radius, 12px, semibold. `solid` inverts to a filled variant. Every badge builds on it. |
| `ClassYearBadge` | `classYear` → `'28` in a neutral fill. |
| `ClubBadge` | Club name in its `colorFill`; shows a check when the given user holds the badge. |
| `TagChip` | A tag by `tagId`; pass `onClick`+`active` to use it as a filter chip. |
| `AccessTypePill` | Open (green) / RSVP (pink) / Guestlist (orange), each with an icon. |
| `Avatar`, `AvatarStack` | Initials on the user's `avatarColor`; stack overlaps with a `+N` overflow. |
| `EventCard` | The workhorse feed card. Takes a `CampusEvent`, routes to `/event/:id`. Pass `compact` for the mini card used in calendar day panels and map popups. |
| `Button` | `primary` (pink) / `secondary`, `sm`/`md`. |
| `SectionHeader`, `EmptyState` | Section titles (Nunito) and empty placeholders. |
| `CreateFab` | Floating `+` action to `/create`; circular by design (icon action). |
| `MiniMap` | Small Leaflet map centered on one building with a pink pin + name. |
| `Toaster` | Renders the app-wide toast queue; mounted once in `AppShell`. |

Conventions:

- **The fill palette** (`{text, bg}` per `FillName`) is `FILL_STYLES` in
  `src/lib/fills.ts` - the one place fill colors are defined. `Fill` applies them via
  inline style. Don't hardcode these hexes elsewhere.
- **Shared, non-component logic goes in `src/lib/`** (`fills.ts`, `membership.ts`,
  `datetime.ts`) so component files export only components - keeps React Fast Refresh
  and the `only-export-components` lint rule happy.
- **Date/time formatting** is `formatEventDateTime` (handles events crossing
  midnight) and `eventBucket` (today / week / upcoming) in `src/lib/datetime.ts`.
- Icons are added to `src/components/icons.tsx` in the shared stroke style.

### Event audience / visibility

An event's **`audience`** (`src/data/seed.ts`) is *who can see it*, separate from
`accessType` (*how you join*). Absent = everyone; `{kind:'club',clubId}` =
members-only; `{kind:'people',userIds}` = invite-only. `src/lib/visibility.ts` owns
`canSeeEvent(event, user)` (hosts/admins always see their own) and `audienceLabel`.
The store exposes **`visibleEvents()`**, and `recommendedEvents`/`eventsForUser` are
filtered through it - so **all discovery surfaces (Home, Calendar, Map) must read
`visibleEvents()`, never raw `events`**. The event detail page also gates on
`canSeeEvent` so direct links respect the audience. Restricted events show a lock
label via `audienceLabel`.

### Toasts

App-wide toasts are a tiny Zustand store in `src/lib/toast.ts`. Call
`useToasts.getState().push(message, variant)` (or the `push` selector) after a store
action - `'success' | 'neutral' | 'danger'`. They auto-dismiss; `<Toaster/>` is
already mounted in `AppShell`, so pages just push.

### Maps (Leaflet)

Maps use **react-leaflet** with OpenStreetMap tiles. Two rules that keep it working:

- Always `import 'leaflet/dist/leaflet.css'` in any file that renders a map.
- **Never use Leaflet's default PNG marker** (it breaks under the bundler). Build
  pins with `buildPinIcon(reserved, count)` from `src/lib/mapIcons.ts` - a purple
  `L.divIcon` teardrop, orange ring when reserved, count badge when a pin covers
  several events. The `.hf-pin` CSS (in `index.css`) strips Leaflet's default box.
- The full-bleed `/map` page fills `h-[calc(100dvh-3.5rem)]` and cancels the shell's
  bottom padding with `-mb-24 md:-mb-10`.

## Pages

| Route | What it does |
|---|---|
| `/` Home | "For You" feed. One filter row: a **Type** dropdown (collapses the tag chips, multi-select) + a scrollable **date strip** of real days (`All dates`, `Today`, `Sun 3`, …). Default view shows a `recommendedEvents()` strip then the rest grouped by day (`Today` / `Tomorrow` / `Wed, Aug 6`); picking a date shows just that day. Keep filters to this one row - avoid stacking extra chip rows. |
| `/calendar` | Month grid; day click opens a panel (bottom sheet on mobile, modal on desktop) of that day's events as `compact` cards. |
| `/map` | Full-bleed Leaflet map, one pin per building with upcoming events, "Show reserved spaces" toggle, tag filter. |
| `/event/:id` | Event detail: map, attendees, participation actions (rsvp / applyToEvent). The guestlist **auto-accept** success banner is the key demo beat - keep it prominent. Admins of the host club get a "Manage guestlist" section. |
| `/club/:id` | Club header, membership button, admin roster + succession (`transferAdmin`), pending-request approvals (`approveMember`/`denyMember`), and the club's events. |
| `/create` | Grouped event form → `createEvent`. "Post as" is limited to the user or clubs in `adminOf`; `?host=<clubId>` preselects. Building autocomplete (custom places call `addBuilding`). Reservation toggle runs the conflict check and shows an inline warning on clash. |
| `/profile` | Effective current user: identity + club badges, then "Going" / "On the guestlist" / "Pending" sections built from `rsvps`, `applications`, and pending `clubMemberships`. |

### Demo mode & polish

- **`DemoControls`** (mounted in `AppShell`, bottom-left) is a dev-only floating
  panel: a "View as" switch (`setViewAs`) and "Reset demo" (`resetDemo`). It
  collapses to a small "Demo" pill so it stays out of frame. It's the one piece of
  non-product UI - keep it clearly a dev tool.
- Routes fade in via `.hf-page` (opacity only - never transform, so Leaflet layout
  is undisturbed) and scroll to top on navigation, both handled in `AppShell`.
- First app paint shows `SkeletonEventCard`s on Home (guarded by a module-level
  `firstPaint` flag so it only happens once per session).
- Respect `prefers-reduced-motion` - the entrance animations are disabled there.

Participation/admin state on these pages is **derived from the store** (e.g.
`event.attendeeIds.includes(me.id)`, `club.pendingIds`), not local component state,
so it stays correct as actions mutate the store and across `viewAs` switches.

## Routing

Routes live in `src/App.tsx` under the `AppShell` layout route:

| Path | Page |
|---|---|
| `/` | Home |
| `/calendar` | Calendar |
| `/map` | Map |
| `/event/:id` | EventDetail |
| `/profile` | Profile |
| `/club/:id` | ClubDetail |
| `/create` | Create |

Add new pages under `src/pages/` and register them in `App.tsx`. Use the shared
`PageContainer`/`PageHeader` helpers so every page has consistent spacing and title
styling.

## State

Global state is a single Zustand store in **`src/store.ts`**, built on the demo
data in **`src/data/seed.ts`**. Rules:

- **`seed.ts` is the only place types and seed data are defined.** The store
  imports `users`, `clubs`, `events`, `buildings`, `tags`, `CURRENT_USER_ID`, the
  `*ById` lookups, and every interface (`User`, `Club`, `CampusEvent`, …) from it -
  never redefine a type or re-create seed data elsewhere.
- The store **deep-clones** `users`/`clubs`/`events` from the seed on init (and on
  `resetDemo()`), so the imported seed arrays stay pristine. `buildings`/`tags` are
  static and used directly.
- **`viewAs`** (`'me' | 'clubAdmin' | 'newStudent'`) selects the *effective* current
  user so we can demo perspectives without auth. Resolve the user with the
  `currentUser()` selector - don't read `users[0]` or hardcode `u-arsh`.
- The **badge rule** is load-bearing: a confirmed member of a club/eating-club is
  auto-accepted to that host's guestlist events (`applyToEvent`), and approving a
  member grants that badge. Keep `applyToEvent`, `approveMember`, and the eating-club
  check in sync if you touch membership logic.
- Reservation-confirmed events are conflict-checked by building + overlapping time
  in `createEvent`; keep that guard when adding event-creation UI.
- Prefer local `useState` for view-only UI; reach for the store only for data shared
  across routes. Actions are immutable-friendly (new arrays/objects via `set`).

## Conventions

- Components are function components in `.tsx`; one component per file, named to match.
- Prefer Tailwind utilities over custom CSS. Only add to `@layer` in `index.css` for
  genuinely reusable base/element styles.
- Icons are small inline stroke SVGs in `src/components/icons.tsx` (no icon-font or
  heavy icon library). Keep them 1.5px stroke, `currentColor`.
- No lorem ipsum, no decorative gradients, no emoji in UI copy. Clean and minimal.
