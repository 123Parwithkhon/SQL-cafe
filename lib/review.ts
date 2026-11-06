// lib/review.ts — интервальное повторение: через 3 и через 7 дней после решения
// предлагаем вернуться к теме. Решили любое задание этой темы — повторение засчитано.
// Хранится на устройстве (localStorage), как и кэш прогресса.
'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'chaikhona:review:v1';
const EVENT = 'chaikhona:review';
/** Интервалы в днях: после решения — 3, после первого повторения — 7, потом тема закреплена */
const INTERVALS = [3, 7];
const MAX_DUE = 3;

type Entry = { topic: string; solvedAt: string; stage: number };
type State = Record<string, Entry>;

export type TaskLite = { id: number; topic: string; level: string };
export type DueReview = { topic: string; sourceId: number; suggestId: number; stage: number; isRepeat: boolean };

function today(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysSince(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const [ty, tm, td] = today().split('-').map(Number);
  return Math.round((new Date(ty, tm - 1, td).getTime() - then) / 86_400_000);
}

const isDue = (e: Entry) => e.stage < INTERVALS.length && daysSince(e.solvedAt) >= INTERVALS[e.stage];

function read(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as State) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function write(state: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // нет места или приватный режим — повторения просто не сохранятся
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Отметить решение задания. Первое решение ставит задание в очередь повторения;
 * решение в теме, где подошёл срок, — засчитывает повторение всех «созревших» заданий темы.
 */
export function recordReview(taskId: number, topic: string) {
  const state = read();
  for (const [id, entry] of Object.entries(state)) {
    if (entry.topic === topic && isDue(entry)) state[id] = { topic, solvedAt: today(), stage: entry.stage + 1 };
  }
  if (!state[taskId]) state[taskId] = { topic, solvedAt: today(), stage: 0 };
  write(state);
}

/** Задания, решённые до появления повторений, — ставим в очередь с сегодняшнего дня */
function adopt(solvedIds: number[], tasks: TaskLite[]) {
  const state = read();
  let changed = false;
  for (const id of solvedIds) {
    const task = tasks.find((t) => t.id === id);
    if (task && !state[id]) {
      state[id] = { topic: task.topic, solvedAt: today(), stage: 0 };
      changed = true;
    }
  }
  if (changed) write(state);
}

/** Что повторить сегодня: по одному заданию на тему, не больше трёх */
export function useDueReviews(tasks: TaskLite[], solvedIds: number[]): DueReview[] {
  const [due, setDue] = useState<DueReview[]>([]);

  const compute = useCallback(() => {
    const state = read();
    const solved = new Set(solvedIds);
    const byTopic = new Map<string, DueReview>();
    for (const [id, entry] of Object.entries(state)) {
      if (!isDue(entry) || byTopic.has(entry.topic)) continue;
      const sourceId = Number(id);
      // Лучше новое задание той же темы; если все решены — повторить исходное
      const fresh = tasks.find((t) => t.topic === entry.topic && !solved.has(t.id));
      byTopic.set(entry.topic, {
        topic: entry.topic,
        sourceId,
        suggestId: fresh?.id ?? sourceId,
        stage: entry.stage,
        isRepeat: !fresh,
      });
    }
    setDue([...byTopic.values()].slice(0, MAX_DUE));
  }, [tasks, solvedIds]);

  useEffect(() => {
    adopt(solvedIds, tasks);
    compute();
    window.addEventListener(EVENT, compute);
    return () => window.removeEventListener(EVENT, compute);
  }, [compute, solvedIds, tasks]);

  return due;
}
