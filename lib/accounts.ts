// lib/accounts.ts — аккаунты по email и паролю: регистрация, проверка входа, сброс пароля.
// Хранятся в users с provider = 'password' и provider_id = email (в нижнем регистре).
import 'server-only';
import { query } from './db';
import { hashPassword, tempPassword, verifyPassword } from './password';
import { logAction } from './admin';

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
/** После стольких неверных паролей подряд вход по этому email закрывается на LOCK_MINUTES */
const MAX_FAILS = 8;
const LOCK_MINUTES = 15;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.replace(/\s+/g, ' ').trim();
  return name.length >= 2 && name.length <= 40 ? name : null;
}

export function validPassword(raw: unknown): raw is string {
  return typeof raw === 'string' && raw.length >= PASSWORD_MIN && raw.length <= PASSWORD_MAX;
}

export async function registerPasswordUser(name: string, email: string, password: string): Promise<'ok' | 'exists'> {
  const hash = await hashPassword(password);
  const rows = await query<{ id: string }>(
    `INSERT INTO users (provider, provider_id, name, email, password_hash, last_seen_at)
     VALUES ('password', $1, $2, $1, $3, now())
     ON CONFLICT (provider, provider_id) DO NOTHING
     RETURNING id::text AS id`,
    [email, name, hash],
  );
  return rows[0] ? 'ok' : 'exists';
}

export type LoginResult = { ok: true; name: string } | { ok: false; reason: 'wrong' | 'locked' };

export async function checkPasswordLogin(email: string, password: string): Promise<LoginResult> {
  const rows = await query<{ id: string; name: string; password_hash: string | null; locked: boolean }>(
    `SELECT id::text AS id, name, password_hash, (locked_until IS NOT NULL AND locked_until > now()) AS locked
     FROM users WHERE provider = 'password' AND provider_id = $1`,
    [email],
  );
  const user = rows[0];
  if (user?.locked) return { ok: false, reason: 'locked' };
  const ok = await verifyPassword(password, user?.password_hash ?? null);
  if (!user) return { ok: false, reason: 'wrong' };
  if (!ok) {
    await query(
      `UPDATE users SET failed_logins = failed_logins + 1,
         locked_until = CASE WHEN failed_logins + 1 >= $2 THEN now() + make_interval(mins => $3) ELSE locked_until END
       WHERE id = $1`,
      [user.id, MAX_FAILS, LOCK_MINUTES],
    );
    return { ok: false, reason: 'wrong' };
  }
  await query('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = $1', [user.id]);
  return { ok: true, name: user.name };
}

/** Новый временный пароль (администратор видит его один раз). null — у пользователя вход не по паролю. */
export async function resetPassword(adminId: string, userId: string): Promise<string | null> {
  const password = tempPassword();
  const rows = await query<{ name: string }>(
    `UPDATE users SET password_hash = $2, failed_logins = 0, locked_until = NULL
     WHERE id = $1 AND provider = 'password' RETURNING name`,
    [userId, await hashPassword(password)],
  );
  if (!rows[0]) return null;
  await logAction(adminId, 'reset_password', userId, rows[0].name);
  return password;
}

/** Смена своего пароля: нужен текущий. Неверный текущий считается неудачной попыткой входа. */
export async function changePassword(userId: string, current: string, next: string): Promise<'ok' | 'wrong' | 'locked' | 'not_password'> {
  const rows = await query<{ email: string }>(`SELECT provider_id AS email FROM users WHERE id = $1 AND provider = 'password'`, [userId]);
  if (!rows[0]) return 'not_password';
  const check = await checkPasswordLogin(rows[0].email, current);
  if (!check.ok) return check.reason;
  await query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, await hashPassword(next)]);
  return 'ok';
}

/** Администратор заводит аккаунт (например, для ученика без почты под рукой). Пароль — временный, показывается один раз. */
export async function createUserByAdmin(adminId: string, name: string, email: string): Promise<{ id: string; password: string } | 'exists'> {
  const password = tempPassword();
  const rows = await query<{ id: string }>(
    `INSERT INTO users (provider, provider_id, name, email, password_hash)
     VALUES ('password', $1, $2, $1, $3)
     ON CONFLICT (provider, provider_id) DO NOTHING
     RETURNING id::text AS id`,
    [email, name, await hashPassword(password)],
  );
  if (!rows[0]) return 'exists';
  await logAction(adminId, 'create_user', rows[0].id, `${name} <${email}>`);
  return { id: rows[0].id, password };
}
