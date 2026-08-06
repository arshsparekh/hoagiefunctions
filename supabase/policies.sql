-- hoagiefunctions - Row-Level Security + secure RPCs (Supabase)
-- =============================================================================
-- These policies are the real enforcement point. The client store already
-- refuses unauthorized actions (defense in depth), but a hostile client that
-- talks straight to the API is stopped HERE. Every predicate mirrors
-- src/lib/visibility.ts (canSeeEvent / canManageEvent) and the store guards.
--
-- Run AFTER schema.sql.
-- =============================================================================

-- --- Permission helper functions (evaluated as the calling user) -------------
-- STABLE + security invoker: they read auth.uid() and the caller's rows.

create or replace function is_club_admin(p_club uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from club_admins a where a.club_id = p_club and a.user_id = auth.uid()
  );
$$;

create or replace function is_club_member(p_club uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from club_members m
    where m.club_id = p_club and m.user_id = auth.uid() and m.status = 'member'
  );
$$;

-- Holds the club's badge: a confirmed member, or the eating-club match.
create or replace function holds_badge(p_club uuid)
returns boolean language sql stable as $$
  select is_club_member(p_club)
      or exists (select 1 from profiles p where p.id = auth.uid() and p.eating_club_id = p_club);
$$;

-- Can the current user MANAGE (edit / run door / approve) this event?
create or replace function can_manage_event(p_event uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from events e
    where e.id = p_event
      and (e.host_user_id = auth.uid() or is_club_admin(e.host_club_id))
  );
$$;

-- Can the current user DISCOVER this event? (mirrors canSeeEvent)
create or replace function can_see_event(p_event uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from events e
    where e.id = p_event and (
      e.audience = 'everyone'
      or e.host_user_id = auth.uid()
      or is_club_admin(e.host_club_id)
      or (e.audience = 'people'
          and exists (select 1 from event_invitees i
                      where i.event_id = e.id and i.user_id = auth.uid()))
      or (e.audience = 'club'
          and (holds_badge(e.audience_club_id) or is_club_admin(e.audience_club_id)))
    )
  );
$$;

-- --- Enable RLS on every table ----------------------------------------------
alter table clubs           enable row level security;
alter table profiles        enable row level security;
alter table club_admins     enable row level security;
alter table club_members    enable row level security;
alter table buildings       enable row level security;
alter table events          enable row level security;
alter table event_tags      enable row level security;
alter table event_invitees  enable row level security;
alter table rsvps           enable row level security;
alter table waitlist        enable row level security;
alter table applications    enable row level security;
alter table checkins        enable row level security;
alter table follows         enable row level security;
alter table saves           enable row level security;
alter table notifications   enable row level security;
alter table comments        enable row level security;

-- --- Public-ish reference data: any signed-in user may read ------------------
create policy clubs_read     on clubs        for select to authenticated using (true);
create policy profiles_read  on profiles     for select to authenticated using (true);
create policy buildings_read on buildings    for select to authenticated using (true);
create policy admins_read    on club_admins  for select to authenticated using (true);
create policy members_read   on club_members for select to authenticated using (true);

-- A user may edit only their own profile; buildings can be added by anyone signed in.
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy buildings_insert on buildings for insert to authenticated
  with check (created_by = auth.uid());

-- --- Club membership: request to join yourself; admins approve --------------
create policy members_join on club_members for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
-- Approving/denying (status change or delete) is an admin action on that club.
create policy members_admin_update on club_members for update to authenticated
  using (is_club_admin(club_id)) with check (is_club_admin(club_id));
create policy members_admin_delete on club_members for delete to authenticated
  using (is_club_admin(club_id) or user_id = auth.uid());

-- --- Events ------------------------------------------------------------------
-- Discovery is gated by the same visibility rule as the client.
create policy events_select on events for select to authenticated using (
  audience = 'everyone'
  or host_user_id = auth.uid()
  or is_club_admin(host_club_id)
  or (audience = 'people'
      and exists (select 1 from event_invitees i where i.event_id = id and i.user_id = auth.uid()))
  or (audience = 'club' and (holds_badge(audience_club_id) or is_club_admin(audience_club_id)))
);

