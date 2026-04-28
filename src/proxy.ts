import { type NextRequest } from 'next/server';
import { updateSession } from '@/infrastructure/supabase/middleware';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|echo-test|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
