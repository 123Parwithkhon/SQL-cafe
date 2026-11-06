'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock } from '@/components/icons';
import { ErSchema } from './ErSchema';
import type { DialectRow, Lesson } from '@/content/lessons';
import type { DictKey } from '@/lib/i18n';
import { useLang } from './LangProvider';
import { LessonExample } from './LessonExample';
import { RichText } from './RichText';

type Nav = { topic: string; title_ru: string; title_tj: string };

type Props = {
  lesson: Lesson;
  firstTaskId?: number;
  taskCount: number;
  prev?: Nav;
  next?: Nav;
};

/** Сравнение диалектов: на телефоне — карточки, на широком экране — таблица */
function DialectTable({ rows }: { rows: DialectRow[] }) {
  const { lang, t } = useLang();
  const heads = ['SQLite', 'MySQL', 'PostgreSQL'] as const;
  const cell = (r: DialectRow, i: number) => [r.sqlite, r.mysql, r.postgres][i];
  return (
    <div className="mt-3">
      <div className="hidden overflow-hidden rounded-xl border border-cream-dark md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-cream-dark text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">{t('dialect.task')}</th>
              {heads.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label_ru} className="border-t border-cream-dark/70 align-top">
                <td className="px-3 py-2 font-semibold">{lang === 'tj' ? r.label_tj : r.label_ru}</td>
                {heads.map((h, i) => <td key={h} className="px-3 py-2"><code className="break-words font-mono text-xs text-terra-dark">{cell(r, i)}</code></td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-2 md:hidden">
        {rows.map((r) => (
          <div key={r.label_ru} className="rounded-xl border border-cream-dark bg-white/60 p-3">
            <div className="mb-1.5 text-sm font-semibold">{lang === 'tj' ? r.label_tj : r.label_ru}</div>
            {heads.map((h, i) => (
              <div key={h} className="flex gap-2 text-xs">
                <span className="w-20 shrink-0 text-ink-soft">{h}</span>
                <code className="min-w-0 break-words font-mono text-terra-dark">{cell(r, i)}</code>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function LessonView({ lesson, firstTaskId, taskCount, prev, next }: Props) {
  const { lang, t } = useLang();
  const tr = (ru: string, tj: string) => (lang === 'tj' ? tj : ru);

  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/learn" className="inline-flex items-center gap-1 text-sm text-fg/60 hover:text-gold-soft">
        <ArrowLeft size={15} aria-hidden />
        {t('learn.title')}
      </Link>
      <div className="mt-3 flex items-center gap-1.5 text-xs uppercase tracking-wide text-gold-soft">
        {t(`topic.${lesson.topic}` as DictKey)} · <Clock size={13} aria-hidden /> {t('learn.minutes', { n: lesson.minutes })}
      </div>
      <h1 className="mt-1 font-serif text-3xl font-bold text-fg">{tr(lesson.title_ru, lesson.title_tj)}</h1>

      {lesson.sections.map((section, i) => (
        <section key={i} className="mt-6 rounded-2xl bg-cream p-5 text-ink shadow-lg">
          <h2 className="mb-2 font-serif text-xl font-bold text-lazur">
            <span className="mr-2 text-gold">{i + 1}.</span>
            {tr(section.title_ru, section.title_tj)}
          </h2>
          <RichText text={tr(section.ru, section.tj)} />
          {section.schema && (
            <div className="mt-3">
              <ErSchema db={lesson.db} title={t(`er.title.${lesson.db ?? 'chaikhana'}` as DictKey)} />
              <p className="mt-2 text-xs text-ink-soft">{t('er.legend')}</p>
            </div>
          )}
          {section.dialects && <DialectTable rows={section.dialects} />}
          {section.sql && <LessonExample sql={section.sql} after={section.after} db={lesson.db} />}
        </section>
      ))}

      {firstTaskId && (
        <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-gold/40 bg-panel p-5">
          <span className="text-fg/80">{t('learn.practice', { n: taskCount })}</span>
          <Link
            href={`/trainer/${firstTaskId}`}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-xl bg-terra px-5 font-semibold text-white transition hover:bg-terra-dark"
          >
            {t('learn.toTasks')}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      )}

      <nav className="mt-6 flex justify-between gap-4 text-sm">
        {prev ? (
          <Link href={`/learn/${prev.topic}`} className="inline-flex items-center gap-1 text-fg/70 hover:text-gold-soft">
            <ArrowLeft size={15} className="shrink-0" aria-hidden />
            {tr(prev.title_ru, prev.title_tj)}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/learn/${next.topic}`} className="inline-flex items-center gap-1 text-right text-fg/70 hover:text-gold-soft">
            {tr(next.title_ru, next.title_tj)}
            <ArrowRight size={15} className="shrink-0" aria-hidden />
          </Link>
        )}
      </nav>
    </article>
  );
}
