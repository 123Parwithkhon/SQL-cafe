import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicTask, getPublicTasks } from '@/lib/tasks';
import { TaskWorkspace } from '@/components/TaskWorkspace';
import { TIERS } from '@/lib/course';

type Props = { params: Promise<{ id: string }> };

/** Все страницы заданий заранее — нужно для статической сборки (GitHub Pages) */
export function generateStaticParams() {
  return getPublicTasks().map((t) => ({ id: String(t.id) }));
}

function parseId(raw: string): number | null {
  return /^\d{1,4}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  const task = id === null ? undefined : getPublicTask(id);
  return { title: task ? `${task.id}. ${task.title_ru}` : 'Задание' };
}

export default async function TaskPage({ params }: Props) {
  const id = parseId((await params).id);
  const task = id === null ? undefined : getPublicTask(id);
  if (!task) notFound();

  const all = getPublicTasks();
  const ids = all.map((t) => t.id);
  const index = ids.indexOf(task.id);
  // Все задания уровня этого задания — чтобы отпраздновать, когда уровень пройден целиком
  const tier = TIERS.find((t) => t.topics.includes(task.topic));
  const tierTaskIds = all.filter((t) => tier?.topics.includes(t.topic)).map((t) => t.id);

  return <TaskWorkspace key={task.id} task={task} prevId={ids[index - 1]} nextId={ids[index + 1]} tierTaskIds={tierTaskIds} tierId={tier?.id} />;
}
