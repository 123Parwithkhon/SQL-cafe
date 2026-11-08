// Объявление для всех посетителей: показывается полосой под шапкой на каждой странице
import { getAnnouncement } from '@/lib/announcement';
import { AnnouncementForm } from '@/components/admin/AnnouncementForm';

export const metadata = { title: 'Объявление' };

export default async function AdminAnnouncementPage() {
  const current = await getAnnouncement();
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-sm text-fg/70">
        Короткое сообщение для всех учеников: новые задания, конкурс, перерыв в работе. Видно на каждой странице, пока ученик его не закроет.
        Новое объявление снова покажется всем.
      </p>
      <AnnouncementForm initial={current} />
    </div>
  );
}
