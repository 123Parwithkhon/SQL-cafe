// lib/announcement.ts — объявление для всех посетителей (пишет администратор).
// Хранится в site_settings под ключом 'announcement' как JSON { ru, tj, at }.
import 'server-only';
import { query } from './db';
import { logAction } from './admin';

export type Announcement = { ru: string; tj: string; at: string };

export const ANNOUNCEMENT_MAX = 300;

export async function getAnnouncement(): Promise<Announcement | null> {
  const rows = await query<{ value: string }>(`SELECT value FROM site_settings WHERE key = 'announcement'`);
  if (!rows[0]) return null;
  try {
    const a = JSON.parse(rows[0].value) as Announcement;
    return a.ru || a.tj ? a : null;
  } catch {
    return null;
  }
}

/** Пустые оба текста — снять объявление */
export async function setAnnouncement(adminId: string, ru: string, tj: string) {
  if (!ru && !tj) {
    await query(`DELETE FROM site_settings WHERE key = 'announcement'`);
    await logAction(adminId, 'announcement_off', null);
    return;
  }
  const value = JSON.stringify({ ru, tj, at: new Date().toISOString() } satisfies Announcement);
  await query(
    `INSERT INTO site_settings (key, value, updated_at) VALUES ('announcement', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [value],
  );
  await logAction(adminId, 'announcement_on', null, (ru || tj).slice(0, 80));
}
