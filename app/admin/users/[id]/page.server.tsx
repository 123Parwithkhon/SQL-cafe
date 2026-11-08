// Карточка пользователя: данные, статистика, решения, сертификаты и действия администратора
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentAdmin } from '@/auth';
import { getUserDetail } from '@/lib/admin';
import { isOwnerEmail } from '@/lib/stats';
import { getTask } from '@/lib/tasks';
import { Avatar } from '@/components/Avatar';
import { StatTile } from '@/components/admin/Charts';
import { UserActions } from '@/components/admin/UserActions';

export const metadata = { title: 'Пользователь' };

const PROVIDERS: Record<string, string> = { google: 'вход через Google', password: 'вход по паролю', dev: 'тестовый вход' };

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, admin] = await Promise.all([params, currentAdmin()]);
  const u = await getUserDetail(id);
  if (!u || !admin) notFound();

  const isSelf = u.id === admin.id;
  const adminIsOwner = isOwnerEmail(admin.email);
  const targetIsAdmin = u.role === 'admin' || u.isOwner;
  // Те же правила, что и в API (там они проверяются ещё раз)
  const can = {
    block: !isSelf && !u.isOwner && (adminIsOwner || !targetIsAdmin),
    role: !isSelf && !u.isOwner && adminIsOwner,
    remove: !isSelf && !u.isOwner && adminIsOwner,
  };
  const rate = u.attempts > 0 ? `${Math.round((u.attemptsOk / u.attempts) * 100)}%` : '—';

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-sm text-fg/60 hover:text-fg">← Все пользователи</Link>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-gold/30 bg-panel p-4">
        <Avatar name={u.name} image={u.image} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl font-bold text-fg">{u.name}</h2>
            {targetIsAdmin && <span className="rounded bg-gold/20 px-1.5 text-xs text-gold-soft">{u.isOwner ? 'главный админ' : 'админ'}</span>}
            {u.blocked && <span className="rounded bg-red-500/15 px-1.5 text-xs text-red-500">заблокирован</span>}
          </div>
          <div className="text-sm text-fg/70">
            {u.email ?? 'почта не указана'}
            <span className="ml-2 rounded bg-fg/10 px-1.5 text-xs text-fg/60">{PROVIDERS[u.provider] ?? u.provider}</span>
          </div>
          <div className="text-xs text-fg/55">
            {[u.city, u.university].filter(Boolean).join(' · ') || 'город и вуз не указаны'} · с {u.createdAt}
            {u.lastSeenAt && ` · был ${u.lastSeenAt}`}
          </div>
        </div>
        <UserActions userId={u.id} name={u.name} blocked={u.blocked} role={u.role} can={{ ...can, reset: can.block && u.provider === 'password' }} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Решено заданий" value={String(u.solved)} />
        <StatTile label="Очки" value={String(u.points)} />
        <StatTile label="Верных попыток" value={rate} hint={`всего попыток: ${u.attempts}`} />
        <StatTile label="Дней с активностью" value={String(u.activeDays)} />
      </div>

      <section>
        <h3 className="font-serif text-lg font-bold text-gold">Сертификаты</h3>
        {u.certificates.length === 0 ? (
          <p className="mt-1 text-sm text-fg/60">Нет.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {u.certificates.map((c) => (
              <li key={c.code} className="rounded-lg border border-gold/30 bg-panel px-3 py-1.5">
                <Link href={`/cert/${c.code}`} className="font-mono text-gold-soft hover:underline">{c.code}</Link>
                <span className="ml-2 text-fg/70">{c.tier} · {c.issuedAt}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-serif text-lg font-bold text-gold">Решения ({u.solves.length})</h3>
        {u.solves.length === 0 ? (
          <p className="mt-1 text-sm text-fg/60">Пока ничего не решено.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {u.solves.map((s) => (
              <li key={s.taskId} className="rounded-xl border border-gold/30 bg-panel p-3">
                <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <Link href={`/trainer/${s.taskId}`} className="font-semibold text-fg hover:underline">
                    №{s.taskId} {getTask(s.taskId)?.title_ru ?? ''}
                  </Link>
                  <span className="text-fg/60">+{s.points}</span>
                  {!s.verified && <span className="text-xs text-fg/50">(не проверено сервером)</span>}
                  <span className="ml-auto font-mono text-xs text-fg/50">{s.solvedAt}</span>
                </div>
                {s.sql && <pre className="result-scroll mt-2 rounded-lg bg-fg/5 p-2 font-mono text-xs text-fg/85">{s.sql}</pre>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
