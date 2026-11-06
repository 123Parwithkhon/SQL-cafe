'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { LANG_COOKIE, translate, type DictKey, type Lang } from '@/lib/i18n';
import { BASE_PATH } from '@/lib/env';

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ initialLang, children }: { initialLang: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    // Кука читается сервером при следующей загрузке — без «мигания» языка
    // path = подпапка сайта: на GitHub Pages у всех проектов пользователя общий домен
    document.cookie = `${LANG_COOKIE}=${next}; path=${BASE_PATH || '/'}; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next === 'tj' ? 'tg' : 'ru';
  }, []);

  // Статическая сборка отдаёт один HTML на всех — сохранённый язык применяем после загрузки.
  // В полном режиме сервер уже прочитал cookie, и здесь ничего не меняется.
  useEffect(() => {
    const saved = new RegExp(`(?:^|; )${LANG_COOKIE}=(ru|tj)`).exec(document.cookie)?.[1] as Lang | undefined;
    if (saved && saved !== initialLang) {
      setLangState(saved);
      document.documentElement.lang = saved === 'tj' ? 'tg' : 'ru';
    }
  }, [initialLang]);

  const t = useCallback((key: DictKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang должен использоваться внутри LangProvider');
  return ctx;
}
