'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MAX = 300;

export function AnnouncementForm({ initial }: { initial: { ru: string; tj: string; at: string } | null }) {
  const router = useRouter();
  const [ru, setRu] = useState(initial?.ru ?? '');
  const [tj, setTj] = useState(initial?.tj ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(nextRu: string, nextTj: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ru: nextRu, tj: nextTj }),
      });
      if (!res.ok) throw new Error();
      setMsg({ ok: true, text: nextRu || nextTj ? 'Опубликовано — его видят все.' : 'Объявление снято.' });
      router.refresh();
    } catch {
      setMsg({ ok: false, text: 'Не получилось сохранить. Попробуйте ещё раз.' });
    } finally {
      setBusy(false);
    }
  }

  const area = 'mt-1 block w-full rounded-xl border border-lazur-soft bg-page/60 px-3 py-2 text-base text-fg outline-none focus:border-gold';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save(ru.trim(), tj.trim());
      }}
      className="space-y-4 rounded-xl border border-gold/30 bg-panel p-4"
    >
      <p className="text-sm">
        Сейчас:{' '}
        {initial ? <span className="font-semibold text-emerald-soft">показывается</span> : <span className="text-fg/60">объявления нет</span>}
      </p>
      <label className="block text-sm font-semibold text-fg/90">
        Текст на русском
        <textarea value={ru} onChange={(e) => setRu(e.target.value)} maxLength={MAX} rows={3} className={area} placeholder="Например: В субботу конкурс по SQL — лучшие получат сертификаты!" />
        <span className="mt-1 block text-right text-xs font-normal text-fg/50">{ru.length}/{MAX}</span>
      </label>
      <label className="block text-sm font-semibold text-fg/90">
        Текст на таджикском <span className="font-normal text-fg/55">(если пусто — покажем русский)</span>
        <textarea value={tj} onChange={(e) => setTj(e.target.value)} maxLength={MAX} rows={3} className={area} />
        <span className="mt-1 block text-right text-xs font-normal text-fg/50">{tj.length}/{MAX}</span>
      </label>
      {msg && (
        <p role={msg.ok ? 'status' : 'alert'} className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-emerald/20 text-fg' : 'bg-danger-soft text-danger'}`}>
          {msg.text}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={busy || (!ru.trim() && !tj.trim())} className="min-h-11 flex-1 rounded-xl bg-terra px-4 font-semibold text-white hover:bg-terra-dark disabled:opacity-50">
          Опубликовать
        </button>
        {initial && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setRu('');
              setTj('');
              save('', '');
            }}
            className="min-h-11 rounded-xl border border-gold/50 px-4 font-semibold text-fg hover:bg-fg/5 disabled:opacity-50"
          >
            Снять объявление
          </button>
        )}
      </div>
    </form>
  );
}
