'use client';

import Link from 'next/link';
import { taskPath } from '@/lib/task-path';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Award, Check, Flame, GraduationCap, Lock, LogIn, LogOut, Medal, ShieldCheck, Sparkles, Star, Target, Timer, Trophy, type IconComponent,
} from '@/components/icons';
import { TIERS, type Tier, type Topic } from '@/lib/course';
import { CITIES, UNIVERSITIES } from '@/lib/regions';
import type { DictKey } from '@/lib/i18n';
import type { CertificateStatus, ProfileStats, PublicUser } from '@/lib/stats';
import { ReviewPanel } from './ReviewPanel';
import { IS_STATIC } from '@/lib/env';
import { DailyGoal, RankBadge } from './Motivation';
import { SYNCED_EVENT, useProgress } from '@/lib/progress';
import { useLang } from './LangProvider';
import { Avatar } from './Avatar';
import { PishtaqFrame } from './Pishtaq';

type TaskInfo = { id: number; num: number; topic: Topic; level: 'easy' | 'medium' | 'hard'; title_ru: string; title_tj: string };

type Props = {
  tasks: TaskInfo[];
  user: PublicUser | null;
  stats: ProfileStats | null;
  certificates: CertificateStatus[];
  failed: boolean;
  /** Нет в статической сборке — там нет входа */
  signOutAction?: () => Promise<void>;
};

const TIER_ICON: Record<Tier, IconComponent> = { novice: Star, adept: Award, master: Medal, expert: GraduationCap };

