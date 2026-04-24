-- Votes, recommendations, tables, table members
-- RLS is enabled on all tables in this migration.

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  voter_user_id uuid not null references public.users(id) on delete cascade,
  votee_user_id uuid not null references public.users(id) on delete cascade,
  priority int not null check (priority in (1, 2, 3)),
  created_at timestamptz not null default now(),
  constraint votes_no_self check (voter_user_id != votee_user_id),
  constraint votes_unique unique (event_id, voter_user_id, votee_user_id)
);

create index on public.votes (event_id);
create index on public.votes (voter_user_id);
create index on public.votes (votee_user_id);

alter table public.votes enable row level security;

-- -------------------------------------------------------

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  presenter_id uuid not null references public.users(id) on delete cascade,
  recommended_user_id uuid not null references public.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  constraint recommendations_unique unique (event_id, presenter_id, recommended_user_id)
);

create index on public.recommendations (event_id);

alter table public.recommendations enable row level security;

-- -------------------------------------------------------

create table public.event_tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  table_number int not null,
  seat_count int not null check (seat_count between 3 and 4),
  created_at timestamptz not null default now(),
  constraint event_tables_unique unique (event_id, table_number)
);

create index on public.event_tables (event_id);

alter table public.event_tables enable row level security;

-- -------------------------------------------------------

create table public.table_members (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.event_tables(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  seat_index int not null,
  created_at timestamptz not null default now(),
  constraint table_members_unique_user unique (table_id, user_id),
  constraint table_members_unique_seat unique (table_id, seat_index)
);

create index on public.table_members (table_id);
create index on public.table_members (user_id);

alter table public.table_members enable row level security;
