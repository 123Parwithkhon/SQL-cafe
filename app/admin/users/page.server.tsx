// Пользователи: поиск по имени и почте, фильтр, сортировка, страницы по 50
import Link from 'next/link';
import { listUsers, type UserSort } from '@/lib/admin';
import { Avatar } from '@/components/Avatar';
import { CreateUser } from '@/components/admin/CreateUser';

export const metadata = { title: 'Пользователи' };

type SP = Promise<{ q?: string; sort?: string; filter?: string; page?: string }>;

const SORTS: Record<UserSort, string> = { new: 'Новые', points: 'По очкам', active: 'Недавно были' };
const FILTERS = { all: 'Все', admins: 'Админы', blocked: 'Заблокированные' } as const;

export default async function AdminUsersPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const sort: UserSort = sp.sort === 'points' || sp.sort === 'active' ? sp.sort : 'new';
  const filter = sp.filter === 'admins' || sp.filter === 'blocked' ? sp.filter : 'all';
  const q = (sp.q ?? '').slice(0, 100);
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1);
  const data = await listUsers({ q, sort, filter, page });

  const href = (over: Record<string, string | number>) => {
    const p = new URLSearchParams({ q, sort, filter, page: String(page), ...Object.fromEntries(Object.entries(over).map(([k, v]) => [k, String(v)])) });
    for (const [k, v] of [...p.entries()]) if (!v || (k === 'page' && v === '1') || (k === 'sort' && v === 'new') || (k === 'filter' && v === 'all')) p.delete(k);
    const s = p.toString();
    return `/admin/users${s ? `?${s}` : ''}`;
  };

  return (
    <div className="space-y-4">
      <CreateUser />

      {/* Фильтры — над списком; обычная форма GET, работает и без JS. На телефоне — в две строки. */}
      <form className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center" action="/admin/users">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Имя или email"
          aria-label="Поиск по имени или email"
          className="col-span-2 min-h-11 w-full rounded-lg border border-gold/40 bg-panel px-3 text-base text-fg sm:w-64 sm:text-sm"
        />
        <select name="filter" defaultValue={filter} aria-label="Фильтр" className="min-h-11 rounded-lg border border-gold/40 bg-panel px-2 text-sm text-fg">
          {Object.entries(FILTERS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Сортировка" className="min-h-11 rounded-lg border border-gold/40 bg-panel px-2 text-sm text-fg">
          {Object.entries(SORTS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button type="submit" className="min-h-11 rounded-lg bg-gold px-4 text-sm font-semibold text-lazur">Найти</button>
        {/* Обычная ссылка: файл скачивается, страница остаётся */}
        <a href="/api/admin/users/export" download className="flex min-h-11 items-center justify-center rounded-lg border border-gold/40 px-3 text-sm font-semibold text-fg hover:bg-fg/5">
          Скачать CSV
        </a>
        <span className="col-span-2 text-sm text-fg/60 sm:ml-auto">Найдено: {data.total}</span>
      </form>

      {data.rows.length === 0 ? (
        <p className="rounded-xl border border-gold/30 bg-panel p-6 text-center text-fg/60">Никого не нашли.</p>
      ) : (
        <>
          {/* Телефон: карточки — всё видно без прокрутки вбок */}
          <ul className="space-y-2 md:hidden">
            {data.rows.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3 rounded-xl border border-gold/30 bg-panel p-3 active:bg-fg/5">
                  <Avatar name={u.name} image={u.image} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-semibold text-fg">{u.name}</span>
                      <Badges u={u} />
                    </span>
                    <span className="block truncate text-xs text-fg/55">{u.email ?? '—'}</span>
                    <span className="mt-0.5 block text-xs text-fg/60">
                      решено {u.solved} · {u.points} очк. · был {u.lastSeenAt ?? '—'}
                    </span>
                  </span>
                  <span className="text-fg/40" aria-hidden>›</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Компьютер: таблица */}
          <div className="hidden rounded-xl border border-gold/30 bg-panel md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-fg/60">
                <tr>
                  <th className="px-3 py-2">Пользователь</th>
                  <th className="px-3 py-2">Решено</th>
                  <th className="px-3 py-2">Очки</th>
                  <th className="px-3 py-2">Регистрация</th>
                  <th className="px-3 py-2">Был на сайте</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((u) => (
                  <tr key={u.id} className="border-t border-fg/10 hover:bg-fg/5">
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-2">
                        <Avatar name={u.name} image={u.image} size={28} />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-1.5 font-semibold text-fg">
                            {u.name}
                            <Badges u={u} />
                          </span>
                          <span className="block truncate text-xs text-fg/55">{u.email ?? '—'}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-fg">{u.solved}</td>
                    <td className="px-3 py-2 text-fg">{u.points}</td>
                    <td className="px-3 py-2 font-mono text-xs text-fg/70">{u.createdAt}</td>
                    <td className="px-3 py-2 font-mono text-xs text-fg/70">{u.lastSeenAt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.pages > 1 && (
        <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Страницы">
          {data.page > 1 && <Link href={href({ page: data.page - 1 })} className="flex min-h-11 items-center rounded-lg border border-gold/40 px-4 text-fg hover:bg-fg/5">← Назад</Link>}
          <span className="text-fg/60">{data.page} из {data.pages}</span>
          {data.page < data.pages && <Link href={href({ page: data.page + 1 })} className="flex min-h-11 items-center rounded-lg border border-gold/40 px-4 text-fg hover:bg-fg/5">Дальше →</Link>}
        </nav>
      )}
    </div>
  );
}

function Badges({ u }: { u: { role: string; isOwner: boolean; blocked: boolean } }) {
  return (
    <>
      {(u.role === 'admin' || u.isOwner) && (
        <span className="rounded bg-gold/20 px-1.5 text-[11px] font-normal text-gold-soft">{u.isOwner ? 'главный админ' : 'админ'}</span>
      )}
      {u.blocked && <span className="rounded bg-red-500/15 px-1.5 text-[11px] font-normal text-red-500">заблокирован</span>}
    </>
  );
}
