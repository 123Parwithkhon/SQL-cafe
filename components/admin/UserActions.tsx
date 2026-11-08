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
  invalid_name: 'Имя — от 2 до 40 символов.',
  not_password_account: 'Этот пользователь входит не по паролю.',
};

type Props = {
  userId: string;
  name: string;
  blocked: boolean;
  role: 'user' | 'admin';
  can: { block: boolean; role: boolean; remove: boolean; reset?: boolean };
};

export function UserActions({ userId, name, blocked, role, can }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(name);

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
      if (body && 'resetPassword' in body) {
        const data = await res.json().catch(() => ({}));
        setNewPassword(data.password ?? null);
        return;
      }
      if (body && 'name' in body) setRenaming(false);
      if (method === 'DELETE') router.push('/admin/users');
      router.refresh();
    } catch {
      setError('Нет связи с сервером.');
    } finally {
      setBusy(false);
    }
  }

  if (!can.block && !can.role && !can.remove && !can.reset) return null;
  const btn = 'min-h-11 rounded-lg border px-3 text-sm font-semibold transition disabled:opacity-50 sm:min-h-9';

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      {/* Телефон: кнопки в две колонки на всю ширину; компьютер — в строку справа */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
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
        {can.block && (
          <button type="button" disabled={busy} onClick={() => setRenaming((v) => !v)} className={`${btn} border-gold/50 text-fg hover:bg-fg/5`}>
            Переименовать
          </button>
        )}
        {can.reset && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Выдать «${name}» новый временный пароль? Старый перестанет работать.`)) call('PATCH', { resetPassword: true });
            }}
            className={`${btn} border-gold/50 text-fg hover:bg-fg/5`}
          >
            Сбросить пароль
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
      {renaming && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            call('PATCH', { name: newName });
          }}
          className="flex gap-2"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={40}
            aria-label="Новое имя"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-lazur-soft bg-page/60 px-3 text-base text-fg outline-none focus:border-gold sm:w-56"
          />
          <button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-terra px-3 text-sm font-semibold text-white disabled:opacity-50">
            Сохранить
          </button>
        </form>
      )}
      {newPassword && (
        <p role="status" className="rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-sm text-fg sm:max-w-xs sm:text-right">
          Новый пароль: <code className="select-all font-mono font-bold text-gold-soft">{newPassword}</code>
          <br />
          <span className="text-xs text-fg/60">Передайте его пользователю — больше он показан не будет.</span>
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
