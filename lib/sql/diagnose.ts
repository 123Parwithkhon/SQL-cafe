// lib/sql/diagnose.ts — подсказки по смыслу ошибки вместо сухого «значения отличаются».
// Смотрит на текст запроса, сообщение SQLite и вердикт проверки и узнаёт типичные ошибки новичков.
// Работает и в браузере (ошибки SQL), и на сервере (вердикт сравнения с эталоном).
import type { Verdict } from './compare';
import { stripLiterals } from './validate';

export type HintCode =
  | 'eq_null' | 'yo' | 'double_quotes' | 'quotes_text' | 'did_you_mean' | 'unknown_column' | 'unknown_table'
  | 'aggregate_in_where' | 'missing_group_by' | 'missing_comma' | 'and_or' | 'count_star_left_join'
  | 'cartesian' | 'integer_division' | 'like_case' | 'case_sensitive' | 'no_where' | 'syntax_near'
  | 'trailing_comma' | 'incomplete' | 'ambiguous' | 'fk_failed' | 'unique_failed' | 'check_failed'
  | 'too_many' | 'too_few' | 'zero_rows' | 'not_null_compare' | 'case_null';

export type Hint = { code: HintCode; vars?: Record<string, string | number> };

type Input = {
  sql: string;
  schema: Record<string, string[]>;
  verdict?: Verdict;
  error?: string;
};

const AGG = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i;

/**
 * Расстояние между словами (Дамерау — Левенштейн, вариант OSA): перестановка двух соседних букв
 * считается одной ошибкой — «nmae» → «name» — это самая частая опечатка.
 */
function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

function closest(word: string, candidates: string[]): string | null {
  const w = word.toLowerCase();
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of new Set(candidates)) {
    const d = editDistance(w, c.toLowerCase());
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best && bestDist <= Math.max(1, Math.floor(word.length / 3)) ? best : null;
}

/** Фрагмент между ключевым словом и следующим разделом запроса */
function clause(code: string, start: RegExp, end = /\b(GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|UNION|INTERSECT|EXCEPT)\b|$/i): string | null {
  const m = start.exec(code);
  if (!m) return null;
  const rest = code.slice(m.index + m[0].length);
  const e = end.exec(rest);
  return e ? rest.slice(0, e.index) : rest;
}

