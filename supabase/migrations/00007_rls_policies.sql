-- RLS policies for all tables (§7.2 準拠)
-- service role bypasses all RLS automatically (used by matching computation only).

-- ============================================================
-- users
-- ============================================================

-- Anyone authenticated can read basic user info (needed for event UX)
create policy "users_self_select"
  on public.users for select to authenticated
  using (auth.uid() = id);

-- Self update only
create policy "users_self_update"
  on public.users for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert is handled by auth trigger (no direct insert policy needed for anon)

-- Admin can read all users
create policy "users_admin_select"
  on public.users for select to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- ============================================================
-- profile_photos
-- ============================================================

-- Self only: read/write own photo
create policy "profile_photos_self_select"
  on public.profile_photos for select to authenticated
  using (auth.uid() = user_id);

create policy "profile_photos_self_insert"
  on public.profile_photos for insert to authenticated
  with check (auth.uid() = user_id);

create policy "profile_photos_self_update"
  on public.profile_photos for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "profile_photos_self_delete"
  on public.profile_photos for delete to authenticated
  using (auth.uid() = user_id);

-- Match participants can read each other's photo (after consent check happens in app layer)
create policy "profile_photos_match_participant_select"
  on public.profile_photos for select to authenticated
  using (
    exists (
      select 1 from public.photo_reveal_consents prc
      join public.matches m on m.id = prc.match_id
      where prc.user_id = profile_photos.user_id
        and prc.state = 'consented'
        and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
        and exists (
          select 1 from public.photo_reveal_consents prc2
          where prc2.match_id = m.id and prc2.user_id = auth.uid() and prc2.state = 'consented'
        )
    )
  );

-- ============================================================
-- friendships
-- ============================================================

create policy "friendships_participant_select"
  on public.friendships for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "friendships_requester_insert"
  on public.friendships for insert to authenticated
  with check (auth.uid() = requester_id);

create policy "friendships_addressee_update"
  on public.friendships for update to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

-- ============================================================
-- blocks
-- ============================================================

create policy "blocks_blocker_select"
  on public.blocks for select to authenticated
  using (auth.uid() = blocker_id);

create policy "blocks_blocker_insert"
  on public.blocks for insert to authenticated
  with check (auth.uid() = blocker_id);

create policy "blocks_blocker_delete"
  on public.blocks for delete to authenticated
  using (auth.uid() = blocker_id);

-- ============================================================
-- events
-- ============================================================

-- All authenticated users can read events (public event listing)
create policy "events_authenticated_select"
  on public.events for select to authenticated
  using (true);

