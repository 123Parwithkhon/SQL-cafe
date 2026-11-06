// Статическая сборка: профиль гостя — прогресс, звание, «Чайник дня», достижения хранятся на устройстве
import type { Metadata } from 'next';
import { getPublicTasks } from '@/lib/tasks';
import { ProfileView } from '@/components/ProfileView';

export const metadata: Metadata = { title: 'Профиль' };

export default function ProfilePage() {
  const tasks = getPublicTasks().map(({ id, topic, level, title_ru, title_tj }) => ({ id, topic, level, title_ru, title_tj }));
  return <ProfileView tasks={tasks} user={null} stats={null} certificates={[]} failed={false} />;
}
