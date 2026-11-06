'use client';

// Статическая сборка (GitHub Pages): то, чему нужен сервер — вход, рейтинг, — здесь недоступно
import Link from 'next/link';
import type { DictKey } from '@/lib/i18n';
import { useLang } from './LangProvider';
import { PishtaqFrame } from './Pishtaq';
import { ArrowRight, Lock } from './icons';

export function FullVersionNotice({ titleKey }: { titleKey: DictKey }) {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-md">
      <PishtaqFrame className="px-6 pb-8 pt-20 text-center">
        <Lock size={36} className="mx-auto text-gold" />
        <h1 className="mt-3 font-serif text-2xl font-bold text-fg">{t(titleKey)}</h1>
        <p className="mt-3 text-fg/75">{t('static.serverOnly')}</p>
        <p className="mt-2 text-sm text-fg/60">{t('static.localProgress')}</p>
        <Link href="/trainer" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-terra px-5 font-semibold text-white hover:bg-terra-dark">
          {t('nav.trainer')}
          <ArrowRight size={18} />
        </Link>
      </PishtaqFrame>
    </div>
  );
}
