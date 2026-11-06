// lib/motivation.ts — то, что держит мотивацию: звания, «чайник дня», похвала, пословицы, праздники.
// Всё считается на устройстве по уже известному прогрессу — без новых запросов к серверу.
'use client';

import type { Lang } from './i18n';

// ── Звания: от гостя чайханы до великого мастера ──
export type Rank = { min: number; ru: string; tj: string };

export const RANKS: Rank[] = [
  { min: 0, ru: 'Гость', tj: 'Меҳмон' },
  { min: 5, ru: 'Ученик', tj: 'Шогирд' },
  { min: 15, ru: 'Ценитель чая', tj: 'Чойнӯш' },
  { min: 35, ru: 'Чайханщик', tj: 'Чойхоначӣ' },
  { min: 70, ru: 'Мастер', tj: 'Устод' },
  { min: 114, ru: 'Великий мастер', tj: 'Устоди бузург' },
];

export function rankOf(solved: number): { rank: Rank; index: number; next: Rank | null; progress: number } {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) if (solved >= RANKS[i].min) index = i;
  const rank = RANKS[index];
  const next = RANKS[index + 1] ?? null;
  const progress = next ? (solved - rank.min) / (next.min - rank.min) : 1;
  return { rank, index, next, progress: Math.max(0, Math.min(1, progress)) };
}

export const rankName = (rank: Rank, lang: Lang) => (lang === 'tj' ? rank.tj : rank.ru);

// ── «Чайник дня»: цель — 3 задания в день ──
export const DAILY_GOAL = 3;
const DAILY_KEY = 'chaikhona:daily:v1';
export const DAILY_EVENT = 'chaikhona:daily';

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Сколько разных заданий решено сегодня */
export function readDaily(): number {
  try {
    const data = JSON.parse(localStorage.getItem(DAILY_KEY) ?? '{}') as { day?: string; ids?: number[] };
    return data.day === today() && Array.isArray(data.ids) ? data.ids.length : 0;
  } catch {
    return 0;
  }
}

/** Отмечает задание как решённое сегодня; возвращает новое число за день */
export function recordDaily(taskId: number): number {
  let ids: number[] = [];
  try {
    const data = JSON.parse(localStorage.getItem(DAILY_KEY) ?? '{}') as { day?: string; ids?: number[] };
    if (data.day === today() && Array.isArray(data.ids)) ids = data.ids;
  } catch {
    // начнём день заново
  }
  if (!ids.includes(taskId)) ids = [...ids, taskId];
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify({ day: today(), ids }));
  } catch {
    // не сохранилось — не страшно
  }
  window.dispatchEvent(new Event(DAILY_EVENT));
  return ids.length;
}

// ── Решения подряд без ошибок (в пределах вкладки) ──
const COMBO_KEY = 'chaikhona:combo';
export function bumpCombo(success: boolean): number {
  try {
    const next = success ? Number(sessionStorage.getItem(COMBO_KEY) ?? 0) + 1 : 0;
    sessionStorage.setItem(COMBO_KEY, String(next));
    return next;
  } catch {
    return success ? 1 : 0;
  }
}

// ── Похвала и поддержка ──
const PRAISE = [
  { tj: 'Офарин!', ru: 'Молодец!' },
  { tj: 'Баракалло!', ru: 'Браво!' },
  { tj: 'Аъло!', ru: 'Отлично!' },
  { tj: 'Зӯр!', ru: 'Здорово!' },
  { tj: 'Хеле хуб!', ru: 'Очень хорошо!' },
  { tj: 'Ташаккур, устод!', ru: 'Спасибо, мастер!' },
];

export function pickPraise(seed: number) {
  return PRAISE[Math.abs(seed) % PRAISE.length];
}

/** Таджикские пословицы — для поддержки после ошибки и «мудрости дня» */
export const PROVERBS = [
  { tj: 'Қатра-қатра дарё мешавад.', ru: 'Капля за каплей — и вот река.' },
  { tj: 'Сабр кунӣ, аз ғӯра ҳалво мешавад.', ru: 'Наберись терпения — и из незрелого винограда выйдет халва.' },
  { tj: 'Дониш гавҳари бебаҳост.', ru: 'Знание — бесценная жемчужина.' },
  { tj: 'Бе меҳнат роҳат нест.', ru: 'Без труда нет отдыха.' },
  { tj: 'Ҷӯянда ёбанда аст.', ru: 'Кто ищет — тот найдёт.' },
  { tj: 'Аз ту ҳаракат, аз Худо баракат.', ru: 'От тебя — старание, а благодать придёт.' },
  { tj: 'Аввал андеша, вонгаҳе гуфтор.', ru: 'Сначала подумай, потом говори. (Саади)' },
  { tj: 'Илм дар сина, на дар сафина.', ru: 'Знание — в голове, а не в тетради.' },
  { tj: 'Шунидан кай бувад монанди дидан.', ru: 'Услышать — не то же самое, что увидеть.' },
];

export function proverbOfTheDay() {
  const d = new Date();
  const dayNumber = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
  return PROVERBS[dayNumber % PROVERBS.length];
}

export function pickProverb(seed: number) {
  return PROVERBS[Math.abs(seed) % PROVERBS.length];
}

/** Приветствие по времени суток — по-таджикски, как в чайхане */
export function greeting(): { tj: string; ru: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { tj: 'Субҳ ба хайр!', ru: 'Доброе утро!' };
  if (h >= 12 && h < 17) return { tj: 'Рӯз ба хайр!', ru: 'Добрый день!' };
  if (h >= 17 && h < 23) return { tj: 'Шом ба хайр!', ru: 'Добрый вечер!' };
  return { tj: 'Шаби хуш!', ru: 'Доброй ночи!' };
}

// ── Праздники: показываются глобальным компонентом <Celebration /> ──
export type CelebrationKind = 'rank' | 'daily' | 'tier' | 'streak';
export type CelebrationDetail = { kind: CelebrationKind; title: string; text: string };
export const CELEBRATE_EVENT = 'chaikhona:celebrate';

export function celebrate(detail: CelebrationDetail) {
  window.dispatchEvent(new CustomEvent<CelebrationDetail>(CELEBRATE_EVENT, { detail }));
}

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];
