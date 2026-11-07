// app/api/admin/users/export/route.server.ts — GET: все пользователи в CSV (для Excel)
import { currentAdmin } from '@/auth';
import { exportUsers, logAction } from '@/lib/admin';
import { jsonError } from '@/lib/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Кавычки по RFC 4180 + защита от формул: Excel не должен выполнять «=...» из имени пользователя */
function cell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return jsonError('forbidden', 403);
  try {
    const rows = await exportUsers();
    const header = ['id', 'имя', 'email', 'город', 'вуз', 'роль', 'заблокирован', 'решено', 'очки', 'регистрация', 'был на сайте'];
    const lines = rows.map((r) =>
      [r.id, r.name, r.email, r.city, r.university, r.role, r.blocked ? 'да' : 'нет', r.solved, r.points, r.createdAt, r.lastSeenAt].map(cell).join(';'),
    );
    await logAction(admin.id, 'export_users', null, `${rows.length} строк`);
    const date = new Date().toISOString().slice(0, 10);
    // BOM — чтобы Excel сразу понял UTF-8 и кириллицу; «;» — разделитель в русской локали Excel
    return new Response('﻿' + [header.join(';'), ...lines].join('\r\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="users-${date}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[admin] export users', err);
    return jsonError('internal', 500);
  }
}
