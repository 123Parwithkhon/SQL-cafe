// lib/sql/server-runner.ts — выполнение запросов студентов на сервере.
//
// Движок — sql.js (SQLite, скомпилированный в WebAssembly), тот же, что в браузере:
//  • WASM-код прерывается worker.terminate() мгновенно. Нативный node:sqlite так не умеет —
//    поток с бесконечным запросом продолжал бы крутить CPU после «таймаута».
//  • Результаты на сервере и в браузере совпадают: одна и та же сборка SQLite.
//
// Защита: каждый запрос — в своей копии базы в отдельном потоке; таймаут; сторож памяти;
// лимит строк и размера базы; опасные функции (randomblob, zeroblob, printf) ограничены.
import 'server-only';
import { Worker } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { ModifyOutcome, QueryResult } from './compare';
import { DB_FILES, type DbName } from '../schema';

export const SERVER_TIMEOUT_MS = 3000;
export const MAX_ROWS = 1000;
const MAX_PARALLEL_WORKERS = 3;
/** На сколько поток может увеличить память процесса, прежде чем его остановят */
const MEMORY_BUDGET_BYTES = 256 * 1024 * 1024;
const MEMORY_CHECK_MS = 25;

type FailCode = 'timeout' | 'memory' | 'busy' | 'internal';
type Failure = { ok: false; code: 'sql_error'; message: string } | { ok: false; code: FailCode };
export type RunOutcome = { ok: true; result: QueryResult } | Failure;
export type ModifyRunOutcome = { ok: true; result: ModifyOutcome } | Failure;

// Файлы включены в бандл серверной функции через outputFileTracingIncludes (next.config.ts)
const SQLJS_PATH = path.join(process.cwd(), 'vendor', 'sqljs', 'sql-wasm.js');

const dbCache = new Map<DbName, Uint8Array>();
function getDbBytes(db: DbName): Uint8Array {
  let bytes = dbCache.get(db);
  if (!bytes) {
    bytes = new Uint8Array(readFileSync(path.join(process.cwd(), 'public', DB_FILES[db])));
    dbCache.set(db, bytes);
  }
  return bytes;
}

// Код потока — строкой (eval: true), чтобы бандлер Next.js его не трогал.
// mode = 'select': вернуть таблицу результата; mode = 'modify': выполнить и снять состояние таблиц.
const WORKER_CODE = `
const { parentPort, workerData } = require('node:worker_threads');
const { sqljsPath, dbBytes, mode, queries, tables, maxRows } = workerData;

const MAX_BLOB = 1000000;
function harden(db) {
  // Подмена встроенных функций, которыми можно разом выделить сотни мегабайт
  db.create_function('randomblob', (n) => {
    const size = Math.max(1, Math.min(Number(n) || 1, MAX_BLOB));
    const out = new Uint8Array(size);
    for (let i = 0; i < size; i++) out[i] = (Math.random() * 256) | 0;
    return out;
  });
  db.create_function('zeroblob', (n) => new Uint8Array(Math.max(0, Math.min(Number(n) || 0, MAX_BLOB))));
  // sql.js регистрирует функцию на число аргументов = fn.length, поэтому глушим каждую арность
  for (const name of ['printf', 'format', 'load_extension', 'readfile', 'writefile']) {
    for (let arity = 0; arity <= 8; arity++) {
      const blocked = () => { throw new Error('функция ' + name + ' отключена в тренажёре'); };
      Object.defineProperty(blocked, 'length', { value: arity });
      db.create_function(name, blocked);
    }
  }
}

const clean = (v) => (v instanceof Uint8Array ? '[BLOB]' : v);

function open(SQL) {
  const db = new SQL.Database(dbBytes);
  harden(db);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('PRAGMA max_page_count = 2000'); // ~8 МБ: INSERT из бесконечного CTE упрётся в потолок
  if (mode === 'select') db.exec('PRAGMA query_only = ON');
  return db;
}

function selectRows(db, sql) {
  const stmt = db.prepare(sql);
  try {
    const columns = stmt.getColumnNames();
    const rows = [];
    let truncated = false;
    while (stmt.step()) {
      if (rows.length >= maxRows) { truncated = true; break; }
      rows.push(stmt.get().map(clean));
    }
    return { columns, rows, truncated };
  } finally {
    stmt.free();
  }
}

const totalChanges = (db) => db.exec('SELECT total_changes()')[0].values[0][0];

require(sqljsPath)().then((SQL) => {
  const results = queries.map((sql) => {
    // Каждый запрос — в своей свежей копии базы
    const db = open(SQL);
    try {
      if (mode === 'select') return { ok: true, result: selectRows(db, sql) };
      const before = totalChanges(db);
      const stmt = db.prepare(sql);
      try { while (stmt.step()) { /* RETURNING и т.п. — просто дочитываем */ } } finally { stmt.free(); }
      const changes = totalChanges(db) - before;
      const snapshot = tables.map((table) => ({ table, ...selectRows(db, 'SELECT * FROM "' + table.replace(/"/g, '') + '"') }));
      return { ok: true, result: { changes, tables: snapshot.map(({ table, columns, rows }) => ({ table, columns, rows })) } };
    } catch (err) {
      return { ok: false, message: String((err && err.message) || err) };
    } finally {
      db.close();
    }
  });
  parentPort.postMessage({ results });
}, (err) => parentPort.postMessage({ fatal: String((err && err.message) || err) }));
`;

