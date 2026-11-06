import type { Metadata } from 'next';
import { currentUserId } from '@/auth';
import { getLeaderboard, getUser, type LeaderRow, type Period } from '@/lib/stats';
import { isCity, isUniversity } from '@/lib/regions';
import { LeaderboardView } from '@/components/LeaderboardView';

export const metadata: Metadata = { title: 'Рейтинг' };

type Props = { searchParams: Promise<{ period?: string; city?: string; university?: string }> };

export default async function LeaderboardPage({ searchParams }: Props) {
  const sp = await searchParams;
  // Параметры из адреса — только из белых списков
  const period: Period = sp.period === 'all' ? 'all' : 'week';
  const city = isCity(sp.city) ? sp.city : null;
  const university = isUniversity(sp.university) ? sp.university : null;

  let rows: LeaderRow[] = [];
  let me: LeaderRow | null = null;
  let hasRegion = true;
  let failed = false;
  try {
    const userId = await currentUserId();
    ({ rows, me } = await getLeaderboard(period, { city, university }, userId));
    if (userId) {
      const user = await getUser(userId);
      hasRegion = Boolean(user?.city && user?.university);
    }
  } catch (err) {
    console.error('[leaderboard]', err);
    failed = true;
  }

  return (
    <LeaderboardView
      period={period}
      city={city}
      university={university}
      rows={rows}
      me={me}
      hasRegion={hasRegion}
      failed={failed}
    />
  );
}
