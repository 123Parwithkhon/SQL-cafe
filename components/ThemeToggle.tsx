'use client';

// Переключатель «вечер / день». Тема хранится в cookie — сервер сразу отдаёт нужную, без мигания.
import { useEffect, useState } from 'react';
import { THEME_COOKIE, type Theme } from '@/lib/i18n';
import { BASE_PATH } from '@/lib/env';
import { useLang } from './LangProvider';
import { Moon, Sun } from './icons';

export function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const { t } = useLang();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  // В статической сборке тему ставит скрипт в <head> — сверяемся с ним
  useEffect(() => {
    const actual = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    if (actual !== initialTheme) setTheme(actual);
  }, [initialTheme]);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    // path = подпапка сайта: на GitHub Pages у всех проектов пользователя общий домен
    document.cookie = `${THEME_COOKIE}=${next}; path=${BASE_PATH || '/'}; max-age=31536000; samesite=lax`;
  }

  const label = theme === 'dark' ? t('theme.toLight') : t('theme.toDark');
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/40 text-gold-soft transition hover:bg-fg/5"
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
