'use client';

// Виджеты мотивации: «Чайник дня», звание, «Шёлковый путь», мудрость дня
import { useEffect, useState } from 'react';
import type { Tier } from '@/lib/course';
import type { DictKey } from '@/lib/i18n';
import { DAILY_EVENT, DAILY_GOAL, proverbOfTheDay, rankName, rankOf, readDaily } from '@/lib/motivation';
import { useLang } from './LangProvider';
import { Rosette } from './Ornament';

/** «Чайник дня»: пиала наполняется чаем с каждым решённым сегодня заданием */
export function DailyGoal({ className = '' }: { className?: string }) {
  const { t } = useLang();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(readDaily());
    sync();
    window.addEventListener(DAILY_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(DAILY_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const done = count >= DAILY_GOAL;
  const level = Math.min(count, DAILY_GOAL) / DAILY_GOAL;
  // Внутренность пиалы: от y=14 (край) до y=32 (дно) — чай поднимается снизу; пустая пиала — пустая
  const teaTop = 33 - level * 18;

  return (
    <div className={`flex items-center gap-3 rounded-xl border border-gold/40 bg-panel px-4 py-3 ${done ? 'glow' : ''} ${className}`}>
      <svg viewBox="0 0 48 40" className="h-11 w-12 shrink-0" aria-hidden>
        <defs>
          <clipPath id="dg-bowl">
            <path d="M6 14 H42 C41 25 35 32 24 32 C13 32 7 25 6 14 Z" />
          </clipPath>
        </defs>
        {done && (
          <g className="steam">
            <path d="M24 11 C21 7 27 5 24 0" fill="none" stroke="var(--color-gold-soft)" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        )}
        <path d="M6 14 H42 C41 25 35 32 24 32 C13 32 7 25 6 14 Z" fill="var(--color-cream)" />
        <rect className="tea-fill" x="0" y={teaTop} width="48" height={40} fill="#b8742a" clipPath="url(#dg-bowl)" />
        <path d="M6 14 H42 C41 25 35 32 24 32 C13 32 7 25 6 14 Z" fill="none" stroke="var(--color-gold)" strokeWidth="1.5" />
        <path d="M7.5 18 H40.5" stroke="var(--color-turquoise)" strokeWidth="1.6" opacity="0.8" />
        <path d="M17 34 H31" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-fg">
          {t('daily.title')}: <span className="text-gold">{Math.min(count, DAILY_GOAL)}/{DAILY_GOAL}</span>
        </div>
        <div className="text-xs text-fg/60">{done ? t('daily.done') : t('daily.left', { n: DAILY_GOAL - count })}</div>
      </div>
    </div>
  );
}

/** Звание по числу решённых заданий и шкала до следующего */
export function RankBadge({ solved, className = '' }: { solved: number; className?: string }) {
  const { lang, t } = useLang();
  const { rank, next, progress } = rankOf(solved);
  return (
    <div className={`rounded-xl border border-gold/40 bg-panel px-4 py-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Rosette className="h-5 w-5 shrink-0 text-gold" />
        <span className="font-serif text-lg font-bold text-gold">{rankName(rank, lang)}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/10">
        <div className="h-full rounded-full bg-gradient-to-r from-gold to-turquoise transition-all" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mt-1 text-xs text-fg/60">
        {next ? t('rank.next', { name: rankName(next, lang), n: next.min - solved }) : t('rank.max')}
      </div>
    </div>
  );
}

/** Остановки каравана: уровни курса — города Таджикистана от Худжанда до Памира */
const ROAD: Record<Tier, { ru: string; tj: string }> = {
  novice: { ru: 'Худжанд', tj: 'Хуҷанд' },
  adept: { ru: 'Истаравшан', tj: 'Истаравшан' },
  master: { ru: 'Душанбе', tj: 'Душанбе' },
  expert: { ru: 'Памир', tj: 'Помир' },
};

export function SilkRoad({ tiers }: { tiers: { id: Tier; solved: number; total: number }[] }) {
  const { lang, t } = useLang();
  // Караван стоит у первой непройденной остановки
  const current = tiers.findIndex((tier) => tier.solved < tier.total);
  const at = current === -1 ? tiers.length - 1 : current;

  return (
    <section className="mt-6 rounded-2xl border border-gold/40 bg-panel p-4 sm:p-5">
      <h2 className="font-serif text-lg font-bold text-gold">{t('road.title')}</h2>
      <p className="mt-0.5 text-xs text-fg/60">{t('road.text')}</p>
      <ol className="mt-4 grid grid-cols-4 gap-1">
        {tiers.map((tier, i) => {
          const done = tier.total > 0 && tier.solved === tier.total;
          const percent = tier.total ? (tier.solved / tier.total) * 100 : 0;
          return (
            <li key={tier.id} className="relative flex flex-col items-center text-center">
              {/* Отрезок дороги к следующей остановке */}
              {i < tiers.length - 1 && (
                <span className="absolute left-1/2 top-4 h-1 w-full -translate-y-1/2 overflow-hidden rounded-full bg-fg/10" aria-hidden>
                  <span className="block h-full bg-gradient-to-r from-gold to-turquoise" style={{ width: `${done ? 100 : 0}%` }} />
                </span>
              )}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                  done ? 'border-gold bg-gold text-lazur' : i === at ? 'glow border-gold bg-panel text-gold' : 'border-fg/20 bg-panel text-fg/40'
                }`}
              >
                <Rosette className="h-4 w-4" />
              </span>
              <span className={`mt-1.5 text-xs font-semibold sm:text-sm ${i <= at ? 'text-fg' : 'text-fg/50'}`}>{lang === 'tj' ? ROAD[tier.id].tj : ROAD[tier.id].ru}</span>
              <span className="hidden text-[11px] text-fg/50 sm:block">{t(`tier.${tier.id}` as DictKey).split('·')[1]?.trim()}</span>
              <span className="text-[11px] text-gold-soft">{Math.round(percent)}%</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Мудрость дня — таджикская пословица с переводом */
export function ProverbOfTheDay({ className = '' }: { className?: string }) {
  const { lang, t } = useLang();
  const [proverb, setProverb] = useState<{ tj: string; ru: string } | null>(null);
  // Только на клиенте: «день» зависит от часового пояса пользователя
  useEffect(() => setProverb(proverbOfTheDay()), []);
  if (!proverb) return null;
  return (
    <figure className={`rounded-xl border-l-4 border-turquoise bg-panel px-4 py-3 ${className}`}>
      <figcaption className="text-[11px] font-semibold uppercase tracking-wider text-turquoise-soft">{t('proverb.title')}</figcaption>
      <blockquote className="mt-1 font-serif text-base italic text-fg">«{proverb.tj}»</blockquote>
      {lang === 'ru' && <p className="mt-0.5 text-xs text-fg/60">{proverb.ru}</p>}
    </figure>
  );
}

