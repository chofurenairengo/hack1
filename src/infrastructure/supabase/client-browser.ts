import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
import { env } from '@/shared/config/env';

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
