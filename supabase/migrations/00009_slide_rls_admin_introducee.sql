-- Add missing RLS policies for slide_decks:
--   1. Admin can update any deck (approve / reject)
--   2. Introducee can update their own deck (confirm / request revision)

-- Admin update: approve or reject a deck
create policy "slide_decks_admin_update"
  on public.slide_decks for update to authenticated
  using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.is_admin = true)
  );

-- Introducee update: confirm (pending_introducee → pending_organizer or draft)
create policy "slide_decks_introducee_update"
  on public.slide_decks for update to authenticated
  using (
    exists (
      select 1 from public.presentation_pairs pp
      where pp.id = slide_decks.pair_id and pp.introducee_id = auth.uid()
    )
  );
