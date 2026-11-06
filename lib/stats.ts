// lib/stats.ts — запросы к базе платформы: решения, прогресс, рейтинг, профиль
import 'server-only';
import { randomBytes } from 'node:crypto';
import { query } from './db';
import { getPublicTasks, getTask, type Level } from './tasks';
import { TIERS, type Tier } from './course';

export const POINTS: Record<Level, number> = { easy: 10, medium: 20, hard: 30 };

/** Начало текущей недели (понедельник 00:00 по Душанбе) как timestamptz */
const WEEK_START = `(date_trunc('week', now() AT TIME ZONE 'Asia/Dushanbe') AT TIME ZONE 'Asia/Dushanbe')`;
const TODAY = `(now() AT TIME ZONE 'Asia/Dushanbe')::date`;

export type PublicUser = { id: string; name: string; image: string | null; city: string | null; university: string | null };

export async function upsertUser(provider: string, providerId: string, name: string, image: string | null): Promise<string> {
  const safeName = (name || 'Гость').trim().slice(0, 60) || 'Гость';
  // Имя обновляем только при создании: пользователь мог поменять его в профиле
  const rows = await query<{ id: string }>(
    `INSERT INTO users (provider, provider_id, name, image) VALUES ($1, $2, $3, $4)
     ON CONFLICT (provider, provider_id) DO UPDATE SET image = COALESCE(EXCLUDED.image, users.image)
     RETURNING id::text AS id`,
    [provider, providerId, safeName, image],
  );
  return rows[0].id;
}

export async function getUser(userId: string): Promise<PublicUser | null> {
  const rows = await query<PublicUser>(
    'SELECT id::text AS id, name, image, city, university FROM users WHERE id = $1',
    [userId],
  );
  return rows[0] ?? null;
}

export async function updateProfile(userId: string, data: { name: string; city: string | null; university: string | null }) {
  await query('UPDATE users SET name = $2, city = $3, university = $4 WHERE id = $1', [userId, data.name, data.city, data.university]);
}

/** Засчитывает решение, проверенное сервером. Время первого решения сохраняется. */
export async function recordSolve(userId: string, taskId: number, sql: string) {
  const task = getTask(taskId);
  if (!task) return;
  await query(
    `INSERT INTO solves (user_id, task_id, sql, points, verified) VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (user_id, task_id) DO UPDATE SET
       sql = EXCLUDED.sql,
       points = EXCLUDED.points,
       solved_at = CASE WHEN solves.verified THEN solves.solved_at ELSE now() END,
       verified = true`,
    [userId, taskId, sql.slice(0, 2000), POINTS[task.level]],
  );
  await query(`INSERT INTO activity (user_id, day) VALUES ($1, ${TODAY}) ON CONFLICT DO NOTHING`, [userId]);
}

/**
 * Перенос прогресса из браузера при первом входе. Такие решения не проверены сервером,
 * поэтому очков не дают — но отмечаются решёнными и открывают «решения других».
 */
export async function importProgress(userId: string, taskIds: number[], days: string[]) {
  const ids = [...new Set(taskIds)].filter((id) => Number.isInteger(id) && getTask(id)).slice(0, 500);
  const validDays = [...new Set(days)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-400);
  if (ids.length) {
    await query(
      `INSERT INTO solves (user_id, task_id, verified, points)
       SELECT $1, unnest($2::int[]), false, 0 ON CONFLICT DO NOTHING`,
      [userId, ids],
    );
  }
  if (validDays.length) {
    await query(
      `INSERT INTO activity (user_id, day)
       SELECT $1, d::date FROM unnest($2::text[]) AS d WHERE d::date <= ${TODAY} ON CONFLICT DO NOTHING`,
      [userId, validDays],
    );
  }
}

export async function getProgress(userId: string): Promise<{ solved: number[]; days: string[] }> {
  const [solved, days] = await Promise.all([
    query<{ task_id: number }>('SELECT task_id FROM solves WHERE user_id = $1', [userId]),
    query<{ day: string }>(`SELECT to_char(day, 'YYYY-MM-DD') AS day FROM activity WHERE user_id = $1 ORDER BY day`, [userId]),
  ]);
  return { solved: solved.map((r) => Number(r.task_id)), days: days.map((r) => r.day) };
}

export type Period = 'week' | 'all';
export type LeaderRow = PublicUser & { rank: number; points: number; solved: number };

/** Рейтинг: очки только за решения, проверенные сервером. При равенстве выше тот, кто набрал раньше. */
export async function getLeaderboard(
  period: Period,
  filters: { city?: string | null; university?: string | null },
  meId?: string | null,
): Promise<{ rows: LeaderRow[]; me: LeaderRow | null }> {
  const params: unknown[] = [];
  const where = ['s.verified'];
  if (period === 'week') where.push(`s.solved_at >= ${WEEK_START}`);
  if (filters.city) {
    params.push(filters.city);
    where.push(`u.city = $${params.length}`);
  }
  if (filters.university) {
    params.push(filters.university);
    where.push(`u.university = $${params.length}`);
  }
  const ranked = `
    SELECT u.id::text AS id, u.name, u.image, u.city, u.university,
           SUM(s.points)::int AS points, COUNT(*)::int AS solved,
           ROW_NUMBER() OVER (ORDER BY SUM(s.points) DESC, MAX(s.solved_at) ASC)::int AS rank
    FROM solves s JOIN users u ON u.id = s.user_id
    WHERE ${where.join(' AND ')}
    GROUP BY u.id`;
  const rows = await query<LeaderRow>(`${ranked} ORDER BY rank LIMIT 50`, params);
  let me = rows.find((r) => r.id === meId) ?? null;
  if (meId && !me) {
    params.push(meId);
    me = (await query<LeaderRow>(`SELECT * FROM (${ranked}) r WHERE r.id = $${params.length}`, params))[0] ?? null;
  }
  return { rows, me };
}

