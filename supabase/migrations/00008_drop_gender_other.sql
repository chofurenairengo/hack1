-- Delete any 'other' gender users and their cascading data.
-- users テーブルの FK は ON DELETE CASCADE のため関連データも全て削除される。
-- seed.sql に other ユーザーはいないため通常 no-op。
DELETE FROM public.users WHERE gender = 'other';

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_gender_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_gender_check CHECK (gender IN ('female', 'male'));
