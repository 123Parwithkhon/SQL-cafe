// Старые адреса заданий: /trainer/<внутренний id>. Ведут на новый адрес /task/<номер в курсе>,
// чтобы ссылки, которые уже разослали ученикам, продолжали работать.
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicTask, getPublicTasks } from '@/lib/tasks';
import { taskPath } from '@/lib/task-path';
import { IS_STATIC } from '@/lib/env';
import { LegacyRedirect } from '@/components/LegacyRedirect';

type Props = { params: Promise<{ id: string }> };

/** Для статической сборки — страница-перенаправление на каждый старый адрес */
export function generateStaticParams() {
  return getPublicTasks().map((t) => ({ id: String(t.id) }));
}

export const metadata: Metadata = { robots: { index: false } };

export default async function LegacyTaskPage({ params }: Props) {
  const raw = (await params).id;
  const task = /^\d{1,4}$/.test(raw) ? getPublicTask(Number(raw)) : undefined;
  if (!task) notFound();
  // С сервером — настоящий редирект 308; на GitHub Pages сервера нет — перенаправляет браузер
  if (!IS_STATIC) permanentRedirect(taskPath(task.num));
  return <LegacyRedirect to={taskPath(task.num)} title={`${task.num}. ${task.title_ru}`} />;
}
