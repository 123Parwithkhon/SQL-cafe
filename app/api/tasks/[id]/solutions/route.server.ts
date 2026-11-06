// app/api/tasks/[id]/solutions/route.ts — решения других (только тем, кто сам решил)
import { NextResponse } from 'next/server';
import { currentUserId } from '@/auth';
import { getTask } from '@/lib/tasks';
import { getOtherSolutions } from '@/lib/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const raw = (await params).id;
  const taskId = /^\d{1,4}$/.test(raw) ? Number(raw) : NaN;
  if (!getTask(taskId)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  try {
    const solutions = await getOtherSolutions(userId, taskId);
    if (solutions === null) return NextResponse.json({ error: 'not_solved' }, { status: 403 });
    return NextResponse.json({ solutions });
  } catch (err) {
    console.error('[solutions]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