/** Сертификаты по уровням: прогресс по решениям, проверенным сервером, и кнопка получения */
function Certificates({ items }: { items: CertificateStatus[] }) {
  const { t } = useLang();
  const router = useRouter();
  const [busyTier, setBusyTier] = useState<Tier | null>(null);
  const [error, setError] = useState(false);

  async function issue(tier: Tier) {
    setBusyTier(tier);
    setError(false);
    try {
      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = (await response.json()) as { code?: string };
      if (!response.ok || !data.code) throw new Error();
      router.push(`/cert/${data.code}`);
    } catch {
      setError(true);
      setBusyTier(null);
    }
  }

  return (
    <>
      <h2 className="mt-10 font-serif text-xl font-bold text-gold">{t('cert.title')}</h2>
      <p className="mt-1 text-sm text-fg/60">{t('cert.hint')}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {items.map((c) => {
          const Icon = TIER_ICON[c.tier];
          const done = c.total > 0 && c.verified === c.total;
          return (
            <div key={c.tier} className="flex items-center gap-3 rounded-xl border border-gold/30 bg-panel p-4">
              <Icon size={26} className={done ? 'text-gold' : 'text-fg/30'} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-fg">{t(`tier.${c.tier}` as DictKey)}</div>
                <div className="text-xs text-fg/60">{t('tier.progress', { solved: c.verified, total: c.total })}</div>
              </div>
              {c.code ? (
                <Link href={`/cert/${c.code}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald px-3 text-sm font-semibold text-white">
                  <ShieldCheck size={16} />
                  {t('cert.open')}
                </Link>
              ) : done ? (
                <button
                  type="button"
                  onClick={() => issue(c.tier)}
                  disabled={busyTier !== null}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-terra px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Award size={16} />
                  {t('cert.get')}
                </button>
              ) : (
                <Lock size={18} className="text-fg/30" />
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-danger">{t('cert.error')}</p>}
    </>
  );
}

export function ProfileView({ tasks, user, stats, certificates, failed, signOutAction }: Props) {
  const { lang, t } = useLang();
  const { progress, streak } = useProgress();
  const router = useRouter();

  // После переноса прогресса с устройства перечитываем серверную статистику
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener(SYNCED_EVENT, refresh);
    return () => window.removeEventListener(SYNCED_EVENT, refresh);
  }, [router]);
  const solvedSet = new Set(progress.solved);
  const solvedCount = tasks.filter((task) => solvedSet.has(task.id)).length;

  const tiers = TIERS.map((tier) => {
    const items = tasks.filter((task) => tier.topics.includes(task.topic));
    return { id: tier.id, total: items.length, solved: items.filter((task) => solvedSet.has(task.id)).length };
  });

  const achievements: { key: string; title: string; desc: string; Icon: IconComponent; done: boolean }[] = [
    { key: 'first', title: t('ach.first'), desc: t('ach.first.desc'), Icon: Sparkles, done: solvedCount >= 1 },
    { key: 'ten', title: t('ach.ten'), desc: t('ach.ten.desc'), Icon: Target, done: solvedCount >= 10 },
    { key: 'streak3', title: t('ach.streak3'), desc: t('ach.streak3.desc'), Icon: Flame, done: streak >= 3 },
    { key: 'streak7', title: t('ach.streak7'), desc: t('ach.streak7.desc'), Icon: Flame, done: streak >= 7 },
    ...tiers.map((tier) => ({
      key: tier.id,
      title: t(`tier.${tier.id}` as DictKey),
      desc: t('ach.tier'),
      Icon: TIER_ICON[tier.id],
      done: tier.total > 0 && tier.solved === tier.total,
    })),
    { key: 'fifty', title: t('ach.fifty'), desc: t('ach.fifty.desc'), Icon: Medal, done: solvedCount >= 50 },
    { key: 'all', title: t('ach.all'), desc: t('ach.all.desc'), Icon: Trophy, done: solvedCount === tasks.length },
  ];

  const titleOf = (id: number) => {
    const task = tasks.find((x) => x.id === id);
    return task ? (lang === 'tj' ? task.title_tj : task.title_ru) : `#${id}`;
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Шапка профиля */}
      {user ? (
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={user.name} image={user.image} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-3xl font-bold text-fg">{user.name}</h1>
            <p className="text-sm text-fg/60">{[user.city, user.university].filter(Boolean).join(' · ') || t('profile.notSet')}</p>
          </div>
          <form action={signOutAction}>
            <button type="submit" className="flex min-h-10 items-center gap-2 rounded-lg border border-fg/20 px-3 text-sm text-fg/80 hover:bg-fg/5">
              <LogOut size={16} aria-hidden />
              {t('auth.signOut')}
            </button>
          </form>
        </div>
      ) : (
        <PishtaqFrame className="px-6 pb-6 pt-20 text-center">
          <h1 className="font-serif text-2xl font-bold text-fg">{IS_STATIC ? t('profile.title') : t('profile.guestTitle')}</h1>
          <p className="mt-2 text-fg/70">{failed ? t('leaderboard.error') : IS_STATIC ? t('static.localProgress') : t('profile.guestText')}</p>
          {!failed && !IS_STATIC && (
            <Link href="/auth?next=/profile" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-terra px-5 font-semibold text-white hover:bg-terra-dark">
              <LogIn size={18} aria-hidden />
              {t('auth.signIn')}
            </Link>
          )}
        </PishtaqFrame>
      )}

      {/* Цифры */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t('progress.solved')} value={`${solvedCount}/${tasks.length}`} />
        <StatTile label={t('progress.streak')} value={String(streak)} Icon={Flame} />
        {stats && <StatTile label={t('profile.points')} value={String(stats.points)} Icon={Star} />}
        {stats && <StatTile label={t('profile.rank')} value={stats.rankAll ? `#${stats.rankAll}` : '—'} Icon={Trophy} />}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <RankBadge solved={solvedCount} />
        <DailyGoal />
      </div>
      {stats && stats.solved > stats.verified && (
        <p className="mt-3 text-xs text-fg/60">{t('profile.unverified', { n: stats.solved - stats.verified })}</p>
      )}

      <ReviewPanel tasks={tasks} />

      <Link
        href="/interview"
        className="mt-6 flex items-center gap-3 rounded-2xl border border-gold/40 bg-panel p-4 transition hover:border-gold"
      >
        <Timer size={28} className="shrink-0 text-gold" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-fg">{t('interview.title')}</span>
          <span className="block text-sm text-fg/60">{t('interview.cta')}</span>
        </span>
      </Link>

      {user && <ProfileForm user={user} />}

      {user && certificates.length > 0 && <Certificates items={certificates} />}

      {/* Уровни */}
      <h2 className="mt-10 font-serif text-xl font-bold text-gold">{t('profile.tiers')}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {tiers.map((tier) => {
          const Icon = TIER_ICON[tier.id];
          const percent = tier.total ? Math.round((tier.solved / tier.total) * 100) : 0;
          return (
            <div key={tier.id} className="rounded-xl border border-gold/30 bg-panel p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Icon size={18} className="text-gold" aria-hidden />
                {t(`tier.${tier.id}` as DictKey)}
                <span className="ml-auto text-gold-soft">{t('tier.progress', { solved: tier.solved, total: tier.total })}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fg/10">
                <div className="h-full rounded-full bg-gold" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Достижения */}
      <h2 className="mt-10 font-serif text-xl font-bold text-gold">{t('profile.achievements')}</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {achievements.map(({ key, title, desc, Icon, done }) => (
          <PishtaqFrame key={key} className={`px-3 pb-4 pt-16 text-center ${done ? '' : 'opacity-45 grayscale'}`}>
            <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full ${done ? 'bg-gold text-lazur' : 'bg-fg/10 text-fg/60'}`}>
              {done ? <Icon size={22} aria-hidden /> : <Lock size={18} aria-hidden />}
            </div>
            <div className="mt-2 text-sm font-semibold leading-tight text-fg">{title}</div>
            <div className="mt-1 text-xs leading-snug text-fg/60">{desc}</div>
          </PishtaqFrame>
        ))}
      </div>

      {/* Последние решения */}
      {stats && (
        <>
          <h2 className="mt-10 font-serif text-xl font-bold text-gold">{t('profile.recent')}</h2>
          {stats.recent.length === 0 ? (
            <p className="mt-2 text-sm text-fg/60">{t('profile.noRecent')}</p>
          ) : (
            <ul className="mt-3 divide-y divide-cream-dark/60 overflow-hidden rounded-xl bg-cream text-ink">
              {stats.recent.map((r) => (
                <li key={r.taskId}>
                  <Link href={taskPath(tasks.find((x) => x.id === r.taskId)?.num ?? 1)} className="flex items-center gap-3 px-4 py-3 hover:bg-white/50">
                    <Check size={18} className="shrink-0 text-emerald" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-semibold">{titleOf(r.taskId)}</span>
                    <span className="shrink-0 text-xs text-ink-soft">{r.solvedAt}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function StatTile({ label, value, Icon }: { label: string; value: string; Icon?: IconComponent }) {
  return (
    <div className="rounded-xl border border-gold/40 bg-panel px-4 py-3">
      <div className="flex items-center gap-1.5 text-2xl font-bold text-gold">
        {Icon && <Icon size={20} aria-hidden />}
        {value}
      </div>
      <div className="text-xs text-fg/60">{label}</div>
    </div>
  );
}

function ProfileForm({ user }: { user: PublicUser }) {
  const { t } = useLang();
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [city, setCity] = useState(user.city ?? '');
  const [university, setUniversity] = useState(user.university ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus('saving');
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, city: city || null, university: university || null }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setStatus('saved');
      router.refresh(); // обновить имя в шапке
    } catch {
      setStatus('error');
    }
  }

  const field = 'mt-1 block min-h-11 w-full rounded-lg border border-cream-dark bg-white px-3 text-base text-ink outline-none focus:border-terra';

  return (
    <form onSubmit={save} className="mt-8 rounded-2xl bg-cream p-5 text-ink">
      <h2 className="font-serif text-xl font-bold text-lazur">{t('profile.settings')}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t('profile.regionHint')}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <label className="text-sm font-semibold">
          {t('profile.name')}
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={40} className={field} />
        </label>
        <label className="text-sm font-semibold">
          {t('profile.city')}
          <select value={city} onChange={(e) => setCity(e.target.value)} className={field}>
            <option value="">{t('profile.notSet')}</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">
          {t('profile.university')}
          <select value={university} onChange={(e) => setUniversity(e.target.value)} className={field}>
            <option value="">{t('profile.notSet')}</option>
            {UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={status === 'saving'} className="inline-flex min-h-11 items-center rounded-xl bg-terra px-5 font-semibold text-white hover:bg-terra-dark disabled:opacity-50">
          {t('profile.save')}
        </button>
        {status === 'saved' && (
          <span className="flex items-center gap-1 text-sm font-semibold text-emerald">
            <Check size={16} aria-hidden /> {t('profile.saved')}
          </span>
        )}
        {status === 'error' && <span className="text-sm text-danger">{t('profile.saveError')}</span>}
      </div>
    </form>
  );
}
