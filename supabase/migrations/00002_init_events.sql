-- Events, entries, presentation pairs
-- RLS is enabled on all tables in this migration.

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  mode text not null check (mode in ('online', 'offline')),
  phase text not null default 'pre_event'
    check (phase in ('pre_event', 'entry', 'presentation', 'voting', 'intermission', 'mingling', 'closing')),
  venue text,
  scheduled_at timestamptz,
  organizer_id uuid not null references public.users(id) on delete restrict,
  max_participants int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.events (organizer_id);
create index on public.events (phase);

create trigger events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

alter table public.events enable row level security;

-- -------------------------------------------------------

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  entry_type text not null check (entry_type in ('presenter_pair', 'audience')),
  pair_id uuid, -- set when entry_type = 'presenter_pair'; both presenter and introducee share same pair_id
  is_presenter boolean not null default false, -- true = presenter (紹介者), false = introducee (被紹介者)
  ng_requested boolean not null default false,
  created_at timestamptz not null default now(),
  constraint entries_unique unique (event_id, user_id)
);

create index on public.entries (event_id);
create index on public.entries (user_id);
create index on public.entries (pair_id);

alter table public.entries enable row level security;

-- -------------------------------------------------------

create table public.presentation_pairs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  presenter_id uuid not null references public.users(id) on delete cascade,
  introducee_id uuid not null references public.users(id) on delete cascade,
  presentation_order int,
  created_at timestamptz not null default now(),
  constraint presentation_pairs_unique unique (event_id, presenter_id),
  constraint presentation_pairs_no_self check (presenter_id != introducee_id)
);

create index on public.presentation_pairs (event_id);

alter table public.presentation_pairs enable row level security;
