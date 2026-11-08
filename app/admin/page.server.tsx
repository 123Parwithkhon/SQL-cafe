// Обзор: ключевые цифры, активность за 14 дней, последние действия администраторов
import Link from 'next/link';
import { getOverview, recentLog } from '@/lib/admin';
import { getLeaderboard } from '@/lib/stats';
import { DailyBars, DailyTable, StatTile } from '@/components/admin/Charts';

const ACTIONS: Record<string, string> = {
  block: 'заблокировал',
  unblock: 'разблокировал',
  make_admin: 'назначил администратором',
  remove_admin: 'снял права администратора у',
  delete_user: 'удалил пользователя',
  revoke_certificate: 'отозвал сертификат',
  export_users: 'выгрузил список пользователей',
  reset_password: 'сбросил пароль',
  create_user: 'создал пользователя',
  rename: 'переименовал',
  announcement_on: 'опубликовал объявление',
  announcement_off: 'снял объявление',
};

export default async function AdminOverviewPage() {
  const [o, log, week] = await Promise.all([getOverview(), recentLog(15), getLeaderboard('week', {})]);
  const top = week.rows.slice(0, 5);
  const pct = o.successRate7d === null ? '—' : `${Math.round(o.successRate7d * 100)}%`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Пользователей" value={String(o.users)} hint={`+${o.newUsers7d} за неделю`} />
        <StatTile label="Активны за неделю" value={String(o.activeUsers7d)} hint={o.blockedUsers ? `заблокировано: ${o.blockedUsers}` : undefined} />
        <StatTile label="Решений (с проверкой)" value={String(o.solves)} hint={`+${o.solves7d} за неделю`} />
        <StatTile label="Верных попыток за неделю" value={pct} hint={`попыток: ${o.attempts7d} · сертификатов: ${o.certificates}`} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <DailyBars title="Регистрации" points={o.daily.map((d) => ({ day: d.day, value: d.signups }))} />
        <DailyBars title="Решения" points={o.daily.map((d) => ({ day: d.day, value: d.solves }))} />
        <DailyBars title="Попытки проверки" points={o.daily.map((d) => ({ day: d.day, value: d.attempts }))} />
      </div>
      <DailyTable rows={o.daily} />

      <section>
        <h2 className="font-serif text-lg font-bold text-gold">Лучшие за неделю</h2>
        {top.length === 0 ? (
          <p className="mt-2 text-sm text-fg/60">На этой неделе ещё никто не решал задания.</p>
        ) : (
          <ol className="mt-2 divide-y divide-fg/10 rounded-xl border border-gold/30 bg-panel text-sm">
            {top.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/users/${r.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-fg/5">
                  <span className="w-5 text-right font-bold text-gold">{r.rank}</span>
                  <span className="min-w-0 flex-1 truncate text-fg">{r.name}</span>
                  <span className="whitespace-nowrap text-fg/70">{r.points} очк. · {r.solved} зад.</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <h2 className="font-serif text-lg font-bold text-gold">Журнал действий</h2>
        {log.length === 0 ? (
          <p className="mt-2 text-sm text-fg/60">Пока ни одного действия администраторов.</p>
        ) : (
          <ul className="mt-2 divide-y divide-fg/10 rounded-xl border border-gold/30 bg-panel text-sm">
            {log.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-2 px-4 py-2 text-fg/85">
                <span className="font-mono text-xs text-fg/50">{e.at}</span>
                <span className="font-semibold">{e.admin ?? 'удалённый админ'}</span>
                <span>{ACTIONS[e.action] ?? e.action}</span>
                <span className="text-fg/70">{e.details ?? e.target}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