let activeWorkers = 0;

type WorkerReply<T> = { fatal?: string; results?: Array<{ ok: boolean; result?: T; message?: string }> };

function spawn<T>(db: DbName, workerData: Record<string, unknown>, count: number): Promise<Array<{ ok: true; result: T } | Failure>> {
  const failAll = (code: FailCode) => Array.from({ length: count }, () => ({ ok: false, code }) as const);
  if (activeWorkers >= MAX_PARALLEL_WORKERS) return Promise.resolve(failAll('busy'));
  activeWorkers++;

  return new Promise((resolve) => {
    let settled = false;
    const baseline = process.memoryUsage().rss;

    const worker = new Worker(WORKER_CODE, {
      eval: true,
      workerData: { ...workerData, sqljsPath: SQLJS_PATH, dbBytes: getDbBytes(db), maxRows: MAX_ROWS },
      resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
    });

    const finish = (outcomes: Array<{ ok: true; result: T } | Failure>) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(memoryWatch);
      // WASM прерывается мгновенно, поток и его память освобождаются
      void worker.terminate().finally(() => activeWorkers--);
      resolve(outcomes);
    };

    const timer = setTimeout(() => finish(failAll('timeout')), SERVER_TIMEOUT_MS);
    // Сторож памяти: строку можно удваивать через || в рекурсивном CTE — функциями это не закрыть
    const memoryWatch = setInterval(() => {
      if (process.memoryUsage().rss - baseline > MEMORY_BUDGET_BYTES) finish(failAll('memory'));
    }, MEMORY_CHECK_MS);

    worker.once('message', (msg: WorkerReply<T>) => {
      if (msg.fatal || !msg.results) {
        console.error('[sql-runner] не удалось запустить движок:', msg.fatal);
        finish(failAll('internal'));
        return;
      }
      finish(
        msg.results.map((r) =>
          r.ok && r.result !== undefined
            ? { ok: true, result: r.result }
            : { ok: false, code: 'sql_error', message: r.message ?? 'SQL error' },
        ),
      );
    });
    worker.once('error', (err) => {
      console.error('[sql-runner] ошибка потока:', err);
      finish(failAll('internal'));
    });
    worker.once('exit', () => finish(failAll('internal')));
  });
}

/** Выполняет несколько SELECT, каждый на своей копии базы. Результаты — в том же порядке. */
export function runQueries(queries: string[], db: DbName = 'chaikhana'): Promise<RunOutcome[]> {
  return spawn<QueryResult>(db, { mode: 'select', queries, tables: [] }, queries.length);
}

/** Выполняет каждый запрос изменения данных на исходной базе и снимает состояние таблиц */
export function runModifications(queries: string[], tables: string[], db: DbName = 'chaikhana'): Promise<ModifyRunOutcome[]> {
  return spawn<ModifyOutcome>(db, { mode: 'modify', queries, tables }, queries.length);
}
