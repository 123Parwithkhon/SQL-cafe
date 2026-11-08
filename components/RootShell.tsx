// Общая оболочка страницы для обоих режимов: <html>, шапка, подвал, провайдеры.
// Полный режим передаёт язык, тему и пользователя с сервера (cookies + сессия);
// статический — значения по умолчанию, а сохранённые тема и язык применяются в браузере.
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { THEME_COOKIE, translate, type Lang, type Theme } from '@/lib/i18n';
import { LangProvider } from './LangProvider';
import { AuthProvider, type AuthUser } from './AuthProvider';
import { AnnouncementBar, type AnnouncementData } from './AnnouncementBar';
import { Header } from './Header';
import { Celebration } from './Celebration';
import { OrnamentBand } from './Ornament';

// Шрифты грузит браузер (display=swap — текст виден сразу системным шрифтом).
// cyrillic-ext в PT Serif / PT Sans покрывает таджикские буквы ҳ ҷ ӣ ӯ қ ғ.
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=PT+Serif:wght@400;700&family=JetBrains+Mono:wght@400;600&display=swap';

export const siteMetadata: Metadata = {
  title: { default: 'Чайхона SQL — тренажёр SQL', template: '%s · Чайхона SQL' },
  description: 'Интерактивный тренажёр SQL на русском и таджикском. Решайте задачи на базе данных чайханы прямо в браузере.',
};

export const siteViewport: Viewport = {
  themeColor: '#1d3557',
  width: 'device-width',
  initialScale: 1,
};

/** Статическая сборка: тема из cookie ставится до отрисовки страницы, без «мигания» */
const THEME_SCRIPT = `try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);if(m)document.documentElement.dataset.theme=m[1]}catch(e){}`;

type Props = { lang: Lang; theme: Theme; user: AuthUser; announcement?: AnnouncementData; applySavedTheme?: boolean; children: ReactNode };

export function RootShell({ lang, theme, user, announcement = null, applySavedTheme = false, children }: Props) {
  return (
    <html lang={lang === 'tj' ? 'tg' : 'ru'} data-theme={theme} suppressHydrationWarning>
      <head>
        {applySavedTheme && <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body>
        <LangProvider initialLang={lang}>
          <AuthProvider user={user}>
            <Header theme={theme} />
            <AnnouncementBar data={announcement} />
            {user?.blocked && (
              <div role="status" className="mx-auto mt-2 max-w-6xl px-4">
                <p className="rounded-lg border border-red-400/50 bg-red-500/10 px-3 py-2 text-sm text-fg">{translate(lang, 'account.blocked')}</p>
              </div>
            )}
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
            <OrnamentBand className="mx-auto mt-6 max-w-6xl opacity-60" />
            <Celebration />
            <footer className="mx-auto max-w-6xl px-4 pb-8 pt-4 text-center text-xs text-fg/40">
              <p>{translate(lang, 'footer.text')}</p>
              <p className="mt-1">
                Developed by <span className="font-semibold text-gold-soft/80">Khan Service</span>
              </p>
            </footer>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
