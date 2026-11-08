// app/api/admin/announcement/route.server.ts — PUT { ru, tj }: объявление для всех (пустые — снять)
import { NextResponse } from 'next/server';
import { ANNOUNCEMENT_MAX, setAnnouncement } from '@/lib/announcement';
import { guardAdminMutation, jsonError } from '@/lib/admin-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '');

export async function PUT(request: Request) {
  const guard = await guardAdminMutation(request);
  if ('response' in guard) return guard.response;

  let body: { ru?: unknown; tj?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError('bad_request', 400);
  }
  const ru = clean(body.ru);
  const tj = clean(body.tj);
  if (ru.length > ANNOUNCEMENT_MAX || tj.length > ANNOUNCEMENT_MAX) return jsonError('too_long', 422);

  try {
    await setAnnouncement(guard.admin.id, ru, tj);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[admin] announcement', err);
    return jsonError('internal', 500);
  }
}
