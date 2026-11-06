// app/api/progress/route.ts
// GET  — прогресс вошедшего пользователя { solved, days }
// POST — перенос прогресса из браузера { solved: number[], days: string[] } (без очков)
import { NextResponse } from 'next/server';
import { currentUserId } from '@/auth';
import { getProgress, importProgress } from '@/lib/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await getProgress(userId));
  } catch (err) {
    console.error('[progress] GET', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (Number(request.headers.get('content-length') ?? 0) > 32_768) return NextResponse.json({ error: 'bad_request' }, { status: 413 });

  let body: { solved?: unknown; days?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const solved = Array.isArray(body.solved) ? body.solved.filter((x): x is number => Number.isInteger(x)) : [];
  const days = Array.isArray(body.days) ? body.days.filter((x): x is string => typeof x === 'string') : [];

  try {
    await importProgress(userId, solved, days);
    return NextResponse.json(await getProgress(userId));
  } catch (err) {
    console.error('[progress] POST', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
