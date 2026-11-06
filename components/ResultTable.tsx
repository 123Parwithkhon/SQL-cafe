'use client';

import type { QueryResult } from '@/lib/sql/compare';
import { useLang } from './LangProvider';

const MAX_RENDERED_ROWS = 200;

export function ResultTable({ result, ms }: { result: QueryResult; ms?: number }) {
  const { t } = useLang();
  const shown = result.rows.slice(0, MAX_RENDERED_ROWS);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-ink-soft">
        <span>
          {result.rows.length} {t('result.rows')}
          {ms !== undefined && ` · ${ms} ${t('result.ms')}`}
        </span>
        {result.truncated && <span>{t('result.truncated')}</span>}
      </div>
      <div className="result-scroll max-h-[50vh] rounded-lg border border-cream-dark bg-white/60">
        <table className="w-full border-collapse font-mono text-sm">
          <thead className="sticky top-0 bg-cream-dark">
            <tr>
              {result.columns.map((col, i) => (
                <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-semibold text-lazur">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, r) => (
              <tr key={r} className="border-t border-cream-dark/70 odd:bg-white/40">
                {row.map((cell, c) => (
                  <td key={c} className="whitespace-nowrap px-3 py-1.5 text-ink">
                    {cell === null ? <span className="italic text-ink-soft">NULL</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.rows.length > MAX_RENDERED_ROWS && (
        <p className="mt-1 text-xs text-ink-soft">… +{result.rows.length - MAX_RENDERED_ROWS}</p>
      )}
    </div>
  );
}
