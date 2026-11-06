import type { Metadata } from 'next';
import { getPublicTasks } from '@/lib/tasks';
import { TaskMap } from '@/components/TaskMap';

export const metadata: Metadata = { title: 'Тренажёр' };

export default function TrainerPage() {
  return <TaskMap tasks={getPublicTasks()} />;
}
