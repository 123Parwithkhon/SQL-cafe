'use client';

import Link from 'next/link';
import { Clock } from '@/components/icons';
import { TIERS, type Topic } from '@/lib/course';
import type { DictKey } from '@/lib/i18n';
import { useLang } from './LangProvider';

export type LessonCard = { topic: Topic; minutes: number; title_ru: string; title_tj: string; tasks: number };

function LessonGrid({ items }: { items: LessonCard[] }) {
  const { lang, t } = useLang();
  return (
    <ol className="grid gap-3 sm:grid-cols-2">
      {items.map((lesson) => (
        <li key={lesson.topic}>
          <Link
            href={`/learn/${lesson.topic}`}
            className="flex min-h-20 flex-col justify-center rounded-xl bg-cream px-4 py-3 text-ink transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="font-serif text-lg font-bold text-lazur">{lang === 'tj' ? lesson.title_tj : lesson.title_ru}</span>
            <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
              <Clock size={13} />
              {t('learn.minutes', { n: lesson.minutes })}
              {lesson.tasks > 0 && ` · ${t('learn.tasksCount', { n: lesson.tasks })}`}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export function LessonList({ lessons }: { lessons: LessonCard[] }) {
  const { t } = useLang();
  const inTiers = new Set(TIERS.flatMap((tier) => tier.topics));
  // Уроки вне уровней курса (например, про MySQL и PostgreSQL)
  const extra = lessons.filter((l) => !inTiers.has(l.topic));

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-fg">{t('learn.title')}</h1>
      <p className="mt-2 text-fg/70">{t('learn.subtitle')}</p>

      {TIERS.map((tier) => {
        const items = tier.topics.map((topic) => lessons.find((l) => l.topic === topic)).filter((l): l is LessonCard => !!l);
        if (items.length === 0) return null;
        return (
          <section key={tier.id} className="mt-8">
            <h2 className="mb-3 font-serif text-xl font-bold text-gold">{t(`tier.${tier.id}` as DictKey)}</h2>
            <LessonGrid items={items} />
          </section>
        );
      })}

      {extra.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-xl font-bold text-gold">{t('learn.extra')}</h2>
          <LessonGrid items={extra} />
        </section>
      )}
    </div>
  );
}
