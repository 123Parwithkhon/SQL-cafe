import type { Metadata } from 'next';
import { getPublicTasks } from '@/lib/tasks';
import { InterviewView } from '@/components/InterviewView';

export const metadata: Metadata = { title: 'Собеседование' };

// Темы уровней «Мастер» и «Эксперт» на базе «Чайхана» (без песочницы DML и финала на другой базе)
const INTERVIEW_TOPICS = ['join', 'subquery', 'set', 'cte', 'window', 'analytics'];

export default function InterviewPage() {
  const pool = getPublicTasks().filter((t) => INTERVIEW_TOPICS.includes(t.topic));
  return <InterviewView pool={pool} />;
}
