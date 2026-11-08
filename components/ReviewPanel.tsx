'use client';

// «Повторение на сегодня» — задания, к темам которых пора вернуться
import Link from 'next/link';
import { taskPath } from '@/lib/task-path';
import { useMemo } from 'react';
import type { DictKey } from '@/lib/i18n';
import { useProgress } from '@/lib/progress';
import { useDueReviews, type TaskLite } from '@/lib/review';
import { useLang } from './LangProvider';
import { ArrowRight, Repeat } from './icons';

export function ReviewPanel({ tasks }: { tasks: (TaskLite & { num: number; title_ru: string; title_tj: string })[] }) {
  const { lang, t } = useLang();
  const { progress, loaded } = useProgress();
  const solved = useMemo(() => (loaded ? progress.solved : []), [loaded, progress.solved]);
  const due = useDueReviews(tasks, solved);

  if (due.length === 0) return null;
  return (
    <section className="mt-6 rounded-2xl border border-gold/40 bg-panel p-4">
      <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-gold">
        <Repeat size={18} />
        {t('review.title')}
      </h2>
      <p className="mt-1 text-sm text-fg/70">{t('review.text')}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {due.map((item) => {
          const task = tasks.find((x) => x.id === item.suggestId);
          if (!task) return null;
          return (
            <li key={item.topic}>
              <Link href={taskPath(task.num)} className="flex h-full flex-col rounded-xl bg-cream px-4 py-3 text-ink transition hover:-translate-y-0.5">
                <span className="text-xs uppercase tracking-wide text-ink-soft">
                  {t(`topic.${item.topic}` as DictKey)} · {t(item.stage === 0 ? 'review.after3' : 'review.after7')}
                </span>
                <span className="mt-1 font-semibold">{lang === 'tj' ? task.title_tj : task.title_ru}</span>
                <span className="mt-auto flex items-center gap-1 pt-2 text-xs font-semibold text-terra">
                  {item.isRepeat ? t('review.repeat') : t('review.newTask')}
                  <ArrowRight size={14} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
