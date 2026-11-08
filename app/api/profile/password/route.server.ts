// app/api/profile/password/route.server.ts — POST { current, next }: сменить свой пароль
import { NextResponse } from 'next/server';
import { currentMember } from '@/auth';
import { changePassword, validPassword } from '@/lib/accounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const error = (code: string, status: number) => NextResponse.json({ error: code }, { status });

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  try {
    if (!origin || !host || new URL(origin).host !== host) return error('bad_origin', 403);
  } catch {
    return error('bad_origin', 403);
  }
  const user = await currentMember();
  if (!user) return error('unauthorized', 401);

  let body: { current?: unknown; next?: unknown };
  try {
    body = await request.json();
  } catch {
    return error('bad_request', 400);
  }
  if (typeof body.current !== 'string' || !body.current) return error('wrong', 403);
  if (!validPassword(body.next)) return error('invalid_password', 422);

  try {
    const result = await changePassword(user.id, body.current, body.next);
    if (result === 'ok') return NextResponse.json({ ok: true });
    return error(result, result === 'not_password' ? 400 : 403);
  } catch (err) {
    console.error('[profile] password', err);
    return error('internal', 500);
  }
}
