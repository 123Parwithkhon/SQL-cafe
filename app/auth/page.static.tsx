import type { Metadata } from 'next';
import { FullVersionNotice } from '@/components/FullVersionNotice';

export const metadata: Metadata = { title: 'Вход' };

// Входу через Google нужен сервер — на GitHub Pages его нет
export default function AuthPage() {
  return <FullVersionNotice titleKey="auth.title" path="/auth" />;
}