export type ProfileStats = {
  points: number;
  weekPoints: number;
  solved: number;
  verified: number;
  rankAll: number | null;
  recent: { taskId: number; solvedAt: string }[];
};

export async function getProfileStats(userId: string): Promise<ProfileStats> {
  const [totals, recent, rank] = await Promise.all([
    query<{ points: number; week_points: number; solved: number; verified: number }>(
      `SELECT COALESCE(SUM(points) FILTER (WHERE verified), 0)::int AS points,
              COALESCE(SUM(points) FILTER (WHERE verified AND solved_at >= ${WEEK_START}), 0)::int AS week_points,
              COUNT(*)::int AS solved,
              COUNT(*) FILTER (WHERE verified)::int AS verified
       FROM solves WHERE user_id = $1`,
      [userId],
    ),
    query<{ task_id: number; solved_at: string }>(
      `SELECT task_id, to_char(solved_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD HH24:MI') AS solved_at
       FROM solves WHERE user_id = $1 AND verified ORDER BY solves.solved_at DESC LIMIT 8`,
      [userId],
    ),
    getLeaderboard('all', {}, userId),
  ]);
  const t = totals[0];
  return {
    points: t.points,
    weekPoints: t.week_points,
    solved: t.solved,
    verified: t.verified,
    rankAll: rank.me?.rank ?? null,
    recent: recent.map((r) => ({ taskId: Number(r.task_id), solvedAt: r.solved_at })),
  };
}

// ── Сертификаты ──

/** Без похожих символов (0/O, 1/I), чтобы код было легко продиктовать */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode(): string {
  const bytes = randomBytes(10);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

function tierTaskIds(tier: Tier): number[] {
  const topics = TIERS.find((t) => t.id === tier)?.topics ?? [];
  return getPublicTasks().filter((task) => topics.includes(task.topic)).map((task) => task.id);
}

export type CertificateStatus = { tier: Tier; total: number; verified: number; code: string | null };

/** По каждому уровню: сколько заданий решено с проверкой сервера и выдан ли сертификат */
export async function getCertificateStatus(userId: string): Promise<CertificateStatus[]> {
  const [solved, certs] = await Promise.all([
    query<{ task_id: number }>('SELECT task_id FROM solves WHERE user_id = $1 AND verified', [userId]),
    query<{ tier: string; code: string }>('SELECT tier, code FROM certificates WHERE user_id = $1', [userId]),
  ]);
  const verified = new Set(solved.map((r) => Number(r.task_id)));
  return TIERS.map((tier) => {
    const ids = tierTaskIds(tier.id);
    return {
      tier: tier.id,
      total: ids.length,
      verified: ids.filter((id) => verified.has(id)).length,
      code: certs.find((c) => c.tier === tier.id)?.code ?? null,
    };
  });
}

/** Выдаёт сертификат, если все задания уровня решены с проверкой сервера. Повторный вызов вернёт тот же код. */
export async function issueCertificate(userId: string, tier: Tier): Promise<string | null> {
  const status = (await getCertificateStatus(userId)).find((s) => s.tier === tier);
  if (!status || status.total === 0 || status.verified < status.total) return null;
  if (status.code) return status.code;
  const user = await getUser(userId);
  if (!user) return null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const rows = await query<{ code: string }>(
      `INSERT INTO certificates (code, user_id, tier, name, task_count) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING RETURNING code`,
      [newCode(), userId, tier, user.name, status.total],
    );
    if (rows[0]) return rows[0].code;
    // Конфликт: либо совпал код (повторяем), либо сертификат уже выдан параллельным запросом
    const existing = await query<{ code: string }>('SELECT code FROM certificates WHERE user_id = $1 AND tier = $2', [userId, tier]);
    if (existing[0]) return existing[0].code;
  }
  return null;
}

export type Certificate = { code: string; tier: Tier; name: string; taskCount: number; issuedAt: string };

export async function getCertificate(code: string): Promise<Certificate | null> {
  if (!/^[A-Z0-9]{10}$/.test(code)) return null;
  const rows = await query<{ code: string; tier: Tier; name: string; task_count: number; issued_at: string }>(
    `SELECT code, tier, name, task_count, to_char(issued_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD') AS issued_at
     FROM certificates WHERE code = $1`,
    [code],
  );
  const r = rows[0];
  return r ? { code: r.code, tier: r.tier, name: r.name, taskCount: r.task_count, issuedAt: r.issued_at } : null;
}

export type OtherSolution = { name: string; city: string | null; sql: string; solvedAt: string };

/** Решения других — только тем, кто сам решил задание. Сначала самые короткие. */
export async function getOtherSolutions(userId: string, taskId: number): Promise<OtherSolution[] | null> {
  const mine = await query('SELECT 1 FROM solves WHERE user_id = $1 AND task_id = $2', [userId, taskId]);
  if (mine.length === 0) return null;
  return query<OtherSolution>(
    `SELECT u.name, u.city, s.sql, to_char(s.solved_at AT TIME ZONE 'Asia/Dushanbe', 'YYYY-MM-DD') AS "solvedAt"
     FROM solves s JOIN users u ON u.id = s.user_id
     WHERE s.task_id = $1 AND s.verified AND s.sql IS NOT NULL AND s.user_id <> $2
     ORDER BY length(s.sql), s.solved_at
     LIMIT 20`,
    [taskId, userId],
  );
}
