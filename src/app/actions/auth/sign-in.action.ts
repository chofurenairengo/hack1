'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import type { ActionResult } from '@/shared/types/action-result';
import type { UserId } from '@/shared/types/ids';

const signInSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
});

export async function signInAction(input: unknown): Promise<ActionResult<{ userId: UserId }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.user) {
      return {
        ok: false,
        code: 'unauthenticated',
        message: 'メールアドレスまたはパスワードが正しくありません',
      };
    }

    redirect('/events');
  } catch (e) {
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e;
    return {
      ok: false,
      code: 'internal_error',
      message: 'ログインに失敗しました。しばらくしてから再度お試しください',
    };
  }
}
