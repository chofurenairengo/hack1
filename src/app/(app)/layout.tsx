import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import { AppNav } from '@/components/features/nav/AppNav';

export default async function AppLayout({ children }: { readonly children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '/events';

  return (
    <div className="flex flex-col min-h-screen">
      <AppNav currentPath={pathname} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
