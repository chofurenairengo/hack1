import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/events', label: 'イベント' },
  { href: '/slides', label: 'スライド' },
];

interface AppNavProps {
  currentPath: string;
}

export function AppNav({ currentPath }: AppNavProps) {
  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-6 h-14">
        <Link href="/events" className="text-base font-bold tracking-tight">
          トモコイ
        </Link>
        <nav className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
