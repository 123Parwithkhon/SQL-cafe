// Админка — только в полной версии (сервер + база). Доступ проверяется по базе на каждом запросе.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentAdmin, currentUserId } from '@/auth';
import { AdminNav } from '@/components/admin/AdminNav';
import { ShieldCheck } from '@/components/icons';

export const metadata: Metadata = { title: { default: 'Админка', template: '%s · Админка · Чайхона SQL' } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdmin();
  if (!admin) {
    // Не вошёл — на вход; вошёл, но не админ — честный отказ без подробностей
    if (!(await currentUserId())) redirect('/auth?next=/admin');
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-gold/40 bg-panel p-8 text-center">
        <ShieldCheck size={36} className="mx-auto text-gold" />
        <h1 className="mt-3 font-serif text-2xl font-bold text-fg">Нет доступа</h1>
        <p className="mt-2 text-fg/70">Этот раздел — только для администраторов платформы.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <ShieldCheck size={26} className="text-gold" />
        <h1 className="font-serif text-2xl font-bold text-fg">Админка</h1>
        <span className="rounded-full bg-fg/10 px-2.5 py-0.5 text-xs text-fg/70">{admin.name}</span>
      </div>
      <AdminNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
