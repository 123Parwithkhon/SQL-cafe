import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicTaskByNum, getPublicTasks } from '@/lib/tasks';
import { TaskWorkspace } from '@/components/TaskWorkspace';
import { TIERS } from '@/lib/course';

type Props = { params: Promise<{ num: string }> };

/** Все страницы заданий заранее — нужно для статической сборки (GitHub Pages) */
export function generateStaticParams() {
  return getPublicTasks().map((t) => ({ num: String(t.num) }));
}

function parseNum(raw: string): number | null {
  return /^\d{1,4}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const num = parseNum((await params).num);
  const task = num === null ? undefined : getPublicTaskByNum(num);
  return { title: task ? `${task.num}. ${task.title_ru}` : 'Задание' };
}

export default async function TaskPage({ params }: Props) {
  const num = parseNum((await params).num);
  const task = num === null ? undefined : getPublicTaskByNum(num);
  if (!task) notFound();

  const all = getPublicTasks();
  // Все задания уровня этого задания — чтобы отпраздновать, когда уровень пройден целиком
  const tier = TIERS.find((t) => t.topics.includes(task.topic));
  const tierTaskIds = all.filter((t) => tier?.topics.includes(t.topic)).map((t) => t.id);
  const prev = all.find((t) => t.num === task.num - 1);
  const next = all.find((t) => t.num === task.num + 1);

  return <TaskWorkspace key={task.id} task={task} prevNum={prev?.num} nextNum={next?.num} tierTaskIds={tierTaskIds} tierId={tier?.id} />;
}
