// lib/course.ts — структура курса: 4 уровня, в каждом свои темы (порядок важен)
export type Topic =
  | 'intro' | 'select' | 'where' | 'order'
  | 'functions' | 'aggregate'
  | 'join' | 'subquery' | 'set'
  | 'cte' | 'window' | 'analytics' | 'final'
  | 'modify'
  // Практикумы на отдельных базах
  | 'maktab' | 'safar' | 'liga'
  // Урок без заданий — «SQL на работе: MySQL и PostgreSQL»
  | 'dialects';

export type Tier = 'novice' | 'adept' | 'master' | 'expert';

export const TIERS: { id: Tier; topics: Topic[] }[] = [
  { id: 'novice', topics: ['intro', 'select', 'where', 'order'] },
  { id: 'adept', topics: ['functions', 'aggregate', 'maktab'] },
  { id: 'master', topics: ['join', 'subquery', 'set', 'modify', 'safar'] },
  { id: 'expert', topics: ['cte', 'window', 'analytics', 'liga', 'final'] },
];

export const TOPICS: Topic[] = TIERS.flatMap((tier) => tier.topics);

export function tierOf(topic: Topic): Tier {
  return TIERS.find((tier) => tier.topics.includes(topic))?.id ?? 'novice';
}
