-- Matches, match messages, photo reveal consents, reports
-- RLS is enabled on all tables in this migration.

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_a_id uuid not null references public.users(id) on delete cascade,
  user_b_id uuid not null references public.users(id) on delete cascade,
  table_id uuid references public.event_tables(id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'blocked', 'reported')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_no_self check (user_a_id != user_b_id),
  -- canonical ordering: application must insert with user_a_id < user_b_id
  constraint matches_canonical check (user_a_id < user_b_id),
  constraint matches_unique unique (event_id, user_a_id, user_b_id)
);

create index on public.matches (event_id);
create index on public.matches (user_a_id);
create index on public.matches (user_b_id);

create trigger matches_updated_at
  before update on public.matches
  for each row execute procedure public.set_updated_at();

alter table public.matches enable row level security;

-- -------------------------------------------------------

create table public.match_messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  sent_at timestamptz not null default now()
);

create index on public.match_messages (match_id);
create index on public.match_messages (sender_id);

alter table public.match_messages enable row level security;

-- -------------------------------------------------------

create table public.photo_reveal_consents (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  state text not null default 'pending'
    check (state in ('pending', 'consented', 'revoked')),
  updated_at timestamptz not null default now(),
  constraint photo_reveal_consents_unique unique (match_id, user_id)
);

create index on public.photo_reveal_consents (match_id);

create trigger photo_reveal_consents_updated_at
  before update on public.photo_reveal_consents
  for each row execute procedure public.set_updated_at();

alter table public.photo_reveal_consents enable row level security;

-- -------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  reported_user_id uuid not null references public.users(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint reports_no_self check (reporter_id != reported_user_id)
);

create index on public.reports (reporter_id);
create index on public.reports (reported_user_id);

alter table public.reports enable row level security;
