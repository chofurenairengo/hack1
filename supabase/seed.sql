-- Seed data for local development
-- Run after migrations: supabase db reset

-- Note: Auth users must be created via Supabase Auth API or Studio.
-- This seed creates public.users records that reference pre-existing auth.users.
-- For local dev, create auth users via the Supabase Studio UI first.

-- Insert a test admin user (replace the UUID with your actual auth.users ID)
-- insert into public.users (id, nickname, age, gender, preferred_genders, bio, is_admin)
-- values
--   ('00000000-0000-0000-0000-000000000001', '管理者A', 28, 'male', array['any'], '運営担当', true);

-- Insert test event (after creating the admin user above)
-- insert into public.events (id, title, description, mode, organizer_id, scheduled_at)
-- values
--   (
--     '00000000-0000-0000-0000-000000000010',
--     'トモコイ 2026 春',
--     '友人紹介型ライブマッチングイベント',
--     'offline',
--     '00000000-0000-0000-0000-000000000001',
--     now() + interval '7 days'
--   );

-- Uncomment and adjust the above statements after creating auth users locally.
select 1; -- no-op so the file is valid SQL
