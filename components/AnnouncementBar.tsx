'use client';

// Объявление от администратора под шапкой. Закрытое — не показывается, пока админ не опубликует новое.
import { useEffect, useState } from 'react';
import { useLang } from './LangProvider';
import { Sparkles } from './icons';

export type AnnouncementData = { ru: string; tj: string; at: string } | null;

const KEY = 'chaikhona.announcement.closed';

export function AnnouncementBar({ data }: { data: AnnouncementData }) {
  const { lang, t } = useLang();
  // До проверки localStorage не показываем — чтобы закрытое не мигало при загрузке
  const [closed, setClosed] = useState(true);

  useEffect(() => {
    try {
      setClosed(localStorage.getItem(KEY) === data?.at);
    } catch {
      setClosed(false);
    }
  }, [data?.at]);

  if (!data || closed) return null;
  const text = (lang === 'tj' ? data.tj : data.ru) || data.ru || data.tj;

  return (
    <div role="status" className="mx-auto mt-2 max-w-6xl px-4">
      <div className="flex items-start gap-3 rounded-xl border border-gold/50 bg-gold/15 px-3 py-2.5 text-sm text-fg sm:px-4">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-gold" />
        <p className="min-w-0 flex-1 whitespace-pre-line break-words">{text}</p>
        <button
          type="button"
          onClick={() => {
            setClosed(true);
            try {
              localStorage.setItem(KEY, data.at);
            } catch {}
          }}
          aria-label={t('announcement.close')}
          className="-my-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-fg/60 hover:bg-fg/10 hover:text-fg"
        >
          ×
        </button>
      </div>
    </div>
  );
}
