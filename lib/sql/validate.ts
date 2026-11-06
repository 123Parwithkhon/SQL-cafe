// lib/sql/validate.ts — проверка запроса до выполнения. Общая для браузера и сервера.
// Это первый рубеж защиты; второй — база, открытая только на чтение (на сервере),
// и база в памяти, которую можно сбросить (в браузере).

export const MAX_SQL_LENGTH = 2000;

export type ValidationCode = 'empty' | 'too_long' | 'multiple' | 'not_select' | 'not_allowed' | 'forbidden';

/** select — только чтение (все задания, кроме блока изменения данных); modify — песочница DML */
export type SqlMode = 'select' | 'modify';

export type ValidationResult = { ok: true } | { ok: false; code: ValidationCode; detail?: string };

// Ключевые слова, которых не может быть в запросе на чтение
const FORBIDDEN_WORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'ATTACH', 'DETACH',
  'PRAGMA', 'VACUUM', 'REINDEX', 'ANALYZE', 'BEGIN', 'COMMIT', 'ROLLBACK',
  'SAVEPOINT', 'RELEASE', 'TRANSACTION',
];

// Функции SQLite с доступом к файлам или расширениям
const FORBIDDEN_FUNCTIONS = ['LOAD_EXTENSION', 'READFILE', 'WRITEFILE', 'EDIT', 'FTS3_TOKENIZER'];

/**
 * Убирает комментарии и строковые литералы, а идентификаторы в кавычках заменяет
 * нейтральной заглушкой — чтобы `'DROP'` в строке или `"delete"` как имя столбца
 * не давали ложных срабатываний, а `/* *\/DROP` не прятал опасное слово.
 */
export function stripLiterals(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      out += ' ';
    } else if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end === -1 ? sql.length : end + 2;
      out += ' ';
    } else if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch;
      i++;
      while (i < sql.length) {
        if (sql[i] === close) {
          // Удвоенная кавычка внутри литерала — экранирование
          if (close !== ']' && sql[i + 1] === close) { i += 2; continue; }
          break;
        }
        i++;
      }
      i++;
      out += ch === "'" ? " '' " : ' _id_ ';
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

// Изменение данных разрешено только в песочнице; DDL и управление транзакциями — никогда
const DML_WORDS = ['INSERT', 'UPDATE', 'DELETE'];

/** Общая часть проверки; возвращает запрос без литералов в верхнем регистре или ошибку */
function precheck(sql: string): { ok: true; upper: string } | { ok: false; code: ValidationCode } {
  if (typeof sql !== 'string' || sql.trim() === '') return { ok: false, code: 'empty' };
  if (sql.length > MAX_SQL_LENGTH) return { ok: false, code: 'too_long' };
  const code = stripLiterals(sql).replace(/[\s;]+$/, '').trim();
  if (code === '') return { ok: false, code: 'empty' };
  if (code.includes(';')) return { ok: false, code: 'multiple' };
  return { ok: true, upper: code.toUpperCase() };
}

function findForbidden(upper: string, allowDml: boolean): ValidationResult {
  for (const word of FORBIDDEN_WORDS) {
    if (allowDml && DML_WORDS.includes(word)) continue;
    if (new RegExp(`\\b${word}\\b`).test(upper)) return { ok: false, code: 'forbidden', detail: word };
  }
  if (!allowDml && /\bREPLACE\s+INTO\b/.test(upper)) return { ok: false, code: 'forbidden', detail: 'REPLACE INTO' };
  for (const fn of FORBIDDEN_FUNCTIONS) {
    if (new RegExp(`\\b${fn}\\s*\\(`).test(upper)) return { ok: false, code: 'forbidden', detail: fn.toLowerCase() };
  }
  return { ok: true };
}

export function validateSelect(sql: string): ValidationResult {
  const pre = precheck(sql);
  if (!pre.ok) return pre;
  if (!/^(SELECT|WITH)\b/.test(pre.upper)) return { ok: false, code: 'not_select' };
  return findForbidden(pre.upper, false);
}

/** Песочница: один запрос SELECT, INSERT, UPDATE, DELETE или REPLACE (в т.ч. с WITH) */
export function validateModify(sql: string): ValidationResult {
  const pre = precheck(sql);
  if (!pre.ok) return pre;
  if (!/^(SELECT|WITH|INSERT|UPDATE|DELETE|REPLACE)\b/.test(pre.upper)) return { ok: false, code: 'not_allowed' };
  return findForbidden(pre.upper, true);
}

export function validateSql(sql: string, mode: SqlMode): ValidationResult {
  return mode === 'modify' ? validateModify(sql) : validateSelect(sql);
}

/** Убирает всё содержимое скобок — остаётся только запрос верхнего уровня */
function topLevel(sql: string): string {
  let s = stripLiterals(sql);
  while (/\([^()]*\)/.test(s)) s = s.replace(/\([^()]*\)/g, ' ');
  return s;
}

/**
 * Есть ли ORDER BY во внешнем запросе (тогда порядок строк важен при сравнении).
 * ORDER BY внутри OVER (...), подзапросов и CTE порядок результата не задаёт.
 */
export function hasOrderBy(sql: string): boolean {
  return /\bORDER\s+BY\b/i.test(topLevel(sql));
}

/** Есть ли в запросе псевдонимы AS (тогда важны и имена столбцов) */
export function hasAliases(sql: string): boolean {
  return /\bAS\b/i.test(stripLiterals(sql));
}
