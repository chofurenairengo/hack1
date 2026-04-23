-- Stamps and awards
-- RLS is enabled on all tables in this migration.
-- Note: stamps are anonymous — sender_id is NOT stored per spec §guardrails.

create table public.stamps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  kind text not null check (kind in ('handshake', 'sparkle', 'laugh', 'clap')),
  client_nonce text not null,
  sent_at timestamptz not null default now()
  -- sender_id is intentionally omitted to preserve anonymity
);

create index on public.stamps (event_id);

alter table public.stamps enable row level security;

-- -------------------------------------------------------

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  award_type text not null check (award_type in ('funny', 'exciting', 'friendship')),
  created_at timestamptz not null default now(),
  constraint awards_unique unique (event_id, user_id, award_type)
);

create index on public.awards (event_id);

alter table public.awards enable row level security;
