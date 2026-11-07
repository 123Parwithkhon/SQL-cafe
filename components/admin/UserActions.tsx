'use client';

// Кнопки действий с пользователем. Права ещё раз проверяет сервер — здесь только скрываем лишнее.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ERRORS: Record<string, string> = {
  self: 'С собой так нельзя.',
  owner_protected: 'Главного администратора менять нельзя.',
  owner_only: 'Это может только главный администратор.',
  forbidden: 'Нет прав. Возможно, вас разжаловали — обновите страницу.',
  not_found: 'Пользователь не найден.',
  bad_origin: 'Запрос отклонён (другой сайт).',
};

type Props = {
  userId: string;
  name: string;
  blocked: boolean;
  role: 'user' | 'admin';
  can: { block: boolean; role: boolean; remove: boolean };
};

export function UserActions({ userId, name, blocked, role, can }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(method: 'PATCH' | 'DELETE', body?: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(ERRORS[data.error] ?? 'Не получилось. Попробуйте ещё раз.');
        return;
      }
      if (method === 'DELETE') router.push('/admin/users');
      router.refresh();
    } catch {
      setError('Нет связи с сервером.');
    } finally {
      setBusy(false);
    }
  }

  if (!can.block && !can.role && !can.remove) return null;
  const btn = 'min-h-9 rounded-lg border px-3 text-sm font-semibold transition disabled:opacity-50';

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {can.block && (
          <button
            type="button"
            disabled={busy}
            onClick={() => call('PATCH', { blocked: !blocked })}
            className={`${btn} ${blocked ? 'border-gold/50 text-fg hover:bg-fg/5' : 'border-red-400/60 text-red-500 hover:bg-red-500/10'}`}
          >
            {blocked ? 'Разблокировать' : 'Заблокировать'}
          </button>
        )}
        {can.role && (
          <button
            type="button"
            disabled={busy}
            onClick={() => call('PATCH', { role: role === 'admin' ? 'user' : 'admin' })}
            className={`${btn} border-gold/50 text-fg hover:bg-fg/5`}
          >
            {role === 'admin' ? 'Снять админа' : 'Сделать админом'}
          </button>
        )}
        {can.remove && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Удалить «${name}» навсегда? Решения и сертификаты тоже удалятся. Отменить нельзя.`)) call('DELETE');
            }}
            className={`${btn} border-red-400/60 bg-red-500/10 text-red-500 hover:bg-red-500/20`}
          >
            Удалить
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
