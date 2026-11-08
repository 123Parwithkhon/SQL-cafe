// Задания: где ученики спотыкаются. Сортировка — от самых трудных (меньше доля верных попыток).
// Доля — одна величина, поэтому одна шкала и один цвет; число всегда подписано текстом.
import Link from 'next/link';
import { getTaskStats, type TaskStat } from '@/lib/admin';

export const metadata = { title: 'Задания' };

const LEVEL: Record<string, string> = { easy: 'лёгкое', medium: 'среднее', hard: 'сложное' };
/** Меньше попыток — доля ненадёжна, такие задания идут после остальных */
const MIN_ATTEMPTS = 5;

function RateBar({ t }: { t: TaskStat }) {
  const pct = t.successRate === null ? null : Math.round(t.successRate * 100);
  if (pct === null) return <span className="text-fg/40">ещё не пробовали</span>;
  return (
    <div className="flex items-center gap-2" title={`${t.ok} из ${t.attempts} попыток верные`}>
      <div className="h-2 flex-1 rounded-full bg-fg/10">
        <div className="h-2 rounded-full bg-gold" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <span className={`w-10 text-right tabular-nums ${t.attempts < MIN_ATTEMPTS ? 'text-fg/45' : 'text-fg'}`}>{pct}%</span>
    </div>
  );
}

export default async function AdminTasksPage() {
  const stats = await getTaskStats();
  const reliable = stats.filter((t) => t.attempts >= MIN_ATTEMPTS).sort((a, b) => (a.successRate ?? 1) - (b.successRate ?? 1));
  const rest = stats.filter((t) => t.attempts < MIN_ATTEMPTS).sort((a, b) => b.attempts - a.attempts || a.id - b.id);
  const rows = [...reliable, ...rest];
  const neverTried = stats.filter((t) => t.attempts === 0).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg/70">
        Сверху — задания, где меньше всего верных попыток (из тех, где попыток не меньше {MIN_ATTEMPTS}).
        Ещё никто не пробовал: {neverTried} из {stats.length}.
      </p>

      {/* Телефон: карточки */}
      <ul className="space-y-2 md:hidden">
        {rows.map((t) => (
          <li key={t.id} className="rounded-xl border border-gold/30 bg-panel p-3">
            <Link href={`/trainer/${t.id}`} className="font-semibold text-fg">
              <span className="text-fg/50">№{t.id}</span> {t.title}
            </Link>
            <div className="mt-0.5 text-xs text-fg/55">
              {t.topic} · {LEVEL[t.level] ?? t.level} · попыток {t.attempts} · решили {t.solvers}
            </div>
            <div className="mt-2 text-sm">
              <RateBar t={t} />
            </div>
          </li>
        ))}
      </ul>

      {/* Компьютер: таблица */}
      <div className="hidden rounded-xl border border-gold/30 bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-fg/60">
            <tr>
              <th className="px-3 py-2">Задание</th>
              <th className="px-3 py-2">Уровень</th>
              <th className="px-3 py-2">Попыток</th>
              <th className="px-3 py-2">Решили</th>
              <th className="w-48 px-3 py-2">Верных попыток</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-fg/10 hover:bg-fg/5">
                <td className="px-3 py-2">
                  <Link href={`/trainer/${t.id}`} className="text-fg hover:underline">
                    <span className="text-fg/50">№{t.id}</span> {t.title}
                  </Link>
                  <div className="text-xs text-fg/50">{t.topic}</div>
                </td>
                <td className="px-3 py-2 text-fg/80">{LEVEL[t.level] ?? t.level}</td>
                <td className="px-3 py-2 text-fg">{t.attempts}</td>
                <td className="px-3 py-2 text-fg">{t.solvers}</td>
                <td className="px-3 py-2">
                  <RateBar t={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
