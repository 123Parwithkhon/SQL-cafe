import type { Metadata } from 'next';
import { auth, signOut } from '@/auth';
import { getPublicTasks } from '@/lib/tasks';
import {
  getCertificateStatus, getProfileStats, getUser, type CertificateStatus, type ProfileStats, type PublicUser,
} from '@/lib/stats';
import { ProfileView } from '@/components/ProfileView';
import { ChangePassword } from '@/components/ChangePassword';

export const metadata: Metadata = { title: 'Профиль' };

export default async function ProfilePage() {
  const session = await auth();
  const tasks = getPublicTasks().map(({ id, topic, level, title_ru, title_tj }) => ({ id, topic, level, title_ru, title_tj }));

  let user: (PublicUser & { provider?: string }) | null = null;
  let stats: ProfileStats | null = null;
  let certificates: CertificateStatus[] = [];
  let failed = false;
  if (session?.user?.id) {
    try {
      [user, stats, certificates] = await Promise.all([
        getUser(session.user.id),
        getProfileStats(session.user.id),
        getCertificateStatus(session.user.id),
      ]);
    } catch (err) {
      console.error('[profile] не удалось загрузить профиль:', err);
      failed = true;
    }
  }

  async function signOutAction() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  return (
    <>
      <ProfileView tasks={tasks} user={user} stats={stats} certificates={certificates} failed={failed} signOutAction={signOutAction} />
      {user?.provider === 'password' && <ChangePassword />}
    </>
  );
}