-- Only organizer or admin can update
create policy "events_organizer_update"
  on public.events for update to authenticated
  using (
    auth.uid() = organizer_id or
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- Only admin can create events
create policy "events_admin_insert"
  on public.events for insert to authenticated
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- ============================================================
-- entries
-- ============================================================

-- Event participants can see other entries in the same event
create policy "entries_event_participants_select"
  on public.entries for select to authenticated
  using (
    exists (
      select 1 from public.entries e
      where e.event_id = entries.event_id and e.user_id = auth.uid()
    )
  );

-- Self insert (join an event)
create policy "entries_self_insert"
  on public.entries for insert to authenticated
  with check (auth.uid() = user_id);

-- Self update (e.g., ng_requested)
create policy "entries_self_update"
  on public.entries for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Admin can manage entries
create policy "entries_admin_all"
  on public.entries for all to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- ============================================================
-- presentation_pairs
-- ============================================================

-- Event participants can view pairs
create policy "presentation_pairs_participants_select"
  on public.presentation_pairs for select to authenticated
  using (
    exists (
      select 1 from public.entries e
      where e.event_id = presentation_pairs.event_id and e.user_id = auth.uid()
    )
  );

-- Admin only for insert/update
create policy "presentation_pairs_admin_all"
  on public.presentation_pairs for all to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- ============================================================
-- slide_decks
-- ============================================================

-- Presenter or introducee in the pair can read their deck
create policy "slide_decks_pair_members_select"
  on public.slide_decks for select to authenticated
  using (
    exists (
      select 1 from public.presentation_pairs pp
      where pp.id = slide_decks.pair_id
        and (pp.presenter_id = auth.uid() or pp.introducee_id = auth.uid())
    )
    or exists (
      select 1 from public.users u where u.id = auth.uid() and u.is_admin = true
    )
  );

-- Event participants can view approved decks (for the presentation phase)
create policy "slide_decks_participants_select_approved"
  on public.slide_decks for select to authenticated
  using (
    slide_decks.status = 'approved' and
    exists (
      select 1 from public.entries e
      where e.event_id = slide_decks.event_id and e.user_id = auth.uid()
    )
  );

-- Presenter can insert/update their deck
create policy "slide_decks_presenter_insert"
  on public.slide_decks for insert to authenticated
  with check (
    exists (
      select 1 from public.presentation_pairs pp
      where pp.id = pair_id and pp.presenter_id = auth.uid()
    )
  );

create policy "slide_decks_presenter_update"
  on public.slide_decks for update to authenticated
  using (
    exists (
      select 1 from public.presentation_pairs pp
      where pp.id = slide_decks.pair_id and pp.presenter_id = auth.uid()
    )
  );

-- ============================================================
-- slide_images
-- ============================================================

-- Pair members can always see; event participants can see approved decks only
create policy "slide_images_deck_access_select"
  on public.slide_images for select to authenticated
  using (
    exists (
      select 1 from public.slide_decks sd
      join public.presentation_pairs pp on pp.id = sd.pair_id
      where sd.id = slide_images.deck_id
        and (pp.presenter_id = auth.uid() or pp.introducee_id = auth.uid())
    )
    or exists (
      select 1 from public.slide_decks sd
      join public.entries e on e.event_id = sd.event_id
      where sd.id = slide_images.deck_id
        and sd.status = 'approved'
        and e.user_id = auth.uid()
    )
  );

create policy "slide_images_presenter_insert"
  on public.slide_images for insert to authenticated
  with check (
    exists (
      select 1 from public.slide_decks sd
      join public.presentation_pairs pp on pp.id = sd.pair_id
      where sd.id = deck_id and pp.presenter_id = auth.uid()
    )
  );

-- ============================================================
-- slide_reviews
-- ============================================================

-- Reviewer or admin can see reviews
create policy "slide_reviews_reviewer_select"
  on public.slide_reviews for select to authenticated
  using (
    auth.uid() = reviewer_id or
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

create policy "slide_reviews_reviewer_insert"
  on public.slide_reviews for insert to authenticated
  with check (auth.uid() = reviewer_id);

-- ============================================================
-- votes
-- ============================================================

-- Voters can only see their own votes (secret ballot)
create policy "votes_self_select"
  on public.votes for select to authenticated
  using (auth.uid() = voter_user_id);

create policy "votes_self_insert"
  on public.votes for insert to authenticated
  with check (
    auth.uid() = voter_user_id and
    -- Must be an event participant
    exists (
      select 1 from public.entries e
      where e.event_id = votes.event_id and e.user_id = auth.uid()
    )
  );

-- No UPDATE on votes — immutable once cast

-- ============================================================
-- recommendations
-- ============================================================

-- Presenters see their own recommendations; admins see all
create policy "recommendations_presenter_select"
  on public.recommendations for select to authenticated
  using (
    auth.uid() = presenter_id or
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

create policy "recommendations_presenter_insert"
  on public.recommendations for insert to authenticated
  with check (auth.uid() = presenter_id);

-- ============================================================
-- event_tables
-- ============================================================

-- Event participants can see table assignments
create policy "event_tables_participants_select"
  on public.event_tables for select to authenticated
  using (
    exists (
      select 1 from public.entries e
      where e.event_id = event_tables.event_id and e.user_id = auth.uid()
    )
  );

-- Service role only for insert (matching computation)

-- ============================================================
-- table_members
-- ============================================================

-- Event participants can see table members
create policy "table_members_participants_select"
  on public.table_members for select to authenticated
  using (
    exists (
      select 1 from public.event_tables et
      join public.entries e on e.event_id = et.event_id
      where et.id = table_members.table_id and e.user_id = auth.uid()
    )
  );

-- Service role only for insert (matching computation)

-- ============================================================
-- stamps
-- ============================================================

-- Event participants can send and view stamps (anonymous)
create policy "stamps_participants_select"
  on public.stamps for select to authenticated
  using (
    exists (
      select 1 from public.entries e
      where e.event_id = stamps.event_id and e.user_id = auth.uid()
    )
  );

create policy "stamps_participants_insert"
  on public.stamps for insert to authenticated
  with check (
    exists (
      select 1 from public.entries e
      where e.event_id = stamps.event_id and e.user_id = auth.uid()
    )
  );

-- ============================================================
-- awards
-- ============================================================

-- Event participants can see awards
create policy "awards_participants_select"
  on public.awards for select to authenticated
  using (
    exists (
      select 1 from public.entries e
      where e.event_id = awards.event_id and e.user_id = auth.uid()
    )
  );

-- Admin only for insert
create policy "awards_admin_insert"
  on public.awards for insert to authenticated
  with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- ============================================================
-- matches
-- ============================================================

-- Match participants only
create policy "matches_participants_select"
  on public.matches for select to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

create policy "matches_participants_update"
  on public.matches for update to authenticated
  using (auth.uid() = user_a_id or auth.uid() = user_b_id);

-- Service role only for insert (matching computation)

-- ============================================================
-- match_messages
-- ============================================================

-- Match participants can read and send messages
create policy "match_messages_participants_select"
  on public.match_messages for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_messages.match_id
        and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
    )
  );

create policy "match_messages_participants_insert"
  on public.match_messages for insert to authenticated
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
        and m.status = 'active'
    )
  );

-- ============================================================
-- photo_reveal_consents
-- ============================================================

-- Match participants can see consent status
create policy "photo_reveal_consents_participants_select"
  on public.photo_reveal_consents for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = photo_reveal_consents.match_id
        and (m.user_a_id = auth.uid() or m.user_b_id = auth.uid())
    )
  );

-- Self insert/update own consent
create policy "photo_reveal_consents_self_insert"
  on public.photo_reveal_consents for insert to authenticated
  with check (auth.uid() = user_id);

create policy "photo_reveal_consents_self_update"
  on public.photo_reveal_consents for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- reports
-- ============================================================

-- Reporters can see their own reports; admins see all
create policy "reports_reporter_select"
  on public.reports for select to authenticated
  using (
    auth.uid() = reporter_id or
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

create policy "reports_reporter_insert"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);
