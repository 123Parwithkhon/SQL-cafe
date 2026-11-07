'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Обзор' },
  { href: '/admin/users', label: 'Пользователи' },
  { href: '/admin/tasks', label: 'Задания' },
  { href: '/admin/certificates', label: 'Сертификаты' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="result-scroll mt-4 flex gap-1 border-b border-gold/30" aria-label="Разделы админки">
      {LINKS.map(({ href, label }) => {
        const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition ${
              active ? 'border-gold text-gold-soft' : 'border-transparent text-fg/70 hover:text-fg'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
