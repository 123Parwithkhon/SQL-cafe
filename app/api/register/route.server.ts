// app/api/register/route.server.ts — POST { name, email, password }: регистрация по email и паролю.
// После успеха браузер сразу входит через провайдер 'password' (auth.ts).
import { NextResponse } from 'next/server';
import { normalizeEmail, normalizeName, registerPasswordUser, validPassword } from '@/lib/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const error = (code: string, status: number) => NextResponse.json({ error: code }, { status });

// Простая защита от массовых регистраций с одного адреса (в пределах одного экземпляра сервера)
const recent = new Map<string, number[]>();
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;

function tooMany(ip: string): boolean {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) return true;
  list.push(now);
  recent.set(ip, list);
  if (recent.size > 5000) recent.clear();
  return false;
}

export async function POST(request: Request) {
  // Только с нашего сайта
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    if (!origin || !host || new URL(origin).host !== host) return error('bad_origin', 403);
  } catch {
    return error('bad_origin', 403);
  }
  if (Number(request.headers.get('content-length') ?? 0) > 4096) return error('bad_request', 413);

  let body: { name?: unknown; email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return error('bad_request', 400);
  }
  const name = normalizeName(body.name);
  if (!name) return error('invalid_name', 422);
  const email = normalizeEmail(body.email);
  if (!email) return error('invalid_email', 422);
  if (!validPassword(body.password)) return error('invalid_password', 422);

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (tooMany(ip)) return error('too_many', 429);

  try {
    const result = await registerPasswordUser(name, email, body.password);
    return result === 'ok' ? NextResponse.json({ ok: true }) : error('exists', 409);
  } catch (err) {
    console.error('[register]', err);
    return error('internal', 500);
  }
}
