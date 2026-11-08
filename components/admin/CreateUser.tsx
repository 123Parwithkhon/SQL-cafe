'use client';

// Админ заводит аккаунт ученику и получает временный пароль, который передаёт ему
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ERRORS: Record<string, string> = {
  invalid_name: 'Имя — от 2 до 40 символов.',
  invalid_email: 'Проверьте email.',
  exists: 'Такой email уже зарегистрирован.',
  owner_email: 'Этот email — главного администратора, его аккаунт создаётся только им самим.',
};

export function CreateUser() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; email: string; password: string } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(ERRORS[data.error] ?? 'Не получилось. Попробуйте ещё раз.');
        return;
      }
      setCreated({ id: data.id, email: email.trim().toLowerCase(), password: data.password });
      setName('');
      setEmail('');
      router.refresh();
    } catch {
      setError('Нет связи с сервером.');
    } finally {
      setBusy(false);
    }
  }

  const input = 'min-h-11 w-full rounded-lg border border-lazur-soft bg-page/60 px-3 text-base text-fg outline-none focus:border-gold';

  return (
    <details className="rounded-xl border border-gold/30 bg-panel p-4">
      <summary className="cursor-pointer font-semibold text-fg">+ Добавить пользователя</summary>
      <form onSubmit={onSubmit} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя и фамилия" aria-label="Имя" maxLength={40} className={input} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" aria-label="Email" type="email" inputMode="email" className={input} />
        <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-terra px-4 font-semibold text-white hover:bg-terra-dark disabled:opacity-50">
          Создать
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-500">{error}</p>}
      {created && (
        <div role="status" className="mt-3 rounded-lg border border-gold/50 bg-gold/10 p-3 text-sm text-fg">
          <p>
            Аккаунт создан. Передайте ученику:
            <br />
            email: <code className="select-all font-mono">{created.email}</code>
            <br />
            пароль: <code className="select-all font-mono font-bold text-gold-soft">{created.password}</code>
          </p>
          <p className="mt-1 text-xs text-fg/60">Пароль показан один раз. Ученик может сменить его в профиле.</p>
          <Link href={`/admin/users/${created.id}`} className="mt-2 inline-block text-sm font-semibold text-gold-soft underline">
            Открыть карточку
          </Link>
        </div>
      )}
    </details>
  );
}
