import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';

export default async function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single<{ is_admin: boolean }>();

  if (profileError || !profile) {
    redirect('/login');
  }

  if (!profile.is_admin) {
    redirect('/events');
  }

  return <>{children}</>;
}
