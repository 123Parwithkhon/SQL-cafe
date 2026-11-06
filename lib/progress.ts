// lib/progress.ts — прогресс и streak.
// localStorage — быстрый кэш на устройстве (работает и без входа).
// После входа прогресс синхронизируется с сервером: решённое на этом устройстве
// переносится в аккаунт, решённое на других устройствах — подтягивается сюда.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuthUser } from '@/components/AuthProvider';

const STORAGE_KEY = 'chaikhona:progress:v1';
const EVENT = 'chaikhona:progress';
export const SYNCED_EVENT = 'chaikhona:synced';

export type Progress = {
  solved: number[];
  /** Дни с хотя бы одним решённым заданием, YYYY-MM-DD по местному времени */
  days: string[];
};

const EMPTY: Progress = { solved: [], days: [] };

function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function read(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Progress>;
    return {
      solved: Array.isArray(parsed.solved) ? parsed.solved.filter(Number.isInteger) : [],
      days: Array.isArray(parsed.days) ? parsed.days.filter((d) => typeof d === 'string') : [],
    };
  } catch {
    return EMPTY;
  }
}

function write(progress: Progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Приватный режим или переполнение — прогресс просто не сохранится
  }
  window.dispatchEvent(new Event(EVENT));
}

const union = <T,>(a: T[], b: T[]) => [...new Set([...a, ...b])];

// Синхронизация — один раз на загрузку страницы для каждого пользователя
const syncedFor = new Set<string>();

async function syncWithServer(userId: string) {
  if (syncedFor.has(userId)) return;
  syncedFor.add(userId);
  try {
    const local = read();
    const response = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(local),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const server = (await response.json()) as Progress;
    const current = read();
    write({ solved: union(current.solved, server.solved), days: union(current.days, server.days).sort().slice(-400) });
    // Страницы с серверными данными (профиль) обновятся, чтобы показать перенесённое
    window.dispatchEvent(new Event(SYNCED_EVENT));
  } catch (err) {
    syncedFor.delete(userId); // попробуем при следующем открытии страницы
    console.warn('[progress] синхронизация не удалась', err);
  }
}

/** Серия дней подряд, заканчивающаяся сегодня или вчера */
export function computeStreak(days: string[]): number {
  const set = new Set(days);
  let offset = set.has(today()) ? 0 : -1;
  let streak = 0;
  while (set.has(today(offset))) {
    streak++;
    offset--;
  }
  return streak;
}

export function useProgress() {
  const user = useAuthUser();
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sync = () => setProgress(read());
    sync();
    setLoaded(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    if (user) void syncWithServer(user.id);
  }, [user]);

  const markSolved = useCallback((taskId: number) => {
    const current = read();
    const day = today();
    write({
      solved: current.solved.includes(taskId) ? current.solved : [...current.solved, taskId],
      days: current.days.includes(day) ? current.days : [...current.days, day].slice(-400),
    });
  }, []);

  return { progress, loaded, streak: computeStreak(progress.days), markSolved };
}
