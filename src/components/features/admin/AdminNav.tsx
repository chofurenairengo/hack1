import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin/slides', label: 'スライド審査' },
  { href: '/admin/events', label: 'イベント管理' },
];

interface AdminNavProps {
  currentPath: string;
}

export function AdminNav({ currentPath }: AdminNavProps) {
  return (
    <nav className="flex gap-1 border-b border-border mb-6">
      {NAV_ITEMS.map((item) => {
        const isActive = currentPath.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