-- Posting: as yourself, or as a club you administer. created_by must be you.
create policy events_insert on events for insert to authenticated with check (
  created_by = auth.uid()
  and (
    (host_type = 'individual' and host_user_id = auth.uid())
    or (host_type in ('club','eatingClub') and is_club_admin(host_club_id))
  )
);
create policy events_update on events for update to authenticated
  using (can_manage_event(id)) with check (can_manage_event(id));
create policy events_delete on events for delete to authenticated
  using (can_manage_event(id));

-- Tags + invitees are writable by the event's manager, readable if you can see it.
create policy tags_read   on event_tags for select to authenticated using (can_see_event(event_id));
create policy tags_write  on event_tags for all to authenticated
  using (can_manage_event(event_id)) with check (can_manage_event(event_id));
create policy invitees_read  on event_invitees for select to authenticated
  using (can_manage_event(event_id) or user_id = auth.uid());
create policy invitees_write on event_invitees for all to authenticated
  using (can_manage_event(event_id)) with check (can_manage_event(event_id));

-- --- RSVPs / waitlist / applications / check-ins -----------------------------
-- You can see the roster of any event you can see; managers see everything.
create policy rsvps_read on rsvps for select to authenticated
  using (user_id = auth.uid() or can_see_event(event_id));
-- Direct RSVP insert is allowed for yourself on a visible event, BUT capacity +
-- waitlist are enforced by the rsvp_to_event() RPC below - prefer that path.
create policy rsvps_insert on rsvps for insert to authenticated
  with check (user_id = auth.uid() and can_see_event(event_id));
create policy rsvps_delete on rsvps for delete to authenticated
  using (user_id = auth.uid());

create policy waitlist_read on waitlist for select to authenticated
  using (user_id = auth.uid() or can_manage_event(event_id));
create policy waitlist_self on waitlist for delete to authenticated
  using (user_id = auth.uid());

create policy apps_read on applications for select to authenticated
  using (user_id = auth.uid() or can_manage_event(event_id));
create policy apps_insert on applications for insert to authenticated
  with check (user_id = auth.uid() and can_see_event(event_id));
-- Only the event's manager may approve/deny (update/delete) others' applications.
create policy apps_manage_update on applications for update to authenticated
  using (can_manage_event(event_id)) with check (can_manage_event(event_id));
create policy apps_manage_delete on applications for delete to authenticated
  using (can_manage_event(event_id) or user_id = auth.uid());

-- Door check-ins are a manager-only tool.
create policy checkins_read  on checkins for select to authenticated
  using (can_manage_event(event_id) or user_id = auth.uid());
create policy checkins_write on checkins for all to authenticated
  using (can_manage_event(event_id)) with check (can_manage_event(event_id));

-- --- Follows + saves are strictly personal ----------------------------------
create policy follows_all on follows for all to authenticated
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());
create policy saves_all on saves for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- Comments: readable if you can see the event; author posts; author or the
--     event's manager may delete (moderation). ---------------------------------
create policy comments_read on comments for select to authenticated
  using (can_see_event(event_id));
create policy comments_insert on comments for insert to authenticated
  with check (user_id = auth.uid() and can_see_event(event_id));
create policy comments_delete on comments for delete to authenticated
  using (user_id = auth.uid() or can_manage_event(event_id));

-- --- Notifications: read/patch your own; creation is server-side only --------
create policy notifs_read on notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifs_mark_read on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No INSERT policy: only SECURITY DEFINER functions/triggers below create them.

-- =============================================================================
-- Secure RPCs - capacity, waitlist promotion, and notification fan-out live in
-- SECURITY DEFINER functions so they run atomically and can write notifications
-- for OTHER users (which RLS forbids from the client).
-- =============================================================================

