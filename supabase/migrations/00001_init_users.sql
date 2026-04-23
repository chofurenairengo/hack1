-- Users, profile photos, friendships, blocks
-- RLS is enabled on all tables in this migration.

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  age int not null check (age between 18 and 80),
  gender text not null check (gender in ('female', 'male', 'other')),
  preferred_genders text[] not null default array['any'],
  residence_pref text,
  bio text,
  hobbies text[],
  avatar_preset_key text,
  email_domain_verified boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.users (gender);
create index on public.users (residence_pref);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.set_updated_at();

alter table public.users enable row level security;

-- -------------------------------------------------------

create table public.profile_photos (
  user_id uuid primary key references public.users(id) on delete cascade,
  storage_path text not null unique,
  uploaded_at timestamptz not null default now()
);

alter table public.profile_photos enable row level security;

-- -------------------------------------------------------

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  addressee_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id != addressee_id),
  -- canonical ordering: application must insert with requester_id < addressee_id
  constraint friendships_canonical check (requester_id < addressee_id),
  constraint friendships_unique unique (requester_id, addressee_id)
);

create index on public.friendships (addressee_id);

alter table public.friendships enable row level security;

-- -------------------------------------------------------

create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocks_no_self check (blocker_id != blocked_id),
  constraint blocks_unique unique (blocker_id, blocked_id)
);

create index on public.blocks (blocked_id);

alter table public.blocks enable row level security;
