import type { Metadata } from 'next';
import { LESSONS } from '@/content/lessons';
import { getPublicTasks } from '@/lib/tasks';
import { LessonList } from '@/components/LessonList';

export const metadata: Metadata = { title: 'Теория' };

export default function LearnPage() {
  const tasks = getPublicTasks();
  const lessons = LESSONS.map(({ topic, minutes, title_ru, title_tj }) => ({
    topic,
    minutes,
    title_ru,
    title_tj,
    tasks: tasks.filter((task) => task.topic === topic).length,
  }));
  return <LessonList lessons={lessons} />;
}
