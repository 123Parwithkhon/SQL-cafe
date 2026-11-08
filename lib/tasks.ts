// lib/tasks.ts — задания курса. Только для сервера.
// Полный режим: эталонные решения не попадают в браузер — наружу идёт PublicTask без solution,
// проверяет сервер. Статический режим (GitHub Pages): сервера нет, поэтому эталон отдаётся
// вместе с заданием и проверка идёт в браузере (lib/sql/local-check.ts).
import 'server-only';
import tasksData from '@/content/tasks.json';
import { TOPICS, type Topic } from './course';
import type { DbName } from './schema';
import { IS_STATIC } from './env';

export type { Topic };
export type Level = 'easy' | 'medium' | 'hard';

export type Task = {
  id: number;
  topic: Topic;
  level: Level;
  title_ru: string;
  title_tj: string;
  task_ru: string;
  task_tj: string;
  tables: string[];
  solution: string;
  hints: string[];
  hints_tj: string[];
  /** Учебная база задания; по умолчанию — «Чайхана» */
  db?: DbName;
  /**
   * Номер, который видит ученик: место задания в курсе (1, 2, 3… без пропусков).
   * id — внутренний и постоянный: на нём держатся прогресс, ссылки и решения в базе.
   */
  num: number;
};

/** Задание для браузера. solution есть только в статической сборке */
export type PublicTask = Omit<Task, 'solution'> & { solution?: string };

// Номера заданий не меняются (на них завязан прогресс), а порядок — по курсу:
// практикумы на новых базах (№115+) встают после своих тем
const tasks: Task[] = (tasksData as Omit<Task, 'num'>[])
  .slice()
  .sort((a, b) => TOPICS.indexOf(a.topic) - TOPICS.indexOf(b.topic) || a.id - b.id)
  .map((t, i) => ({ ...t, num: i + 1 }));

function toPublic({ solution, ...rest }: Task): PublicTask {
  return IS_STATIC ? { ...rest, solution } : rest;
}

export function getTask(id: number): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function getPublicTask(id: number): PublicTask | undefined {
  const task = getTask(id);
  return task && toPublic(task);
}

/** Задание по номеру, который видит ученик (адрес /task/<номер>) */
export function getPublicTaskByNum(num: number): PublicTask | undefined {
  const task = tasks.find((t) => t.num === num);
  return task && toPublic(task);
}

export function getPublicTasks(): PublicTask[] {
  return tasks.map(toPublic);
}
