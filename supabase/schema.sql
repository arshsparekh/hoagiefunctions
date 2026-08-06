-- hoagiefunctions - Postgres schema (Supabase)
-- =============================================================================
-- This is the production data model the local-first store (src/store.ts) is
-- designed to graduate to. Every table maps to a type in src/data/seed.ts, and
-- the row-level-security policies in policies.sql enforce the SAME rules the
-- client already checks in src/lib/visibility.ts + the store's action guards -
-- so authorization is enforced at the database, not merely in the UI.
--
-- Identity comes from Supabase Auth (`auth.users`). Princeton netID / Hoagie SSO
-- would sign users in via an OIDC provider; `profiles.id` is that auth user id.
-- Nothing here trusts the client for identity: policies key off auth.uid().
--
-- Apply with: supabase db reset  (or psql -f schema.sql then -f policies.sql)
-- =============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- --- Enums -------------------------------------------------------------------
create type club_kind    as enum ('club', 'eatingClub');
create type member_status as enum ('member', 'pending');
create type host_type     as enum ('individual', 'club', 'eatingClub');
create type access_type    as enum ('open', 'rsvp', 'guestlist');
create type audience_kind  as enum ('everyone', 'club', 'people');
create type applicant_status as enum ('pending', 'approved', 'auto');
create type follow_target   as enum ('club', 'user');
create type notification_kind as enum (
  'autoAccepted', 'applicationApproved', 'applicationDenied', 'newApplication',
  'membershipApproved', 'newEventFromFollowed', 'eventUpdated', 'promotedFromWaitlist',
  'joinedWaitlist'
);

-- --- Clubs -------------------------------------------------------------------
create table clubs (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null check (char_length(name) between 1 and 120),
  kind        club_kind not null,
  color_fill  text not null default 'neutral',
  description text not null default '',
  created_at  timestamptz not null default now()
);

-- --- Profiles (1:1 with auth.users) ------------------------------------------
create table profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 120),
  class_year     int  not null check (class_year between 2000 and 2100),
  avatar_color   text not null default '#808080',
  eating_club_id uuid references clubs (id) on delete set null,
  created_at     timestamptz not null default now()
);

-- Club roles (admins) and membership (members / pending).
create table club_admins (
  club_id uuid not null references clubs (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  primary key (club_id, user_id)
);

create table club_members (
  club_id uuid not null references clubs (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status  member_status not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

-- --- Buildings / locations ---------------------------------------------------
create table buildings (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 120),
  lat        double precision,
  lng        double precision,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- --- Events ------------------------------------------------------------------
create table events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 3 and 80),
  description   text not null default '' check (char_length(description) <= 1000),
  host_type     host_type not null,
  -- Polymorphic host: exactly one of host_user_id / host_club_id is set.
  host_user_id  uuid references profiles (id) on delete cascade,
  host_club_id  uuid references clubs (id) on delete cascade,
  building_id   uuid not null references buildings (id) on delete restrict,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  access_type   access_type not null default 'open',
  audience      audience_kind not null default 'everyone',
  audience_club_id uuid references clubs (id) on delete cascade,
  capacity      int check (capacity is null or capacity between 1 and 100000),
  reservation_confirmed boolean not null default false,
  created_by    uuid not null references profiles (id) on delete cascade,
  created_at    timestamptz not null default now(),

  constraint event_time_valid check (ends_at > starts_at),
  constraint event_host_exactly_one check (
    (host_type = 'individual' and host_user_id is not null and host_club_id is null) or
    (host_type in ('club','eatingClub') and host_club_id is not null and host_user_id is null)
  ),
  constraint event_audience_club check (
    (audience = 'club') = (audience_club_id is not null)
  )
);

-- Tags are a fixed vocabulary (see src/data/seed.ts); store slugs on a join.
create table event_tags (
  event_id uuid not null references events (id) on delete cascade,
  tag      text not null,
  primary key (event_id, tag)
);

-- Invitees for audience = 'people'.
create table event_invitees (
  event_id uuid not null references events (id) on delete cascade,
  user_id  uuid not null references profiles (id) on delete cascade,
  primary key (event_id, user_id)
);

-- Attendance, waitlist, guestlist applications, door check-ins.
create table rsvps (
  event_id   uuid not null references events (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table waitlist (
  event_id   uuid not null references events (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(), -- ordering = FIFO by created_at
  primary key (event_id, user_id)
);

create table applications (
  event_id   uuid not null references events (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  status     applicant_status not null default 'pending',
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table checkins (
  event_id   uuid not null references events (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- --- Social graph + activity -------------------------------------------------
create table follows (
  follower_id uuid not null references profiles (id) on delete cascade,
  target_type follow_target not null,
  target_id   uuid not null, -- clubs.id or profiles.id depending on target_type
  created_at  timestamptz not null default now(),
  primary key (follower_id, target_type, target_id)
);

create table saves (
  user_id    uuid not null references profiles (id) on delete cascade,
  event_id   uuid not null references events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table comments (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade, -- recipient
  kind       notification_kind not null,
  title      text not null,
  body       text not null default '',
  event_id   uuid references events (id) on delete cascade,
  club_id    uuid references clubs (id) on delete cascade,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- --- Indexes for the common query paths --------------------------------------
create index events_starts_at_idx      on events (starts_at);
create index events_host_club_idx      on events (host_club_id);
create index events_audience_club_idx  on events (audience_club_id);
create index rsvps_user_idx            on rsvps (user_id);
create index applications_user_idx     on applications (user_id);
create index club_members_user_idx     on club_members (user_id);
create index club_admins_user_idx      on club_admins (user_id);
create index follows_target_idx        on follows (target_type, target_id);
create index notifications_user_unread_idx on notifications (user_id, read, created_at desc);
create index comments_event_idx        on comments (event_id, created_at);
