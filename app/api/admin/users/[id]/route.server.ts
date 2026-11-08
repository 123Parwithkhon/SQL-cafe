// app/api/admin/users/[id]/route.server.ts — действия администратора с пользователем
// PATCH { blocked?: boolean, role?: 'user' | 'admin' } | { resetPassword: true } | { name }   DELETE — удалить пользователя
//
// Правила:
//  • с самим собой ничего сделать нельзя;
//  • главных администраторов (ADMIN_EMAILS) нельзя заблокировать, разжаловать или удалить;
//  • назначать и снимать администраторов, удалять пользователей могут только главные администраторы;
//  • обычный администратор может только блокировать и разблокировать обычных пользователей.
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/stats';
import { deleteUser, renameUser, updateUser } from '@/lib/admin';
import { normalizeName, resetPassword } from '@/lib/accounts';
import { guardAdminMutation, isOwner, jsonError } from '@/lib/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

async function loadTarget(raw: string) {
  return /^\d{1,18}$/.test(raw) ? getUser(raw) : null;
}

export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await guardAdminMutation(request);
  if ('response' in guard) return guard.response;
  const { admin } = guard;

  const target = await loadTarget((await params).id);
  if (!target) return jsonError('not_found', 404);
  if (target.id === admin.id) return jsonError('self', 400);
  if (isOwner(target)) return jsonError('owner_protected', 403);

  let body: { blocked?: unknown; role?: unknown; resetPassword?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError('bad_request', 400);
  }

  // Переименование (модерация) — по тем же правилам, что и блокировка
  if (body.name !== undefined) {
    const name = normalizeName(body.name);
    if (!name) return jsonError('invalid_name', 422);
    if (target.isAdmin && !isOwner(admin)) return jsonError('owner_only', 403);
    try {
      await renameUser(admin.id, target.id, name);
      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error('[admin] rename', err);
      return jsonError('internal', 500);
    }
  }

  // Сброс пароля — по тем же правилам, что и блокировка. Новый пароль показывается админу один раз.
  if (body.resetPassword === true) {
    if (target.isAdmin && !isOwner(admin)) return jsonError('owner_only', 403);
    try {
      const password = await resetPassword(admin.id, target.id);
      return password ? NextResponse.json({ ok: true, password }) : jsonError('not_password_account', 400);
    } catch (err) {
      console.error('[admin] reset password', err);
      return jsonError('internal', 500);
    }
  }
  const change: { blocked?: boolean; role?: 'user' | 'admin' } = {};
  if (body.blocked !== undefined) {
    if (typeof body.blocked !== 'boolean') return jsonError('bad_request', 400);
    // Обычный админ не может блокировать других админов
    if (target.isAdmin && !isOwner(admin)) return jsonError('owner_only', 403);
    change.blocked = body.blocked;
  }
  if (body.role !== undefined) {
    if (body.role !== 'user' && body.role !== 'admin') return jsonError('bad_request', 400);
    if (!isOwner(admin)) return jsonError('owner_only', 403);
    change.role = body.role;
  }

  try {
    await updateUser(admin.id, target.id, change);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin] PATCH user', err);
    return jsonError('internal', 500);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  const guard = await guardAdminMutation(request);
  if ('response' in guard) return guard.response;
  const { admin } = guard;

  const target = await loadTarget((await params).id);
  if (!target) return jsonError('not_found', 404);
  if (target.id === admin.id) return jsonError('self', 400);
  if (isOwner(target)) return jsonError('owner_protected', 403);
  if (!isOwner(admin)) return jsonError('owner_only', 403);

  try {
    await deleteUser(admin.id, target.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin] DELETE user', err);
    return jsonError('internal', 500);
  }
}
