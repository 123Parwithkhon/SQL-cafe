// Статическая сборка: ссылку «поделиться» (?db=&q=) разбирает браузер
import type { Metadata } from 'next';
import { DEFAULT_DB } from '@/lib/schema';
import { PlaygroundView } from '@/components/PlaygroundView';

export const metadata: Metadata = { title: 'Песочница' };

export default function PlaygroundPage() {
  return <PlaygroundView initialDb={DEFAULT_DB} initialSql="" readFromUrl />;
}
