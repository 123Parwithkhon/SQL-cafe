import type { Metadata } from 'next';
import { isDbName, DEFAULT_DB } from '@/lib/schema';
import { MAX_SQL_LENGTH } from '@/lib/sql/validate';
import { PlaygroundView } from '@/components/PlaygroundView';

export const metadata: Metadata = { title: 'Песочница' };

type Props = { searchParams: Promise<{ db?: string; q?: string }> };

/** Запрос из ссылки «поделиться»: base64url(UTF-8). Битая ссылка — просто пустой редактор. */
function decodeQuery(raw: string | undefined): string {
  if (!raw || raw.length > MAX_SQL_LENGTH * 2) return '';
  try {
    return Buffer.from(raw, 'base64url').toString('utf8').slice(0, MAX_SQL_LENGTH);
  } catch {
    return '';
  }
}

export default async function PlaygroundPage({ searchParams }: Props) {
  const { db, q } = await searchParams;
  return <PlaygroundView initialDb={isDbName(db) ? db : DEFAULT_DB} initialSql={decodeQuery(q)} />;
}
