// lib/sql/compare.ts — сравнение результата студента с эталоном
import { hasAliases, hasOrderBy } from './validate';

export type Cell = string | number | null;

export type QueryResult = {
  columns: string[];
  rows: Cell[][];
  truncated: boolean;
  /** Сколько строк изменил запрос (для INSERT/UPDATE/DELETE) */
  changes?: number;
};

/** Состояние таблиц после запроса изменения данных */
export type TableSnapshot = { table: string; columns: string[]; rows: Cell[][] };
export type ModifyOutcome = { changes: number; tables: TableSnapshot[] };

export type Verdict =
  | { ok: true }
  | { ok: false; code: 'columns_count'; expected: number; actual: number }
  | { ok: false; code: 'column_names'; expected: string[] }
  | { ok: false; code: 'row_count'; expected: number; actual: number }
  | { ok: false; code: 'order' }
  | { ok: false; code: 'values' }
  | { ok: false; code: 'too_many_rows' }
  | { ok: false; code: 'no_changes' }
  | { ok: false; code: 'table_rows'; table: string; expected: number; actual: number }
  | { ok: false; code: 'table_values'; table: string };

function normalizeCell(value: unknown): Cell {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Math.round(value * 1e6) / 1e6;
  if (typeof value === 'bigint') return Number(value);
  return String(value);
}

const rowKey = (row: Cell[]) => JSON.stringify(row.map(normalizeCell));

export function compareResults(solutionSql: string, expected: QueryResult, actual: QueryResult): Verdict {
  if (actual.truncated) return { ok: false, code: 'too_many_rows' };

  if (expected.columns.length !== actual.columns.length) {
    return { ok: false, code: 'columns_count', expected: expected.columns.length, actual: actual.columns.length };
  }

  if (hasAliases(solutionSql)) {
    const same = expected.columns.every((c, i) => c.toLowerCase() === actual.columns[i].toLowerCase());
    if (!same) return { ok: false, code: 'column_names', expected: expected.columns };
  }

  if (expected.rows.length !== actual.rows.length) {
    return { ok: false, code: 'row_count', expected: expected.rows.length, actual: actual.rows.length };
  }

  const expectedKeys = expected.rows.map(rowKey);
  const actualKeys = actual.rows.map(rowKey);

  if (hasOrderBy(solutionSql)) {
    if (expectedKeys.every((k, i) => k === actualKeys[i])) return { ok: true };
    // Те же строки, но в другом порядке — подскажем именно про сортировку
    const sameSet = [...expectedKeys].sort().join('\n') === [...actualKeys].sort().join('\n');
    return { ok: false, code: sameSet ? 'order' : 'values' };
  }

  const same = [...expectedKeys].sort().join('\n') === [...actualKeys].sort().join('\n');
  return same ? { ok: true } : { ok: false, code: 'values' };
}

export type RowDiff = {
  /** Таблица, если сравнивались состояния таблиц (задания на изменение данных) */
  table?: string;
  columns: string[];
  /** Строки эталона, которых нет у студента (не больше DIFF_LIMIT) */
  missing: Cell[][];
  /** Строки студента, которых нет в эталоне (не больше DIFF_LIMIT) */
  extra: Cell[][];
  missingTotal: number;
  extraTotal: number;
};

const DIFF_LIMIT = 3;

/**
 * Разница строк как мультимножеств. Показываем лишь несколько строк — достаточно,
 * чтобы понять ошибку, но не весь ответ целиком.
 */
export function diffRows(columns: string[], expected: Cell[][], actual: Cell[][], table?: string): RowDiff | null {
  const counts = new Map<string, number>();
  for (const row of actual) counts.set(rowKey(row), (counts.get(rowKey(row)) ?? 0) + 1);
  const missing: Cell[][] = [];
  for (const row of expected) {
    const key = rowKey(row);
    const n = counts.get(key) ?? 0;
    if (n > 0) counts.set(key, n - 1);
    else missing.push(row);
  }
  const left = new Map<string, number>();
  for (const row of expected) left.set(rowKey(row), (left.get(rowKey(row)) ?? 0) + 1);
  const extra: Cell[][] = [];
  for (const row of actual) {
    const key = rowKey(row);
    const n = left.get(key) ?? 0;
    if (n > 0) left.set(key, n - 1);
    else extra.push(row);
  }
  if (missing.length === 0 && extra.length === 0) return null;
  return {
    table,
    columns,
    missing: missing.slice(0, DIFF_LIMIT).map((r) => r.map(normalizeCell)),
    extra: extra.slice(0, DIFF_LIMIT).map((r) => r.map(normalizeCell)),
    missingTotal: missing.length,
    extraTotal: extra.length,
  };
}

/** Разница для неверного SELECT — только когда совпадает число столбцов */
export function selectDiff(verdict: Verdict, expected: QueryResult, actual: QueryResult): RowDiff | null {
  if (verdict.ok || !['values', 'row_count'].includes(verdict.code)) return null;
  if (expected.columns.length !== actual.columns.length) return null;
  return diffRows(expected.columns, expected.rows, actual.rows);
}

/** Разница для заданий на изменение данных — по первой таблице, где есть расхождение */
export function modifyDiff(verdict: Verdict, expected: ModifyOutcome, actual: ModifyOutcome): RowDiff | null {
  if (verdict.ok || (verdict.code !== 'table_values' && verdict.code !== 'table_rows')) return null;
  const exp = expected.tables.find((t) => t.table === verdict.table);
  const act = actual.tables.find((t) => t.table === verdict.table);
  if (!exp || !act) return null;
  return diffRows(exp.columns, exp.rows, act.rows, exp.table);
}

/** Сравнение для заданий на изменение данных: таблицы после эталона и после студента */
export function compareSnapshots(expected: ModifyOutcome, actual: ModifyOutcome): Verdict {
  if (actual.changes === 0 && expected.changes > 0) return { ok: false, code: 'no_changes' };

  for (const exp of expected.tables) {
    const act = actual.tables.find((t) => t.table === exp.table);
    if (!act) return { ok: false, code: 'table_values', table: exp.table };
    if (exp.rows.length !== act.rows.length) {
      return { ok: false, code: 'table_rows', table: exp.table, expected: exp.rows.length, actual: act.rows.length };
    }
    // Порядок строк в таблице не важен — сравниваем как множества
    const e = exp.rows.map(rowKey).sort().join('\n');
    const a = act.rows.map(rowKey).sort().join('\n');
    if (e !== a) return { ok: false, code: 'table_values', table: exp.table };
  }
  return { ok: true };
}
