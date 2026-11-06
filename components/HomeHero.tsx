'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, Diamond } from '@/components/icons';
import { greeting } from '@/lib/motivation';
import { useLang } from './LangProvider';
import { PishtaqFrame } from './Pishtaq';
import { HeroScene } from './HeroScene';
import { ProverbOfTheDay } from './Motivation';

export function HomeHero() {
  const { lang, t } = useLang();
  // Приветствие зависит от часов пользователя — считаем только в браузере
  const [hello, setHello] = useState<{ tj: string; ru: string } | null>(null);
  useEffect(() => setHello(greeting()), []);

  return (
    <PishtaqFrame className="px-6 pb-8 pt-16 sm:px-10">
      <HeroScene className="mx-auto mb-2 block w-44 sm:w-64 lg:w-72" />
      <p className="h-6 text-center font-serif text-lg italic text-gold-soft">
        {hello && (lang === 'tj' ? hello.tj : `${hello.tj} — ${hello.ru}`)}
      </p>
      <h1 className="mt-2 text-center font-serif text-3xl font-bold leading-tight text-fg sm:text-4xl">{t('hero.title')}</h1>
      <p className="mt-4 leading-relaxed text-fg/80">{t('hero.subtitle')}</p>
      <ul className="mt-5 space-y-2 text-sm text-fg/80">
        {(['hero.feature1', 'hero.feature2', 'hero.feature3'] as const).map((key) => (
          <li key={key} className="flex gap-2">
            <Diamond size={14} className="mt-1 shrink-0 fill-gold text-gold" />
            {t(key)}
          </li>
        ))}
      </ul>
      <p className="mt-6 flex items-center gap-1.5 font-semibold text-gold-soft">
        {t('hero.try')}
        <ArrowDown size={16} className="lg:hidden" />
        <ArrowRight size={16} className="hidden lg:inline" />
      </p>
      <Link
        href="/trainer"
        className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-gold/60 px-5 font-semibold text-gold-soft transition hover:bg-fg/5"
      >
        {t('hero.cta')}
        <ArrowRight size={16} className="ml-2" />
      </Link>
      {/* На телефоне не показываем — демо-задание должно быть как можно ближе к верху экрана */}
      <ProverbOfTheDay className="mt-6 hidden sm:block" />
    </PishtaqFrame>
  );
}
