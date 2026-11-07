// lib/admin-guard.ts — общие проверки для API админки
import 'server-only';
import { NextResponse } from 'next/server';
import { currentAdmin } from '@/auth';
import { isOwnerEmail, type FullUser } from './stats';

export const jsonError = (code: string, status: number) => NextResponse.json({ error: code }, { status });

/**
 * Изменяющий запрос должен прийти с нашего же сайта (защита от CSRF в дополнение к SameSite-cookie).
 * Возвращает администратора или готовый ответ с ошибкой.
 */
export async function guardAdminMutation(request: Request): Promise<{ admin: FullUser } | { response: NextResponse }> {
  const origin = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  let sameSite = false;
  try {
    sameSite = Boolean(origin && host && new URL(origin).host === host);
  } catch {
    sameSite = false;
  }
  if (!sameSite) return { response: jsonError('bad_origin', 403) };
  const admin = await currentAdmin();
  if (!admin) return { response: jsonError('forbidden', 403) };
  return { admin };
}

/** Главный администратор — тот, чей email указан в ADMIN_EMAILS */
export const isOwner = (user: { email: string | null }) => isOwnerEmail(user.email);
