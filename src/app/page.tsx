import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">トモコイ</h1>
      <p className="text-center text-lg text-muted-foreground max-w-md">
        友人紹介型ライブマッチングイベントプラットフォーム
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          ログイン
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-input bg-background px-6 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          新規登録
        </Link>
      </div>
    </main>
  );
}
