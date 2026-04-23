import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';

export default async function AppLayout({ children }: { readonly children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <>{children}</>;
}
