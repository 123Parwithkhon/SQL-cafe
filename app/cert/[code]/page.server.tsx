import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCertificate } from '@/lib/stats';
import { CertificateView } from '@/components/CertificateView';

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cert = await getCertificate((await params).code).catch(() => null);
  return { title: cert ? `Сертификат · ${cert.name}` : 'Сертификат' };
}

// Публичная страница: по ссылке любой (работодатель, преподаватель) может проверить сертификат
export default async function CertificatePage({ params }: Props) {
  const cert = await getCertificate((await params).code).catch((err) => {
    console.error('[cert]', err);
    return null;
  });
  if (!cert) notFound();
  return <CertificateView cert={cert} />;
}
