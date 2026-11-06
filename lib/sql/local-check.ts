// lib/sql/local-check.ts — проверка решения прямо в браузере (статическая сборка, GitHub Pages).
// Та же логика, что у сервера (app/api/check): сравнение результата с эталоном,
// «не хватает / лишнее», подсказки по смыслу. Эталон и запрос студента выполняются
// на свежей копии базы в том же Web Worker, что и обычный запуск.
'use client';

import { compareResults, compareSnapshots, modifyDiff, selectDiff, type RowDiff, type TableSnapshot, type Verdict } from './compare';
import { diagnose, type Hint } from './diagnose';
import { resetDatabase, runSql } from './browser';
import { DEFAULT_DB, SCHEMAS, type DbName } from '../schema';

export type LocalCheckResult =
  | { verdict: Verdict; hints: Hint[]; diff: RowDiff | null }
  | { error: 'sql_error'; message: string }
  | { error: 'timeout' | 'internal' };

type CheckableTask = { topic: string; tables: string[]; solution?: string; db?: DbName };

async function snapshot(tables: string[], db: DbName): Promise<TableSnapshot[] | null> {
  const out: TableSnapshot[] = [];
  for (const table of tables) {
    const res = await runSql(`SELECT * FROM ${table}`, 'select', db);
    if (!res.ok) return null;
    out.push({ table, columns: res.result.columns, rows: res.result.rows });
  }
  return out;
}

export async function checkLocally(task: CheckableTask, sql: string): Promise<LocalCheckResult> {
  if (!task.solution) return { error: 'internal' };
  const db = task.db ?? DEFAULT_DB;
  const schema = SCHEMAS[db];

  if (task.topic === 'modify') {
    // Эталон и студент — каждый на своей свежей копии базы
    await resetDatabase(db);
    const expected = await runSql(task.solution, 'modify', db);
    const expTables = expected.ok ? await snapshot(task.tables, db) : null;
    await resetDatabase(db);
    const actual = await runSql(sql, 'modify', db);
    const actTables = actual.ok ? await snapshot(task.tables, db) : null;
    await resetDatabase(db);

    if (!actual.ok) {
      if (actual.code === 'sql_error') return { error: 'sql_error', message: actual.message };
      return { error: actual.code === 'timeout' ? 'timeout' : 'internal' };
    }
    if (!expected.ok || !expTables || !actTables) return { error: 'internal' };
    const exp = { changes: expected.result.changes ?? 0, tables: expTables };
    const act = { changes: actual.result.changes ?? 0, tables: actTables };
    const verdict = compareSnapshots(exp, act);
    return { verdict, diff: modifyDiff(verdict, exp, act), hints: verdict.ok ? [] : diagnose({ sql, schema, verdict }) };
  }

  const [expected, actual] = [await runSql(task.solution, 'select', db), await runSql(sql, 'select', db)];
  if (!actual.ok) {
    if (actual.code === 'sql_error') return { error: 'sql_error', message: actual.message };
    return { error: actual.code === 'timeout' ? 'timeout' : 'internal' };
  }
  if (!expected.ok) return { error: 'internal' };
  const verdict = compareResults(task.solution, expected.result, actual.result);
  return { verdict, diff: selectDiff(verdict, expected.result, actual.result), hints: verdict.ok ? [] : diagnose({ sql, schema, verdict }) };
}
