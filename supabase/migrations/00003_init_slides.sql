-- Slide decks, slide images, slide reviews
-- RLS is enabled on all tables in this migration.

create table public.slide_decks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  pair_id uuid not null references public.presentation_pairs(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'pending_introducee', 'pending_organizer', 'approved', 'rejected')),
  ai_generation_log jsonb,
  pptx_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slide_decks_unique unique (event_id, pair_id)
);

create index on public.slide_decks (event_id);
create index on public.slide_decks (pair_id);

create trigger slide_decks_updated_at
  before update on public.slide_decks
  for each row execute procedure public.set_updated_at();

alter table public.slide_decks enable row level security;

-- -------------------------------------------------------

create table public.slide_images (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.slide_decks(id) on delete cascade,
  slide_index int not null check (slide_index between 0 and 4),
  storage_path text not null,
  created_at timestamptz not null default now(),
  constraint slide_images_unique unique (deck_id, slide_index)
);

create index on public.slide_images (deck_id);

alter table public.slide_images enable row level security;

-- -------------------------------------------------------

create table public.slide_reviews (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.slide_decks(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  review_type text not null check (review_type in ('introducee_approval', 'organizer_approval')),
  approved boolean,
  rejection_reason text,
  reviewed_at timestamptz not null default now(),
  constraint slide_reviews_unique unique (deck_id, reviewer_id, review_type)
);

create index on public.slide_reviews (deck_id);

alter table public.slide_reviews enable row level security;
