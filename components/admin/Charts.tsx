// Плитки и маленькие графики для обзора админки.
// Один ряд на график (подпись — в заголовке, легенда не нужна), одна шкала, без двойных осей:
// регистрации, решения и попытки — разного масштаба, поэтому три отдельных графика рядом.
// Подсказка при наведении — у каждого столбца; данные можно открыть таблицей.

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-gold/30 bg-panel px-4 py-3">
      <div className="text-2xl font-bold text-fg">{value}</div>
      <div className="text-xs text-fg/60">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-fg/45">{hint}</div>}
    </div>
  );
}

type Point = { day: string; value: number };

const W = 280;
const H = 96;
const PAD_B = 16;
const GAP = 2;

/** Маленький столбчатый график за 14 дней: тонкие столбцы, скругление сверху, приглушённая ось */
export function DailyBars({ title, points }: { title: string; points: Point[] }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const plotH = H - PAD_B;
  const barW = (W - GAP * (points.length - 1)) / points.length;
  const total = points.reduce((s, p) => s + p.value, 0);
  const fmt = (day: string) => day.slice(8, 10) + '.' + day.slice(5, 7);

  return (
    <figure className="rounded-xl border border-gold/30 bg-panel p-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-fg">{title}</span>
        <span className="text-xs text-fg/60">всего за 14 дней: {total}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 block w-full" role="img" aria-label={`${title}: по дням за 14 дней, всего ${total}`}>
        <line x1="0" x2={W} y1={plotH + 0.5} y2={plotH + 0.5} stroke="currentColor" className="text-fg/20" />
        {points.map((p, i) => {
          const h = p.value === 0 ? 0 : Math.max(2, (p.value / max) * (plotH - 4));
          const x = i * (barW + GAP);
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={p.day}>
              {/* Невидимая широкая область — чтобы подсказку было легко поймать */}
              <rect x={x} y={0} width={barW} height={plotH} fill="transparent">
                <title>{`${fmt(p.day)}: ${p.value}`}</title>
              </rect>
              {h > 0 && (
                <path
                  d={`M${x},${plotH} V${plotH - h + r} Q${x},${plotH - h} ${x + r},${plotH - h} H${x + barW - r} Q${x + barW},${plotH - h} ${x + barW},${plotH - h + r} V${plotH} Z`}
                  className="fill-gold"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
        <text x="0" y={H - 3} className="fill-fg/50" fontSize="9">{fmt(points[0]?.day ?? '')}</text>
        <text x={W} y={H - 3} textAnchor="end" className="fill-fg/50" fontSize="9">{fmt(points.at(-1)?.day ?? '')}</text>
      </svg>
    </figure>
  );
}

/** Те же данные таблицей — для точных чисел и для скринридеров */
export function DailyTable({ rows }: { rows: { day: string; signups: number; solves: number; attempts: number }[] }) {
  return (
    <details className="rounded-xl border border-gold/30 bg-panel p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-fg/80">Показать таблицей</summary>
      <div className="result-scroll mt-3">
        <table className="w-full text-left">
          <thead className="text-xs text-fg/60">
            <tr>
              <th className="py-1 pr-4">День</th>
              <th className="py-1 pr-4">Регистрации</th>
              <th className="py-1 pr-4">Решения</th>
              <th className="py-1">Попытки</th>
            </tr>
          </thead>
          <tbody className="text-fg">
            {rows.map((r) => (
              <tr key={r.day} className="border-t border-fg/10">
                <td className="py-1 pr-4 font-mono text-xs">{r.day}</td>
                <td className="py-1 pr-4">{r.signups}</td>
                <td className="py-1 pr-4">{r.solves}</td>
                <td className="py-1">{r.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
