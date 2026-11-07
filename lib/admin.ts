// lib/admin.ts — запросы для админки: обзор, пользователи, задания, сертификаты, журнал.
// Каждая функция-действие пишет в admin_log: кто из администраторов, что и с кем сделал.
// Проверка прав — в вызывающем коде через currentAdmin() из auth.ts.
import 'server-only';
import { query } from './db';
import { getPublicTasks } from './tasks';
import { adminEmails } from './stats';

const DUSHANBE_DAY = (col: string) => `to_char(${col} AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD')`;

export async function logAction(adminId: string, action: string, target: string | null, details?: string) {
  await query('INSERT INTO admin_log (admin_id, action, target, details) VALUES ($1, $2, $3, $4)', [
    adminId,
    action,
    target,
    details ?? null,
  ]);
}

// ── Обзор ──

export type Overview = {
  users: number;
  newUsers7d: number;
  activeUsers7d: number;
  blockedUsers: number;
  solves: number;
  solves7d: number;
  attempts7d: number;
  successRate7d: number | null;
  certificates: number;
  /** 14 последних дней по Душанбе: регистрации, решения, попытки */
  daily: { day: string; signups: number; solves: number; attempts: number }[];
};

export async function getOverview(): Promise<Overview> {
  const [totals, daily] = await Promise.all([
    query<{
      users: number; new_users: number; active_users: number; blocked: number;
      solves: number; solves7: number; attempts7: number; ok7: number; certs: number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM users)::int AS users,
         (SELECT COUNT(*) FROM users WHERE created_at >= now() - interval '7 days')::int AS new_users,
         (SELECT COUNT(*) FROM users WHERE last_seen_at >= now() - interval '7 days')::int AS active_users,
         (SELECT COUNT(*) FROM users WHERE blocked)::int AS blocked,
         (SELECT COUNT(*) FROM solves WHERE verified)::int AS solves,
         (SELECT COUNT(*) FROM solves WHERE verified AND solved_at >= now() - interval '7 days')::int AS solves7,
         (SELECT COUNT(*) FROM attempts WHERE created_at >= now() - interval '7 days')::int AS attempts7,
         (SELECT COUNT(*) FROM attempts WHERE ok AND created_at >= now() - interval '7 days')::int AS ok7,
         (SELECT COUNT(*) FROM certificates)::int AS certs`,
    ),
    query<{ day: string; signups: number; solves: number; attempts: number }>(
      `WITH days AS (
         SELECT to_char(d, 'YYYY-MM-DD') AS day
         FROM generate_series((now() AT TIME ZONE 'Asia/Dushanbe')::date - 13, (now() AT TIME ZONE 'Asia/Dushanbe')::date, interval '1 day') AS d
       )
       SELECT days.day,
         (SELECT COUNT(*) FROM users WHERE ${DUSHANBE_DAY('created_at')} = days.day)::int AS signups,
         (SELECT COUNT(*) FROM solves WHERE verified AND ${DUSHANBE_DAY('solved_at')} = days.day)::int AS solves,
         (SELECT COUNT(*) FROM attempts WHERE ${DUSHANBE_DAY('created_at')} = days.day)::int AS attempts
       FROM days ORDER BY days.day`,
    ),
  ]);
  const t = totals[0];
  return {
    users: t.users,
    newUsers7d: t.new_users,
    activeUsers7d: t.active_users,
    blockedUsers: t.blocked,
    solves: t.solves,
    solves7d: t.solves7,
    attempts7d: t.attempts7,
    successRate7d: t.attempts7 > 0 ? t.ok7 / t.attempts7 : null,
    certificates: t.certs,
    daily,
  };
}

// ── Пользователи ──

export type AdminUserRow = {
  id: string;
  name: string;
  email: string | null;
  image: string | null;
  city: string | null;
  university: string | null;
  role: 'user' | 'admin';
  blocked: boolean;
  isOwner: boolean;
  solved: number;
  points: number;
  createdAt: string;
  lastSeenAt: string | null;
};

export type UserSort = 'new' | 'points' | 'active';
const PAGE_SIZE = 50;

export async function listUsers(opts: { q?: string; sort?: UserSort; page?: number; filter?: 'all' | 'admins' | 'blocked' }) {
  const params: unknown[] = [];
  const where: string[] = [];
  const q = opts.q?.trim().slice(0, 100);
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where.push(`(lower(u.name) LIKE $${params.length} OR lower(coalesce(u.email, '')) LIKE $${params.length})`);
  }
  if (opts.filter === 'blocked') where.push('u.blocked');
  if (opts.filter === 'admins') {
    params.push(adminEmails());
    where.push(`(u.role = 'admin' OR lower(coalesce(u.email, '')) = ANY($${params.length}::text[]))`);
  }
  const order = opts.sort === 'points' ? 'points DESC, u.id' : opts.sort === 'active' ? 'u.last_seen_at DESC NULLS LAST, u.id' : 'u.created_at DESC, u.id';
  const page = Math.max(1, Math.min(opts.page ?? 1, 1000));
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows, count] = await Promise.all([
    query<Omit<AdminUserRow, 'isOwner'>>(
      `SELECT u.id::text AS id, u.name, u.email, u.image, u.city, u.university, u.role, u.blocked,
              COALESCE(s.solved, 0)::int AS solved, COALESCE(s.points, 0)::int AS points,
              to_char(u.created_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD HH24:MI') AS "createdAt",
              to_char(u.last_seen_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD HH24:MI') AS "lastSeenAt"
       FROM users u
       LEFT JOIN (SELECT user_id, COUNT(*) FILTER (WHERE verified) AS solved, SUM(points) FILTER (WHERE verified) AS points
                  FROM solves GROUP BY user_id) s ON s.user_id = u.id
       ${whereSql}
       ORDER BY ${order}
       LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
      params,
    ),
    query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM users u ${whereSql}`, params),
  ]);
  const owners = adminEmails();
  return {
    rows: rows.map((r) => ({ ...r, isOwner: Boolean(r.email && owners.includes(r.email.toLowerCase())) })),
    total: count[0].n,
    page,
    pages: Math.max(1, Math.ceil(count[0].n / PAGE_SIZE)),
  };
}

export type AdminUserDetail = AdminUserRow & {
  solves: { taskId: number; sql: string | null; verified: boolean; points: number; solvedAt: string }[];
  certificates: { code: string; tier: string; issuedAt: string }[];
  attempts: number;
  attemptsOk: number;
  activeDays: number;
};

export async function getUserDetail(id: string): Promise<AdminUserDetail | null> {
  if (!/^\d{1,18}$/.test(id)) return null;
  const list = await query<Omit<AdminUserRow, 'isOwner'>>(
    `SELECT u.id::text AS id, u.name, u.email, u.image, u.city, u.university, u.role, u.blocked,
            (SELECT COUNT(*) FROM solves WHERE user_id = u.id AND verified)::int AS solved,
            (SELECT COALESCE(SUM(points), 0) FROM solves WHERE user_id = u.id AND verified)::int AS points,
            to_char(u.created_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD HH24:MI') AS "createdAt",
            to_char(u.last_seen_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD HH24:MI') AS "lastSeenAt"
     FROM users u WHERE u.id = $1`,
    [id],
  );
  const u = list[0];
  if (!u) return null;
  const [solves, certificates, attempts, days] = await Promise.all([
    query<{ taskId: number; sql: string | null; verified: boolean; points: number; solvedAt: string }>(
      `SELECT task_id AS "taskId", sql, verified, points,
              to_char(solved_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD HH24:MI') AS "solvedAt"
       FROM solves WHERE user_id = $1 ORDER BY solves.solved_at DESC LIMIT 200`,
      [id],
    ),
    query<{ code: string; tier: string; issuedAt: string }>(
      `SELECT code, tier, to_char(issued_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD') AS "issuedAt"
       FROM certificates WHERE user_id = $1 ORDER BY issued_at`,
      [id],
    ),
    query<{ total: number; ok: number }>(
      'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE ok)::int AS ok FROM attempts WHERE user_id = $1',
      [id],
    ),
    query<{ n: number }>('SELECT COUNT(*)::int AS n FROM activity WHERE user_id = $1', [id]),
  ]);
  return {
    ...u,
    isOwner: Boolean(u.email && adminEmails().includes(u.email.toLowerCase())),
    solves: solves.map((s) => ({ ...s, taskId: Number(s.taskId) })),
    certificates,
    attempts: attempts[0].total,
    attemptsOk: attempts[0].ok,
    activeDays: days[0].n,
  };
}

/** Блокировка и роль. Возвращает false, если пользователя нет. */
export async function updateUser(adminId: string, userId: string, change: { blocked?: boolean; role?: 'user' | 'admin' }) {
  const sets: string[] = [];
  const params: unknown[] = [userId];
  if (change.blocked !== undefined) {
    params.push(change.blocked);
    sets.push(`blocked = $${params.length}`);
  }
  if (change.role !== undefined) {
    params.push(change.role);
    sets.push(`role = $${params.length}`);
  }
  if (sets.length === 0) return true;
  const rows = await query<{ name: string }>(`UPDATE users SET ${sets.join(', ')} WHERE id = $1 RETURNING name`, params);
  if (!rows[0]) return false;
  if (change.blocked !== undefined) await logAction(adminId, change.blocked ? 'block' : 'unblock', userId, rows[0].name);
  if (change.role !== undefined) await logAction(adminId, change.role === 'admin' ? 'make_admin' : 'remove_admin', userId, rows[0].name);
  return true;
}

export async function deleteUser(adminId: string, userId: string) {
  const rows = await query<{ name: string; email: string | null }>('DELETE FROM users WHERE id = $1 RETURNING name, email', [userId]);
  if (!rows[0]) return false;
  await logAction(adminId, 'delete_user', userId, `${rows[0].name}${rows[0].email ? ` <${rows[0].email}>` : ''}`);
  return true;
}

// ── Задания ──

export type TaskStat = {
  id: number;
  title: string;
  topic: string;
  level: string;
  attempts: number;
  ok: number;
  solvers: number;
  /** Доля верных попыток; null — попыток ещё не было */
  successRate: number | null;
};

export async function getTaskStats(): Promise<TaskStat[]> {
  const [attempts, solvers] = await Promise.all([
    query<{ task_id: number; total: number; ok: number }>(
      'SELECT task_id, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE ok)::int AS ok FROM attempts GROUP BY task_id',
    ),
    query<{ task_id: number; n: number }>('SELECT task_id, COUNT(*)::int AS n FROM solves WHERE verified GROUP BY task_id'),
  ]);
  const byTask = new Map(attempts.map((a) => [Number(a.task_id), a]));
  const solvedBy = new Map(solvers.map((s) => [Number(s.task_id), s.n]));
  return getPublicTasks().map((t) => {
    const a = byTask.get(t.id);
    return {
      id: t.id,
      title: t.title_ru,
      topic: t.topic,
      level: t.level,
      attempts: a?.total ?? 0,
      ok: a?.ok ?? 0,
      solvers: solvedBy.get(t.id) ?? 0,
      successRate: a && a.total > 0 ? a.ok / a.total : null,
    };
  });
}

// ── Сертификаты ──

export type AdminCertificate = { code: string; tier: string; name: string; userId: string; email: string | null; issuedAt: string };

export async function listCertificates(): Promise<AdminCertificate[]> {
  return query<AdminCertificate>(
    `SELECT c.code, c.tier, c.name, c.user_id::text AS "userId", u.email,
            to_char(c.issued_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD HH24:MI') AS "issuedAt"
     FROM certificates c JOIN users u ON u.id = c.user_id
     ORDER BY c.issued_at DESC LIMIT 500`,
  );
}

export async function revokeCertificate(adminId: string, code: string) {
  if (!/^[A-Z0-9]{10}$/.test(code)) return false;
  const rows = await query<{ name: string; tier: string }>('DELETE FROM certificates WHERE code = $1 RETURNING name, tier', [code]);
  if (!rows[0]) return false;
  await logAction(adminId, 'revoke_certificate', code, `${rows[0].name}, ${rows[0].tier}`);
  return true;
}

// ── Журнал ──

export type LogEntry = { id: string; admin: string | null; action: string; target: string | null; details: string | null; at: string };

export async function recentLog(limit = 20): Promise<LogEntry[]> {
  return query<LogEntry>(
    `SELECT l.id::text AS id, u.name AS admin, l.action, l.target, l.details,
            to_char(l.created_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD HH24:MI') AS at
     FROM admin_log l LEFT JOIN users u ON u.id = l.admin_id
     ORDER BY l.created_at DESC LIMIT ${Math.max(1, Math.min(limit, 200))}`,
  );
}

// ── Выгрузка ──

/** Все пользователи для CSV (до 50 000 строк) */
export async function exportUsers(): Promise<Omit<AdminUserRow, 'image' | 'isOwner'>[]> {
  return query<Omit<AdminUserRow, 'image' | 'isOwner'>>(
    `SELECT u.id::text AS id, u.name, u.email, u.city, u.university, u.role, u.blocked,
            COALESCE(s.solved, 0)::int AS solved, COALESCE(s.points, 0)::int AS points,
            to_char(u.created_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD HH24:MI') AS "createdAt",
            to_char(u.last_seen_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD HH24:MI') AS "lastSeenAt"
     FROM users u
     LEFT JOIN (SELECT user_id, COUNT(*) FILTER (WHERE verified) AS solved, SUM(points) FILTER (WHERE verified) AS points
                FROM solves GROUP BY user_id) s ON s.user_id = u.id
     ORDER BY u.id LIMIT 50000`,
  );
}
