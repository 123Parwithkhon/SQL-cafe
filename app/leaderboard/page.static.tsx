import type { Metadata } from 'next';
import { FullVersionNotice } from '@/components/FullVersionNotice';

export const metadata: Metadata = { title: 'Рейтинг' };

// Рейтингу нужна общая база пользователей — на GitHub Pages сервера нет
export default function LeaderboardPage() {
  return <FullVersionNotice titleKey="leaderboard.title" />;
}
