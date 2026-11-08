// Сертификаты: список выданных и отзыв (например, если решения оказались списанными)
import Link from 'next/link';
import { listCertificates } from '@/lib/admin';
import { RevokeCertificate } from '@/components/admin/RevokeCertificate';

export const metadata = { title: 'Сертификаты' };

export default async function AdminCertificatesPage() {
  const certs = await listCertificates();

  if (certs.length === 0) {
    return <p className="rounded-xl border border-gold/30 bg-panel p-6 text-center text-fg/60">Сертификатов пока нет.</p>;
  }

  return (
    <>
      {/* Телефон: карточки */}
      <ul className="space-y-2 md:hidden">
        {certs.map((c) => (
          <li key={c.code} className="rounded-xl border border-gold/30 bg-panel p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link href={`/admin/users/${c.userId}`} className="font-semibold text-fg">{c.name}</Link>
                <div className="truncate text-xs text-fg/55">{c.email ?? '—'}</div>
                <div className="mt-1 text-xs text-fg/70">
                  {c.tier} · {c.issuedAt}
                </div>
                <Link href={`/cert/${c.code}`} className="mt-1 inline-block font-mono text-sm text-gold-soft">{c.code}</Link>
              </div>
              <RevokeCertificate code={c.code} name={c.name} />
            </div>
          </li>
        ))}
      </ul>

      {/* Компьютер: таблица */}
      <div className="hidden rounded-xl border border-gold/30 bg-panel md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-fg/60">
            <tr>
              <th className="px-3 py-2">Код</th>
              <th className="px-3 py-2">Имя в сертификате</th>
              <th className="px-3 py-2">Уровень</th>
              <th className="px-3 py-2">Выдан</th>
              <th className="px-3 py-2"><span className="sr-only">Действия</span></th>
            </tr>
          </thead>
          <tbody>
            {certs.map((c) => (
              <tr key={c.code} className="border-t border-fg/10 hover:bg-fg/5">
                <td className="px-3 py-2">
                  <Link href={`/cert/${c.code}`} className="font-mono text-gold-soft hover:underline">{c.code}</Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${c.userId}`} className="text-fg hover:underline">{c.name}</Link>
                  <div className="text-xs text-fg/50">{c.email ?? '—'}</div>
                </td>
                <td className="px-3 py-2 text-fg/80">{c.tier}</td>
                <td className="px-3 py-2 font-mono text-xs text-fg/70">{c.issuedAt}</td>
                <td className="px-3 py-2 text-right">
                  <RevokeCertificate code={c.code} name={c.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
