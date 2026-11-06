'use client';

// Разбор ошибки: подсказки по смыслу и таблица «Не хватает / Лишнее»
import type { Hint } from '@/lib/sql/diagnose';
import type { Cell, RowDiff } from '@/lib/sql/compare';
import type { DictKey } from '@/lib/i18n';
import { useLang } from './LangProvider';
import { Lightbulb } from './icons';

export function HintList({ hints }: { hints: Hint[] }) {
  const { t } = useLang();
  if (hints.length === 0) return null;
  return (
    <ul className="space-y-2">
      {hints.map((hint) => (
        <li key={hint.code} className="flex gap-2 rounded-xl border-l-4 border-gold bg-panel px-4 py-3 text-sm text-fg">
          <Lightbulb size={18} className="mt-0.5 shrink-0 text-gold" />
          <span>{t(`diag.${hint.code}` as DictKey, hint.vars)}</span>
        </li>
      ))}
    </ul>
  );
}

function MiniTable({ columns, rows, tone }: { columns: string[]; rows: Cell[][]; tone: 'missing' | 'extra' }) {
  return (
    <div className="result-scroll rounded-lg border border-cream-dark bg-white/70">
      <table className="w-full border-collapse font-mono text-xs">
        <thead className={tone === 'missing' ? 'bg-emerald-soft' : 'bg-danger-soft'}>
          <tr>
            {columns.map((c, i) => <th key={i} className="whitespace-nowrap px-2 py-1.5 text-left font-semibold text-ink">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="border-t border-cream-dark/70">
              {row.map((cell, c) => (
                <td key={c} className="whitespace-nowrap px-2 py-1 text-ink">
                  {cell === null ? <span className="italic text-ink-soft">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DiffView({ diff }: { diff: RowDiff }) {
  const { t } = useLang();
  return (
    <div className="space-y-3 rounded-2xl bg-cream p-4 text-ink">
      <p className="text-sm font-semibold text-lazur">
        {diff.table ? t('diff.titleTable', { table: diff.table }) : t('diff.title')}
      </p>
      {diff.missing.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-emerald">
            {t('diff.missing', { n: diff.missingTotal })}
            {diff.missingTotal > diff.missing.length && ` ${t('diff.firstN', { n: diff.missing.length })}`}
          </p>
          <MiniTable columns={diff.columns} rows={diff.missing} tone="missing" />
        </div>
      )}
      {diff.extra.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-danger">
            {t('diff.extra', { n: diff.extraTotal })}
            {diff.extraTotal > diff.extra.length && ` ${t('diff.firstN', { n: diff.extra.length })}`}
          </p>
          <MiniTable columns={diff.columns} rows={diff.extra} tone="extra" />
        </div>
      )}
    </div>
  );
}
