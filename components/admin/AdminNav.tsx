'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Обзор' },
  { href: '/admin/users', label: 'Пользователи' },
  { href: '/admin/tasks', label: 'Задания' },
  { href: '/admin/certificates', label: 'Сертификаты' },
  { href: '/admin/announcement', label: 'Объявление' },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    // Телефон: сетка кнопок (все разделы видны сразу); компьютер: вкладки с подчёркиванием
    <nav className="mt-4 grid grid-cols-3 gap-1.5 sm:flex sm:gap-1 sm:border-b sm:border-gold/30" aria-label="Разделы админки">
      {LINKS.map(({ href, label }) => {
        const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 items-center justify-center rounded-lg border px-2 text-center text-xs font-semibold transition sm:-mb-px sm:rounded-none sm:border-0 sm:border-b-2 sm:px-3 sm:text-sm ${
              active ? 'border-gold bg-gold/15 text-gold-soft sm:bg-transparent' : 'border-gold/25 text-fg/75 hover:text-fg sm:border-transparent'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
