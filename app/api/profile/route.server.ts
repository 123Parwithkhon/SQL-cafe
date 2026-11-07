// app/api/profile/route.ts — PATCH { name, city, university }: изменить свой профиль
import { NextResponse } from 'next/server';
import { currentMember } from '@/auth';
import { updateProfile } from '@/lib/stats';
import { isCity, isUniversity } from '@/lib/regions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  const user = await currentMember();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Имя видно другим — заблокированный менять его не может
  if (user.blocked) return NextResponse.json({ error: 'blocked' }, { status: 403 });
  const userId = user.id;

  let body: { name?: unknown; city?: unknown; university?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Имя видно в рейтинге: обрезаем пробелы, схлопываем повторы, 2–40 символов
  const name = typeof body.name === 'string' ? body.name.replace(/\s+/g, ' ').trim() : '';
  if (name.length < 2 || name.length > 40) return NextResponse.json({ error: 'invalid_name' }, { status: 422 });
  if (body.city !== null && body.city !== undefined && !isCity(body.city)) {
    return NextResponse.json({ error: 'invalid_city' }, { status: 422 });
  }
  if (body.university !== null && body.university !== undefined && !isUniversity(body.university)) {
    return NextResponse.json({ error: 'invalid_university' }, { status: 422 });
  }

  try {
    await updateProfile(userId, {
      name,
      city: (body.city as string | null | undefined) ?? null,
      university: (body.university as string | null | undefined) ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[profile] PATCH', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
