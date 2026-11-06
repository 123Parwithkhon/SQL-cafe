'use client';

// Граница ошибок: если страница упала при рендере, показываем понятный экран с повтором
import { useEffect } from 'react';
import { TriangleAlert } from '@/components/icons';
import { useLang } from '@/components/LangProvider';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLang();

  useEffect(() => {
    console.error('[page error]', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <TriangleAlert size={48} strokeWidth={1.5} className="mx-auto text-gold" aria-hidden />
      <h1 className="mt-4 font-serif text-2xl font-bold text-fg">{t('errorPage.title')}</h1>
      <p className="mt-2 text-fg/70">{t('errorPage.text')}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-terra px-5 font-semibold text-white hover:bg-terra-dark"
      >
        {t('errorPage.retry')}
      </button>
    </div>
  );
}
