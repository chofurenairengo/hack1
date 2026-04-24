'use server';

import { z } from 'zod';
import { createSupabaseServerClient } from '@/infrastructure/supabase/client-server';
import type { ActionResult } from '@/shared/types/action-result';
import type { UserId } from '@/shared/types/ids';
import { asUserId } from '@/shared/types/ids';
import { env } from '@/shared/config/env';

const signUpSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(8, 'パスワードは8文字以上で入力してください'),
  nickname: z
    .string()
    .min(1, 'ニックネームを入力してください')
    .max(20, 'ニックネームは20文字以内で入力してください'),
});

export async function signUpAction(input: unknown): Promise<ActionResult<{ userId: UserId }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_error',
      message: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: { nickname: parsed.data.nickname },
      },
    });

    if (error) {
      if (
        error.message.includes('already registered') ||
        error.message.includes('already exists')
      ) {
        return {
          ok: false,
          code: 'conflict',
          message: 'このメールアドレスはすでに登録されています',
        };
      }
      return {
        ok: false,
        code: 'internal_error',
        message: '登録に失敗しました。しばらくしてから再度お試しください',
      };
    }

    if (!data.user) {
      return { ok: false, code: 'internal_error', message: '登録に失敗しました' };
    }

    return { ok: true, data: { userId: asUserId(data.user.id) } };
  } catch {
    return {
      ok: false,
      code: 'internal_error',
      message: '登録に失敗しました。しばらくしてから再度お試しください',
    };
  }
}
