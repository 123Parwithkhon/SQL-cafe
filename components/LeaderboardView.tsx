'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, Medal, MapPin, GraduationCap } from '@/components/icons';
import { CITIES, UNIVERSITIES, shortUniversity } from '@/lib/regions';
import type { LeaderRow, Period } from '@/lib/stats';
import { useLang } from './LangProvider';
import { useAuthUser } from './AuthProvider';
import { Avatar } from './Avatar';

type Props = {
  period: Period;
  city: string | null;
  university: string | null;
  rows: LeaderRow[];
  me: LeaderRow | null;
  hasRegion: boolean;
  failed: boolean;
};

function buildHref(period: Period, city: string | null, university: string | null) {
  const params = new URLSearchParams();
  if (period === 'all') params.set('period', 'all');
  if (city) params.set('city', city);
  if (university) params.set('university', university);
  const qs = params.toString();
  return qs ? `/leaderboard?${qs}` : '/leaderboard';
}

export function LeaderboardView({ period, city, university, rows, me, hasRegion, failed }: Props) {
  const { t } = useLang();
  const user = useAuthUser();
  const router = useRouter();
  const place = [city, university && shortUniversity(university)].filter(Boolean).join(', ');

  const select = 'min-h-11 w-full rounded-lg border border-gold/40 bg-panel px-3 text-sm text-fg outline-none focus:border-gold';

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl font-bold text-fg">{place ? t('leaderboard.bestIn', { place }) : t('leaderboard.title')}</h1>
      <p className="mt-2 text-sm text-fg/70">{t('leaderboard.subtitle')}</p>

      {/* Период */}
      <div className="mt-5 inline-flex overflow-hidden rounded-xl border border-gold/40" role="tablist">
        {(['week', 'all'] as const).map((p) => (
          <Link
            key={p}
            href={buildHref(p, city, university)}
            role="tab"
            aria-selected={period === p}
            className={`min-h-11 px-4 py-2.5 text-sm font-semibold transition ${period === p ? 'bg-gold text-lazur' : 'text-fg/80 hover:bg-fg/5'}`}
          >
            {t(p === 'week' ? 'leaderboard.week' : 'leaderboard.all')}
          </Link>
        ))}
      </div>

      {/* Фильтры */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="relative">
          <span className="sr-only">{t('profile.city')}</span>
          <select value={city ?? ''} onChange={(e) => router.push(buildHref(period, e.target.value || null, university))} className={select}>
            <option value="">{t('leaderboard.allCities')}</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">{t('profile.university')}</span>
          <select value={university ?? ''} onChange={(e) => router.push(buildHref(period, city, e.target.value || null))} className={select}>
            <option value="">{t('leaderboard.allUnis')}</option>
            {UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
      </div>
      {period === 'week' && <p className="mt-2 text-xs text-fg/50">{t('leaderboard.weekNote')}</p>}

      {user && !hasRegion && (
        <p className="mt-4 rounded-xl border border-gold/40 px-4 py-3 text-sm text-fg/80">
          {t('leaderboard.setRegion')}{' '}
          <Link href="/profile" className="font-semibold text-gold-soft underline">{t('nav.profile')}</Link>
        </p>
      )}

      {failed ? (
        <p className="mt-6 rounded-xl bg-danger-soft px-4 py-3 text-danger">{t('leaderboard.error')}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 rounded-xl bg-cream px-4 py-6 text-center text-ink">{t('leaderboard.empty')}</p>
      ) : (
        <ol className="mt-6 overflow-hidden rounded-2xl bg-cream text-ink">
          {rows.map((row) => <Row key={row.id} row={row} isMe={row.id === user?.id} />)}
        </ol>
      )}

      {/* Своё место, если не попали в топ-50 */}
      {me && !rows.some((r) => r.id === me.id) && (
        <ol className="mt-3 overflow-hidden rounded-2xl bg-cream text-ink">
          <Row row={me} isMe />
        </ol>
      )}
    </div>
  );
}

function Row({ row, isMe }: { row: LeaderRow; isMe: boolean }) {
  const { t } = useLang();
  const rankIcon =
    row.rank === 1 ? <Crown size={20} className="text-gold" aria-label="1" /> :
    row.rank <= 3 ? <Medal size={20} className={row.rank === 2 ? 'text-[#8a94a6]' : 'text-[#b5703c]'} aria-label={String(row.rank)} /> :
    <span className="text-sm font-bold text-ink-soft">{row.rank}</span>;

  return (
    <li className={`flex items-center gap-3 border-b border-cream-dark/60 px-3 py-3 last:border-b-0 sm:px-4 ${isMe ? 'bg-gold/20' : ''}`}>
      <span className="flex w-7 shrink-0 justify-center">{rankIcon}</span>
      <Avatar name={row.name} image={row.image} size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2 font-semibold">
          <span className="truncate">{row.name}</span>
          {isMe && <span className="shrink-0 rounded-full bg-terra px-2 py-0.5 text-xs text-white">{t('leaderboard.you')}</span>}
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs text-ink-soft">
          {row.city && <span className="flex items-center gap-1"><MapPin size={12} aria-hidden />{row.city}</span>}
          {row.university && <span className="flex items-center gap-1"><GraduationCap size={12} aria-hidden />{shortUniversity(row.university)}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="font-bold text-lazur">{row.points}</div>
        <div className="text-[11px] text-ink-soft">{t('leaderboard.points')} · {row.solved} {t('leaderboard.solved')}</div>
      </div>
    </li>
  );
}
