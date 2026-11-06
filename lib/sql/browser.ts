// lib/sql/browser.ts — клиентская обёртка над public/sql-runner.js
'use client';

import type { QueryResult } from './compare';
import { validateSql, type SqlMode, type ValidationCode } from './validate';
import { DEFAULT_DB, type DbName } from '../schema';
import { BASE_PATH } from '../env';

export const BROWSER_TIMEOUT_MS = 3000;

export type BrowserRunResult =
  | { ok: true; result: QueryResult; ms: number }
  | { ok: false; code: 'invalid'; validation: ValidationCode; detail?: string }
  | { ok: false; code: 'sql_error'; message: string }
  | { ok: false; code: 'timeout' | 'load_failed' };

type Pending = { resolve: (msg: WorkerReply) => void; timer: ReturnType<typeof setTimeout> };
type WorkerReply = { id: number; ok: boolean; result?: QueryResult; error?: string };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (worker) return worker;
  // На GitHub Pages сайт в подпапке — worker узнаёт префикс из параметра base
  worker = new Worker(`${BASE_PATH}/sql-runner.js?base=${encodeURIComponent(BASE_PATH)}`);
  worker.onmessage = (event: MessageEvent<WorkerReply>) => {
    const entry = pending.get(event.data.id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(event.data.id);
    entry.resolve(event.data);
  };
  worker.onerror = () => killWorker('load_failed');
  return worker;
}

function killWorker(reason: string) {
  worker?.terminate();
  worker = null;
  for (const [id, entry] of pending) {
    clearTimeout(entry.timer);
    entry.resolve({ id, ok: false, error: reason });
  }
  pending.clear();
}

function send(type: 'init' | 'reset' | 'exec', db: DbName, sql?: string, timeoutMs = BROWSER_TIMEOUT_MS): Promise<WorkerReply> {
  const w = getWorker();
  const id = nextId++;
  return new Promise((resolve) => {
    // Зависший запрос: убиваем worker целиком, следующий вызов создаст новый
    const timer = setTimeout(() => killWorker('timeout'), timeoutMs);
    pending.set(id, { resolve, timer });
    w.postMessage({ id, type, sql, db });
  });
}

/** Заранее грузит движок и базу (вызывать при открытии страницы задания) */
export async function preloadSql(db: DbName = DEFAULT_DB): Promise<boolean> {
  // Первая загрузка на медленном 3G может занять время — даём 30 секунд
  const reply = await send('init', db, undefined, 30_000);
  return reply.ok;
}

/** Возвращает базу в исходное состояние (и переключается на неё) */
export async function resetDatabase(db: DbName = DEFAULT_DB): Promise<void> {
  // Сначала загрузка без жёсткого таймаута: база могла ещё не скачаться
  if (await preloadSql(db)) await send('reset', db);
}

/** Выполняет запрос в браузере. mode = 'modify' разрешает INSERT/UPDATE/DELETE (песочница) */
export async function runSql(sql: string, mode: SqlMode = 'select', db: DbName = DEFAULT_DB): Promise<BrowserRunResult> {
  const validation = validateSql(sql, mode);
  if (!validation.ok) return { ok: false, code: 'invalid', validation: validation.code, detail: validation.detail };

  // Если движок или база ещё не загружены — сначала дождёмся загрузки, без жёсткого таймаута запроса
  if (!(await preloadSql(db))) return { ok: false, code: 'load_failed' };

  const started = performance.now();
  const reply = await send('exec', db, sql);
  if (reply.ok && reply.result) return { ok: true, result: reply.result, ms: Math.round(performance.now() - started) };
  if (reply.error === 'timeout') return { ok: false, code: 'timeout' };
  if (reply.error === 'load_failed' || reply.error === 'db_download_failed') return { ok: false, code: 'load_failed' };
  return { ok: false, code: 'sql_error', message: reply.error ?? 'SQL error' };
}
