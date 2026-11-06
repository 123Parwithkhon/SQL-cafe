'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Award, BookOpen, Flame, ListChecks, LogIn, Terminal, Trophy, type IconComponent } from '@/components/icons';
import { IS_STATIC } from '@/lib/env';
import { LANGS, type Theme } from '@/lib/i18n';
import { ThemeToggle } from './ThemeToggle';
import { OrnamentBand } from './Ornament';
import { useProgress } from '@/lib/progress';
import { useLang } from './LangProvider';
import { useAuthUser } from './AuthProvider';
import { Avatar } from './Avatar';
import { PishtaqMark } from './Pishtaq';

export function Header({ theme }: { theme: Theme }) {
  const { lang, setLang, t } = useLang();
  const { streak, loaded } = useProgress();
  const user = useAuthUser();
  const pathname = usePathname();

  const navLink = (href: string, label: string, Icon: IconComponent) => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return (
      <Link
        href={href}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-sm transition sm:px-2.5 ${
          active ? 'bg-fg/10 text-gold-soft' : 'text-fg/80 hover:text-fg'
        }`}
      >
        <Icon size={18} strokeWidth={1.8} aria-hidden />
        {/* На телефоне — только иконки, иначе шапка не помещается */}
        <span className="hidden md:inline">{label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 bg-page/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-1.5 px-4 py-2.5 sm:gap-2">
        <Link href="/" aria-label={t('brand')} className="flex shrink-0 items-center gap-2 sm:mr-1">
          <PishtaqMark />
          <span className="hidden whitespace-nowrap font-serif text-lg font-bold text-fg sm:inline">{t('brand')}</span>
        </Link>

        <nav className="flex min-w-0 items-center gap-0.5 sm:gap-1">
          {navLink('/learn', t('nav.learn'), BookOpen)}
          {navLink('/trainer', t('nav.trainer'), ListChecks)}
          {navLink('/playground', t('nav.playground'), Terminal)}
          {/* Рейтингу нужен сервер — в статической сборке (GitHub Pages) его нет */}
          {!IS_STATIC && navLink('/leaderboard', t('nav.leaderboard'), Trophy)}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* На телефоне streak не показываем — он есть в тренажёре и профиле, а место в шапке нужнее */}
          {loaded && streak > 0 && (
            <span title={t('progress.streak')} className="hidden items-center gap-1 whitespace-nowrap rounded-full bg-gold/20 px-2 py-0.5 text-sm font-semibold text-gold-soft sm:flex">
              <Flame size={15} strokeWidth={2} aria-hidden />
              {streak}
            </span>
          )}
          <div role="group" aria-label="Язык / Забон" className="flex overflow-hidden rounded-lg border border-gold/40 text-xs font-semibold">
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                aria-pressed={lang === code}
                className={`min-h-9 px-2 uppercase transition sm:px-2.5 ${lang === code ? 'bg-gold text-lazur' : 'text-fg/80 hover:bg-fg/5'}`}
              >
                {code === 'ru' ? 'RU' : 'TJ'}
              </button>
            ))}
          </div>
          <ThemeToggle initialTheme={theme} />
          {user ? (
            <Link href="/profile" aria-label={t('nav.profile')} title={user.name} className="rounded-full ring-gold/60 transition hover:ring-2">
              <Avatar name={user.name} image={user.image} size={32} />
            </Link>
          ) : IS_STATIC ? (
            // Без сервера входа нет — ведём в профиль с прогрессом на этом устройстве
            <Link
              href="/profile"
              aria-label={t('nav.profile')}
              className="flex min-h-9 items-center gap-1.5 rounded-lg border border-gold/40 px-2.5 text-sm font-semibold text-gold-soft transition hover:bg-fg/5"
            >
              <Award size={16} strokeWidth={2} />
              <span className="hidden sm:inline">{t('nav.profile')}</span>
            </Link>
          ) : (
            <Link
              href="/auth"
              aria-label={t('auth.signIn')}
              className="flex min-h-9 items-center gap-1.5 rounded-lg bg-terra px-2.5 text-sm font-semibold text-white transition hover:bg-terra-dark"
            >
              <LogIn size={16} strokeWidth={2} aria-hidden />
              <span className="hidden sm:inline">{t('auth.signIn')}</span>
            </Link>
          )}
        </div>
      </div>
      {/* Орнаментальная лента вместо простой линии под шапкой */}
      <OrnamentBand />
    </header>
  );
}
