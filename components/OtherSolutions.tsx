'use client';

// «Решения других» — открываются после собственного решения. Сначала самые короткие.
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, LogIn, MapPin, Users } from '@/components/icons';
import { useLang } from './LangProvider';
import { useAuthUser } from './AuthProvider';
import { Avatar } from './Avatar';

type Solution = { name: string; city: string | null; sql: string; solvedAt: string };

export function OtherSolutions({ taskId }: { taskId: number }) {
  const { t } = useLang();
  const user = useAuthUser();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ status: 'idle' | 'loading' | 'error' } | { status: 'done'; items: Solution[] }>({ status: 'idle' });

  if (!user) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/40 bg-panel px-4 py-3 text-sm text-fg/80">
        <Users size={18} className="shrink-0 text-gold" aria-hidden />
        <span className="min-w-0 flex-1">{t('task.solutionsLogin')}</span>
        <Link href={`/auth?next=/trainer/${taskId}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-terra px-3 font-semibold text-white hover:bg-terra-dark">
          <LogIn size={16} aria-hidden />
          {t('auth.signIn')}
        </Link>
      </div>
    );
  }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || state.status === 'done' || state.status === 'loading') return;
    setState({ status: 'loading' });
    try {
      const response = await fetch(`/api/tasks/${taskId}/solutions`);
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as { solutions: Solution[] };
      setState({ status: 'done', items: data.solutions });
    } catch {
      setState({ status: 'error' });
    }
  }

  return (
    <div className="rounded-xl border border-gold/40 bg-panel">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex min-h-12 w-full items-center gap-2 px-4 text-left font-semibold text-gold-soft">
        <Users size={18} aria-hidden />
        {t('task.solutions')}
        <ChevronDown size={18} className={`ml-auto transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div className="space-y-3 border-t border-gold/20 p-4">
          {state.status === 'loading' && <p className="text-sm text-fg/60">…</p>}
          {state.status === 'error' && <p className="text-sm text-danger-soft">{t('task.solutionsError')}</p>}
          {state.status === 'done' && state.items.length === 0 && <p className="text-sm text-fg/70">{t('task.solutionsEmpty')}</p>}
          {state.status === 'done' &&
            state.items.map((s, i) => (
              <div key={i}>
                <div className="mb-1 flex items-center gap-2 text-xs text-fg/70">
                  <Avatar name={s.name} size={20} />
                  <span className="font-semibold text-fg">{s.name}</span>
                  {s.city && (
                    <span className="flex items-center gap-0.5">
                      <MapPin size={11} aria-hidden />
                      {s.city}
                    </span>
                  )}
                  <span className="ml-auto">{s.solvedAt}</span>
                </div>
                {/* Текст решения — обычный текст, не HTML: React экранирует его сам */}
                <pre className="result-scroll whitespace-pre-wrap break-words rounded-lg bg-code p-3 font-mono text-sm text-code-text">{s.sql}</pre>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
