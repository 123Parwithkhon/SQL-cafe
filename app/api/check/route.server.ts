// app/api/check/route.ts — серверная проверка решения.
// POST { taskId: number, sql: string } → { verdict } | { error }
import { NextResponse } from 'next/server';
import { getTask } from '@/lib/tasks';
import { validateSql, MAX_SQL_LENGTH } from '@/lib/sql/validate';
import { compareResults, compareSnapshots, modifyDiff, selectDiff, type RowDiff, type Verdict } from '@/lib/sql/compare';
import { diagnose } from '@/lib/sql/diagnose';
import { DEFAULT_DB, SCHEMAS } from '@/lib/schema';
import { runModifications, runQueries } from '@/lib/sql/server-runner';
import { currentUserId } from '@/auth';
import { recordSolve } from '@/lib/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Простейший лимит: 20 проверок в минуту с одного IP (в памяти инстанса).
// CHECK_RATE_LIMIT позволяет поднять его для локальных автотестов.
const RATE_LIMIT = Number(process.env.CHECK_RATE_LIMIT) || 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 10_000) {
    for (const [key, entry] of hits) if (entry.resetAt < now) hits.delete(key);
  }
  const entry = hits.get(ip);
  if (!entry || entry.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

const error = (code: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error: code, ...extra }, { status });

type Outcome<T> = { ok: true; result: T } | { ok: false; code: string; message?: string };

/**
 * Сначала — ошибки запроса студента: таймаут потока помечает оба результата,
 * но эталон быстрый, значит виноват запрос студента.
 */
type Judged = { verdict: Verdict; diff: RowDiff | null };

function judge<T>(
  taskId: number,
  expected: Outcome<T>,
  actual: Outcome<T>,
  compare: (e: T, a: T) => Verdict,
  diff: (v: Verdict, e: T, a: T) => RowDiff | null,
): Judged | NextResponse {
  if (!actual.ok) {
    if (actual.code === 'sql_error') return error('sql_error', 422, { message: actual.message });
    if (actual.code === 'timeout') return error('timeout', 422);
    if (actual.code === 'memory') return error('memory', 422);
    if (actual.code === 'busy') return error('busy', 503);
    return error('internal', 500);
  }
  if (!expected.ok) {
    console.error(`[check] эталон задания ${taskId} не выполнился:`, expected);
    return error('internal', 500);
  }
  const verdict = compare(expected.result, actual.result);
  return { verdict, diff: diff(verdict, expected.result, actual.result) };
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local';
  if (rateLimited(ip)) return error('rate_limited', 429);

  // Запрос студента — максимум 2000 символов; огромное тело даже не разбираем
  if (Number(request.headers.get('content-length') ?? 0) > 16_384) return error('bad_request', 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error('bad_request', 400);
  }

  const { taskId, sql } = (body ?? {}) as { taskId?: unknown; sql?: unknown };
  if (!Number.isInteger(taskId) || typeof sql !== 'string' || sql.length > MAX_SQL_LENGTH) {
    return error('bad_request', 400);
  }

  const task = getTask(taskId as number);
  if (!task) return error('not_found', 404);

  const mode = task.topic === 'modify' ? 'modify' : 'select';
  const validation = validateSql(sql, mode);
  if (!validation.ok) return error('invalid_sql', 422, { code: validation.code, detail: validation.detail });

  const db = task.db ?? DEFAULT_DB;
  let outcome: Judged | NextResponse;
  if (mode === 'modify') {
    const [expected, actual] = await runModifications([task.solution, sql], task.tables, db);
    outcome = judge(task.id, expected, actual, compareSnapshots, modifyDiff);
  } else {
    const [expected, actual] = await runQueries([task.solution, sql], db);
    outcome = judge(task.id, expected, actual, (e, a) => compareResults(task.solution, e, a), selectDiff);
  }
  if (outcome instanceof NextResponse) return outcome;
  const { verdict, diff } = outcome;
  // Подсказки по смыслу ошибки — по тексту запроса и вердикту
  const hints = verdict.ok ? [] : diagnose({ sql, schema: SCHEMAS[db], verdict });

  // Верное решение вошедшего пользователя — в базу (очки, рейтинг, решения других).
  // Сбой базы не должен лишать студента вердикта.
  let saved = false;
  if (verdict.ok) {
    try {
      const userId = await currentUserId();
      if (userId) {
        await recordSolve(userId, task.id, sql);
        saved = true;
      }
    } catch (err) {
      console.error('[check] не удалось сохранить решение:', err);
    }
  }
  return NextResponse.json({ verdict, saved, hints, diff });
}
