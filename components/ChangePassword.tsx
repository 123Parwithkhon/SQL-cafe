'use client';

// Смена пароля в профиле (для аккаунтов с входом по email и паролю)
import { useState, type FormEvent } from 'react';
import { useLang } from './LangProvider';
import { KeyRound, Loader2 } from './icons';
import type { DictKey } from '@/lib/i18n';

const ERRORS: Record<string, DictKey> = {
  wrong: 'password.errCurrent',
  locked: 'auth.errLocked',
  invalid_password: 'auth.errPassword',
};

export function ChangePassword() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; key: DictKey } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (next.length < 8) return setMessage({ ok: false, key: 'auth.errPassword' });
    if (next !== confirm) return setMessage({ ok: false, key: 'auth.errConfirm' });
    setBusy(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, next }),
      });
      if (res.ok) {
        setMessage({ ok: true, key: 'password.saved' });
        setCurrent('');
        setNext('');
        setConfirm('');
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ ok: false, key: ERRORS[data.error] ?? 'auth.error' });
      }
    } catch {
      setMessage({ ok: false, key: 'auth.error' });
    } finally {
      setBusy(false);
    }
  }

  const input = 'mt-1 block min-h-11 w-full rounded-lg border border-lazur-soft bg-page/60 px-3 text-base text-fg outline-none focus:border-gold';

  return (
    <section className="mx-auto mt-6 max-w-md rounded-2xl border border-gold/30 bg-panel p-4 sm:p-5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 text-left font-semibold text-fg">
        <KeyRound size={18} className="text-gold" />
        {t('password.title')}
        <span className="ml-auto text-sm text-fg/50">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-sm text-fg/80">
            {t('password.current')}
            <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className={input} />
          </label>
          <label className="block text-sm text-fg/80">
            {t('password.new')}
            <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" placeholder={t('auth.passwordHint')} maxLength={128} className={input} />
          </label>
          <label className="block text-sm text-fg/80">
            {t('auth.confirm')}
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" maxLength={128} className={input} />
          </label>
          {message && (
            <p role={message.ok ? 'status' : 'alert'} className={`rounded-lg px-3 py-2 text-sm ${message.ok ? 'bg-emerald/20 text-fg' : 'bg-danger-soft text-danger'}`}>
              {t(message.key)}
            </p>
          )}
          <button type="submit" disabled={busy} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-terra px-4 font-semibold text-white hover:bg-terra-dark disabled:opacity-60">
            {busy && <Loader2 size={18} className="animate-spin" />}
            {t('password.submit')}
          </button>
        </form>
      )}
    </section>
  );
}
