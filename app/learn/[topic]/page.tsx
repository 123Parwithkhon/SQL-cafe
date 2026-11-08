import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LESSONS, getLesson } from '@/content/lessons';
import { getPublicTasks } from '@/lib/tasks';
import { LessonView } from '@/components/LessonView';

type Props = { params: Promise<{ topic: string }> };

/** Все уроки заранее — нужно для статической сборки (GitHub Pages) */
export function generateStaticParams() {
  return LESSONS.map((l) => ({ topic: l.topic }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const lesson = getLesson((await params).topic);
  return { title: lesson ? lesson.title_ru : 'Теория' };
}

export default async function LessonPage({ params }: Props) {
  const lesson = getLesson((await params).topic);
  if (!lesson) notFound();

  const topicTasks = getPublicTasks().filter((task) => task.topic === lesson.topic);
  const index = LESSONS.indexOf(lesson);
  const nav = (i: number) => {
    const l = LESSONS[i];
    return l && { topic: l.topic, title_ru: l.title_ru, title_tj: l.title_tj };
  };

  return (
    <LessonView
      lesson={lesson}
      firstTaskNum={topicTasks[0]?.num}
      taskCount={topicTasks.length}
      prev={nav(index - 1)}
      next={nav(index + 1)}
    />
  );
}
