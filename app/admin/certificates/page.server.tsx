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
    <div className="result-scroll rounded-xl border border-gold/30 bg-panel">
      <table className="w-full min-w-[640px] text-left text-sm">
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
  );
}
