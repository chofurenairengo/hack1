'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUpAction } from '@/app/actions/auth/sign-up.action';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await signUpAction({
      email: formData.get('email'),
      password: formData.get('password'),
      nickname: formData.get('nickname'),
    });

    setPending(false);

    if (result.ok) {
      setSuccess(true);
    } else {
      setError(result.message);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold">確認メールを送信しました</h1>
          <p className="text-sm text-muted-foreground">
            登録いただいたメールアドレスに確認メールをお送りしました。
            メール内のリンクをクリックして登録を完了してください。
          </p>
          <Link
            href="/login"
            className="text-sm underline underline-offset-4 hover:text-foreground"
          >
            ログインページへ
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">新規登録</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="nickname" className="text-sm font-medium">
              ニックネーム
            </label>
            <input
              id="nickname"
              name="nickname"
              type="text"
              required
              maxLength={20}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              パスワード (8文字以上)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {pending ? '登録中...' : '登録する'}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            ログイン
          </Link>
        </p>
      </div>
    </main>
  );
}
