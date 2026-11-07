// app/api/certificates/route.ts — POST { tier }: выдать сертификат за пройденный уровень
import { NextResponse } from 'next/server';
import { currentMember } from '@/auth';
import { TIERS, type Tier } from '@/lib/course';
import { issueCertificate } from '@/lib/stats';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await currentMember();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // Заблокированным сертификаты не выдаём
  if (user.blocked) return NextResponse.json({ error: 'blocked' }, { status: 403 });
  const userId = user.id;

  let tier: unknown;
  try {
    ({ tier } = await request.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!TIERS.some((t) => t.id === tier)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  try {
    const code = await issueCertificate(userId, tier as Tier);
    if (!code) return NextResponse.json({ error: 'not_completed' }, { status: 403 });
    return NextResponse.json({ code });
  } catch (err) {
    console.error('[certificates]', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
