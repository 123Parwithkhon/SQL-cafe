import { notFound } from 'next/navigation';
import { getPublicTask } from '@/lib/tasks';
import { HomeHero } from '@/components/HomeHero';
import { TaskWorkspace } from '@/components/TaskWorkspace';

export default function HomePage() {
  const demo = getPublicTask(1);
  if (!demo) notFound();

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
      <HomeHero />
      <TaskWorkspace task={demo} nextId={2} variant="compact" />
    </div>
  );
}
