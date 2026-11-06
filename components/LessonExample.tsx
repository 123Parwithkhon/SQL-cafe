'use client';

// Пример из урока: показывает SQL и выполняет его в браузере по кнопке.
// Примеры INSERT/UPDATE/DELETE выполняются на чистой копии базы, после чего база сбрасывается,
// чтобы изменения не «протекли» в задания тренажёра.
import { useState } from 'react';
import { Play } from '@/components/icons';
import type { QueryResult } from '@/lib/sql/compare';
import { resetDatabase, runSql, type BrowserRunResult } from '@/lib/sql/browser';
import type { DictKey } from '@/lib/i18n';
import type { DbName } from '@/lib/schema';
import { useLang } from './LangProvider';
import { ResultTable } from './ResultTable';

const DML = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i;

export function LessonExample({ sql, after, db = 'chaikhana' }: { sql: string; after?: string; db?: DbName }) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ data: QueryResult; ms: number } | null>(null);
  const [note, setNote] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);

  const describe = (res: Exclude<BrowserRunResult, { ok: true }>) => {
    if (res.code === 'invalid') return t(`error.${res.validation}` as DictKey, { detail: res.detail ?? '' });
    if (res.code === 'sql_error') return t('error.sql_error', { message: res.message });
    return t(`error.${res.code}` as DictKey);
  };

  async function run() {
    setBusy(true);
    setNote(null);
    setResult(null);
    try {
      if (!DML.test(sql)) {
        const res = await runSql(sql, 'select', db);
        if (res.ok) setResult({ data: res.result, ms: res.ms });
        else setNote({ kind: 'error', text: describe(res) });
        return;
      }
      await resetDatabase(db);
      const res = await runSql(sql, 'modify', db);
      if (!res.ok) {
        setNote({ kind: 'error', text: describe(res) });
        return;
      }
      setNote({ kind: 'info', text: t('task.changes', { n: res.result.changes ?? 0 }) });
      if (after) {
        const view = await runSql(after, 'select', db);
        if (view.ok) setResult({ data: view.result, ms: view.ms });
      }
    } finally {
      if (DML.test(sql)) await resetDatabase(db);
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      {/* Блок кода тёмный в обеих темах — как редактор */}
      <div className="overflow-hidden rounded-xl border border-code-line bg-code">
        <pre className="result-scroll whitespace-pre-wrap break-words p-3 font-mono text-sm text-code-text">{sql}</pre>
        {after && <pre className="whitespace-pre-wrap border-t border-code-line p-3 font-mono text-xs text-on-dark/60">{after}</pre>}
        <div className="flex items-center gap-3 border-t border-code-line px-3 py-2">
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-terra px-4 text-sm font-semibold text-white transition hover:bg-terra-dark disabled:opacity-50"
          >
            <Play size={15} className="fill-current" aria-hidden />
            {t('learn.run')}
          </button>
          {DML.test(sql) && <span className="text-xs text-on-dark/50">{t('learn.sandboxNote')}</span>}
        </div>
      </div>
      {note && (
        <p className={`mt-2 rounded-lg px-3 py-2 text-sm ${note.kind === 'error' ? 'bg-danger-soft text-danger' : 'bg-emerald-soft text-emerald'}`}>
          {note.text}
        </p>
      )}
      {result && (
        <div className="mt-2">
          <ResultTable result={result.data} ms={result.ms} />
        </div>
      )}
    </div>
  );
}
