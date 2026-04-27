-- Guard: abort if any 'other' gender rows exist so data loss is never silent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE gender = 'other') THEN
    RAISE EXCEPTION
      'Migration 00008 cannot continue: found users with gender = ''other''. '
      'Clean up those rows explicitly before applying this migration.';
  END IF;
END
$$;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_gender_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_gender_check CHECK (gender IN ('female', 'male'));
