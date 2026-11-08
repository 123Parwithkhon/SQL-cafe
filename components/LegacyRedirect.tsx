'use client';

// Перенаправление в статической сборке (GitHub Pages): сервера нет, поэтому переходит браузер.
// Ссылка внизу — на случай, если скрипты не загрузились.
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function LegacyRedirect({ to, title }: { to: string; title: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  return (
    <p className="py-16 text-center text-fg/70">
      <Link href={to} className="font-semibold text-gold-soft underline">
        {title}
      </Link>
    </p>
  );
}
