// app/api/admin/users/route.server.ts — POST { name, email }: администратор заводит аккаунт.
// Ответ — временный пароль, который админ передаёт пользователю (тот потом меняет его в профиле).
import { NextResponse } from 'next/server';
import { createUserByAdmin, normalizeEmail, normalizeName } from '@/lib/accounts';
import { isOwnerEmail } from '@/lib/stats';
import { guardAdminMutation, jsonError } from '@/lib/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const guard = await guardAdminMutation(request);
  if ('response' in guard) return guard.response;

  let body: { name?: unknown; email?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError('bad_request', 400);
  }
  const name = normalizeName(body.name);
  if (!name) return jsonError('invalid_name', 422);
  const email = normalizeEmail(body.email);
  if (!email) return jsonError('invalid_email', 422);
  // Иначе создавший узнал бы пароль главного администратора и получил бы его права
  if (isOwnerEmail(email)) return jsonError('owner_email', 403);

  try {
    const result = await createUserByAdmin(guard.admin.id, name, email);
    return result === 'exists' ? jsonError('exists', 409) : NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[admin] create user', err);
    return jsonError('internal', 500);
  }
}
