'use client';

import Link from 'next/link';
import { Check, Flame, Lock, Terminal, Timer } from '@/components/icons';
import { useAuthUser } from './AuthProvider';
import { ReviewPanel } from './ReviewPanel';
import { IS_STATIC } from '@/lib/env';
import { DailyGoal, ProverbOfTheDay, RankBadge, SilkRoad } from './Motivation';
import { OrnamentDivider } from './Ornament';
import type { PublicTask } from '@/lib/tasks';
import { TIERS } from '@/lib/course';
import type { DictKey } from '@/lib/i18n';
import { useProgress } from '@/lib/progress';
import { useLang } from './LangProvider';
import { PishtaqFrame } from './Pishtaq';

const LEVEL_DOT: Record<PublicTask['level'], string> = {
  easy: 'bg-emerald',
  medium: 'bg-gold',
  hard: 'bg-terra',
};

export function TaskMap({ tasks }: { tasks: PublicTask[] }) {
  const { lang, t } = useLang();
  const { progress, streak } = useProgress();
  const user = useAuthUser();
  const isSolved = (id: number) => progress.solved.includes(id);

  const solvedCount = tasks.filter((task) => isSolved(task.id)).length;

  // Уровни, темы, задания; пустые темы не показываем
  const tiers = TIERS.map((tier) => {
    const topics = tier.topics
      .map((topic) => ({ topic, items: tasks.filter((task) => task.topic === topic) }))
      .filter((group) => group.items.length > 0);
    const all = topics.flatMap((group) => group.items);
    return { ...tier, topics, total: all.length, solved: all.filter((task) => isSolved(task.id)).length };
  }).filter((tier) => tier.total > 0);

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-fg">{t('trainer.title')}</h1>
      <p className="mt-2 text-fg/70">{t('trainer.subtitle')}</p>
      <OrnamentDivider className="mt-4 max-w-md" />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gold/40 bg-panel px-4 py-3">
          <div className="text-2xl font-bold text-gold">
            {solvedCount}/{tasks.length}
          </div>
          <div className="text-xs text-fg/60">{t('progress.solved')}</div>
        </div>
        <div className="rounded-xl border border-gold/40 bg-panel px-4 py-3">
          <div className="flex items-center gap-1.5 text-2xl font-bold text-gold">
            <Flame size={22} />
            {streak}
          </div>
          <div className="text-xs text-fg/60">{t('progress.streak')}</div>
        </div>
        <RankBadge solved={solvedCount} className="col-span-2 lg:col-span-1" />
        <DailyGoal className="col-span-2 lg:col-span-1" />
      </div>
      {!user && !IS_STATIC && (
        <p className="mt-2 text-xs text-fg/60">
          {t('progress.loginHint')}{' '}
          <Link href="/auth?next=/trainer" className="font-semibold text-gold-soft underline">{t('auth.signIn')}</Link>
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/interview" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gold/40 bg-panel px-3 text-sm font-semibold text-fg hover:border-gold">
          <Timer size={16} className="text-gold" />
          {t('interview.title')}
        </Link>
        <Link href="/playground" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gold/40 bg-panel px-3 text-sm font-semibold text-fg hover:border-gold">
          <Terminal size={16} className="text-gold" />
          {t('nav.playground')}
        </Link>
      </div>

      <SilkRoad tiers={tiers.map(({ id, solved, total }) => ({ id, solved, total }))} />

      <ProverbOfTheDay className="mt-4" />

      <ReviewPanel tasks={tasks} />

      {tiers.map((tier, index) => {
        const prev = tiers[index - 1];
        // Мягкая блокировка: уровень доступен всегда, но приглушён, пока не решена половина предыдущего
        const recommended = !prev || prev.solved * 2 >= prev.total;
        const percent = Math.round((tier.solved / tier.total) * 100);

        return (
          <section key={tier.id} className="mt-10">
            <PishtaqFrame className="px-5 pb-5 pt-16 sm:px-8">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-gold">{t(`tier.${tier.id}` as DictKey)}</h2>
                  <p className="mt-1 text-sm text-fg/70">{t(`tier.${tier.id}.desc` as DictKey)}</p>
                </div>
                <span className="text-sm font-semibold text-gold-soft">
                  {t('tier.progress', { solved: tier.solved, total: tier.total })}
                </span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/10">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${percent}%` }} />
              </div>
              {!recommended && (
                <p className="mt-3 flex items-center gap-1.5 text-xs text-fg/60">
                  <Lock size={13} aria-hidden />
                  {t('tier.locked')}
                </p>
              )}
            </PishtaqFrame>

            <div className={recommended ? '' : 'opacity-60'}>
              {tier.topics.map(({ topic, items }) => (
                <div key={topic} className="mt-6">
                  <h3 className="mb-3 font-serif text-lg font-bold text-gold-soft">{t(`topic.${topic}` as DictKey)}</h3>
                  <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((task) => {
                      const solved = isSolved(task.id);
                      return (
                        <li key={task.id}>
                          <Link
                            href={`/trainer/${task.id}`}
                            className={`flex min-h-16 items-center gap-3 rounded-xl px-4 py-3 transition hover:-translate-y-0.5 ${
                              solved ? 'bg-emerald-soft text-ink' : 'bg-cream text-ink hover:shadow-lg'
                            }`}
                          >
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                solved ? 'bg-emerald text-white' : 'bg-lazur text-on-dark'
                              }`}
                            >
                              {solved ? <Check size={18} strokeWidth={3} aria-label={t('trainer.solved')} /> : task.num}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-semibold">{lang === 'tj' ? task.title_tj : task.title_ru}</span>
                              <span className="flex items-center gap-1.5 text-xs text-ink-soft">
                                <span className={`inline-block h-2 w-2 rounded-full ${LEVEL_DOT[task.level]}`} aria-hidden />
                                {t(`level.${task.level}` as DictKey)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
