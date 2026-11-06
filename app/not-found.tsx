'use client';

import Link from 'next/link';
import { useLang } from '@/components/LangProvider';
import { PishtaqFrame } from '@/components/Pishtaq';

export default function NotFound() {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <PishtaqFrame className="px-6 pb-8 pt-20">
        <div className="font-serif text-6xl font-bold text-gold">404</div>
        <h1 className="mt-3 font-serif text-2xl font-bold text-fg">{t('notFound.title')}</h1>
        <p className="mt-2 text-fg/70">{t('notFound.text')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-xl bg-terra px-5 font-semibold text-white hover:bg-terra-dark">
            {t('nav.home')}
          </Link>
          <Link href="/trainer" className="inline-flex min-h-11 items-center rounded-xl border border-gold/60 px-5 font-semibold text-gold-soft hover:bg-fg/5">
            {t('nav.trainer')}
          </Link>
        </div>
      </PishtaqFrame>
    </div>
  );
}