-- RSVP with capacity + waitlist. Returns 'going' or 'waitlisted'.
create or replace function rsvp_to_event(p_event uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_cap int;
  v_count int;
begin
  if not can_see_event(p_event) then
    raise exception 'not allowed to see this event';
  end if;

  -- Serialize concurrent RSVPs to this event.
  select capacity into v_cap from events where id = p_event for update;

  if exists (select 1 from rsvps where event_id = p_event and user_id = auth.uid()) then
    return 'going';
  end if;

  select count(*) into v_count from rsvps where event_id = p_event;
  if v_cap is not null and v_count >= v_cap then
    insert into waitlist (event_id, user_id) values (p_event, auth.uid())
      on conflict do nothing;
    return 'waitlisted';
  end if;

  insert into rsvps (event_id, user_id) values (p_event, auth.uid());
  return 'going';
end;
$$;

-- Cancel an RSVP and promote the earliest waitlister into the freed seat.
create or replace function cancel_rsvp(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_was_attending boolean;
  v_cap int;
  v_count int;
  v_next uuid;
  v_title text;
begin
  select exists (select 1 from rsvps where event_id = p_event and user_id = auth.uid())
    into v_was_attending;

  delete from rsvps    where event_id = p_event and user_id = auth.uid();
  delete from waitlist where event_id = p_event and user_id = auth.uid();
  delete from checkins where event_id = p_event and user_id = auth.uid();

  if not v_was_attending then return; end if;

  select capacity, title into v_cap, v_title from events where id = p_event for update;
  select count(*) into v_count from rsvps where event_id = p_event;

  if v_cap is null or v_count < v_cap then
    select user_id into v_next from waitlist
      where event_id = p_event order by created_at asc limit 1;
    if v_next is not null then
      delete from waitlist where event_id = p_event and user_id = v_next;
      insert into rsvps (event_id, user_id) values (p_event, v_next);
      insert into notifications (user_id, kind, title, body, event_id)
      values (v_next, 'promotedFromWaitlist', 'A spot opened up',
              'You are off the waitlist for ' || v_title || '.', p_event);
    end if;
  end if;
end;
$$;

-- Approve a guestlist applicant (managers only). Adds them + notifies.
create or replace function approve_application(p_event uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  if not can_manage_event(p_event) then
    raise exception 'only the host can approve applicants';
  end if;
  select title into v_title from events where id = p_event;

  update applications set status = 'approved' where event_id = p_event and user_id = p_user;
  insert into rsvps (event_id, user_id) values (p_event, p_user) on conflict do nothing;
  insert into notifications (user_id, kind, title, body, event_id)
  values (p_user, 'applicationApproved', 'You''re on the list',
          'Approved for ' || v_title || '.', p_event);
end;
$$;

-- On a new event, notify followers of the host who are allowed to see it.
create or replace function notify_followers_of_new_event()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_target uuid; v_ttype follow_target;
begin
  if new.host_type = 'individual' then
    v_target := new.host_user_id; v_ttype := 'user';
  else
    v_target := new.host_club_id; v_ttype := 'club';
  end if;

  insert into notifications (user_id, kind, title, body, event_id, club_id)
  select f.follower_id, 'newEventFromFollowed',
         'New event', new.title, new.id,
         case when v_ttype = 'club' then v_target else null end
  from follows f
  where f.target_type = v_ttype and f.target_id = v_target
    and f.follower_id <> new.created_by
    -- Respect audience: only notify followers who could discover it.
    and (
      new.audience = 'everyone'
      or (new.audience = 'club' and exists (
            select 1 from club_members m
            where m.club_id = new.audience_club_id and m.user_id = f.follower_id and m.status = 'member'))
      or (new.audience = 'people' and exists (
            select 1 from event_invitees i where i.event_id = new.id and i.user_id = f.follower_id))
    );
  return new;
end;
$$;

create trigger trg_notify_followers
  after insert on events
  for each row execute function notify_followers_of_new_event();