export function diagnose({ sql, schema, verdict, error }: Input): Hint[] {
  const hints: Hint[] = [];
  const add = (code: HintCode, vars?: Hint['vars']) => {
    if (!hints.some((h) => h.code === code)) hints.push({ code, vars });
  };
  const code = stripLiterals(sql);
  const upper = code.toUpperCase();
  const literals = [...sql.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]);
  const tables = Object.keys(schema);
  const columns = Object.values(schema).flat();
  const failed = verdict ? !verdict.ok : Boolean(error);

  // ── Ошибки SQLite ──
  if (error) {
    const col = /no such column: ([^\s]+)/i.exec(error)?.[1];
    if (col) {
      const name = col.includes('.') ? col.split('.').pop()! : col;
      if (/[а-яё]/i.test(name) || new RegExp(`"${name}"`).test(sql)) add('quotes_text', { name });
      else {
        const guess = closest(name, columns);
        if (guess) add('did_you_mean', { name, guess });
        else add('unknown_column', { name });
      }
    }
    const table = /no such table: ([^\s]+)/i.exec(error)?.[1];
    if (table) {
      const guess = closest(table, tables);
      if (guess) add('did_you_mean', { name: table, guess });
      else add('unknown_table', { name: table, list: tables.join(', ') });
    }
    if (/misuse of aggregate/i.test(error)) add('aggregate_in_where');
    if (/incomplete input|unrecognized token/i.test(error)) add('incomplete');
    const amb = /ambiguous column name: ([^\s]+)/i.exec(error)?.[1];
    if (amb) add('ambiguous', { name: amb });
    if (/FOREIGN KEY constraint failed/i.test(error)) add('fk_failed');
    if (/UNIQUE constraint failed/i.test(error)) add('unique_failed');
    if (/CHECK constraint failed/i.test(error)) add('check_failed');
    const near = /near "([^"]+)": syntax error/i.exec(error)?.[1];
    if (near) {
      if (/,\s*FROM\b/i.test(code) && /^FROM$/i.test(near)) add('trailing_comma');
      else add('syntax_near', { token: near });
    }
  }

  // ── Узнаваемые по тексту запроса ──
  if (/(=|<>|!=)\s*NULL\b/i.test(code)) add('eq_null');
  if (literals.some((l) => /ё/i.test(l))) add('yo');
  if (/"[^"]*[а-яё][^"]*"/i.test(sql)) add('double_quotes');

  const where = clause(code, /\bWHERE\b/i);
  if (where && AGG.test(where)) add('aggregate_in_where');

  const select = clause(code, /^\s*(?:WITH\b[\s\S]*?\)\s*)?SELECT\s+(?:DISTINCT\s+)?/i, /\bFROM\b|$/i);
  if (select && AGG.test(select) && !/\bGROUP\s+BY\b/i.test(upper) && !/\bOVER\s*\(/i.test(upper)) {
    // Есть агрегат и обычный столбец рядом, а GROUP BY нет
    const parts = select.split(',').map((p) => p.trim());
    if (parts.some((p) => !AGG.test(p) && columns.some((c) => new RegExp(`^(\\w+\\.)?${c}$`, 'i').test(p.split(/\s+AS\s+/i)[0].trim())))) {
      add('missing_group_by');
    }
  }
  if (select) {
    // «SELECT name price FROM» — пропущена запятая, и price стал псевдонимом
    for (const part of select.split(',')) {
      const m = /^\s*(?:\w+\.)?(\w+)\s+(\w+)\s*$/.exec(part);
      if (m && columns.includes(m[1]) && columns.includes(m[2]) && m[2].toUpperCase() !== 'AS') add('missing_comma', { a: m[1], b: m[2] });
    }
  }

  if (failed) {
    if (where && /\bAND\b/i.test(where) && /\bOR\b/i.test(where) && !/\(/.test(where)) add('and_or');
    if (/\bLEFT\s+JOIN\b/i.test(upper) && /COUNT\s*\(\s*\*\s*\)/i.test(code) && verdict && !verdict.ok && verdict.code === 'values') add('count_star_left_join');
    const fromPart = clause(code, /\bFROM\b/i, /\b(WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT)\b|$/i) ?? '';
    const commaJoin = /,/.test(fromPart) && !where;
    const joinNoOn = /\bJOIN\b/i.test(fromPart) && !/\b(ON|USING)\b/i.test(fromPart) && !/\bCROSS\s+JOIN\b/i.test(fromPart);
    if ((commaJoin || joinNoOn) && verdict && !verdict.ok && (verdict.code === 'too_many_rows' || (verdict.code === 'row_count' && verdict.actual > verdict.expected))) add('cartesian');
    if (/\/\s*\d+(?!\.)\b|\b\d+\s*\//.test(code) && !/\d\.\d/.test(code) && verdict && !verdict.ok && verdict.code === 'values') add('integer_division');
    if (verdict && !verdict.ok && (verdict.code === 'row_count' || verdict.code === 'values')) {
      if (/\bLIKE\b/i.test(upper) && literals.some((l) => /^%?[а-яё]/.test(l)) && /\b(name)\s+LIKE\b/i.test(code)) add('like_case');
      // Имена и города в базе пишутся с большой буквы; типы и категории — с маленькой, их не трогаем
      else if (/\b(name|city|bazaar)\s*(=|IN\s*\()\s*'[а-яё]/i.test(sql) && verdict.code === 'row_count' && verdict.actual === 0) add('case_sensitive');
      // CASE без проверки IS NULL: NULL не подходит ни под одно WHEN и попадает в ELSE
      if (/\bCASE\b/i.test(upper) && !/\bIS\s+(NOT\s+)?NULL\b/i.test(upper) && !/\bCOALESCE\b/i.test(upper) && verdict.code === 'values') add('case_null');
      if (where && /(<>|!=|\bNOT\s+IN\b|\bNOT\s+LIKE\b)/i.test(where) && verdict.code === 'row_count' && verdict.actual < verdict.expected) add('not_null_compare');
    }
    if (/^\s*(UPDATE|DELETE)\b/i.test(code) && !/\bWHERE\b/i.test(upper) && verdict && !verdict.ok) add('no_where');
  }

  // ── Общие подсказки по вердикту — если ничего конкретного не нашли ──
  if (verdict && !verdict.ok && hints.length === 0) {
    if (verdict.code === 'row_count' && verdict.actual === 0) add('zero_rows');
    else if (verdict.code === 'row_count' && verdict.actual > verdict.expected) add('too_many');
    else if (verdict.code === 'row_count') add('too_few');
  }
  return hints.slice(0, 3);
}
