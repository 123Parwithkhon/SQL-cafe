'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RevokeCertificate({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function revoke() {
    if (!window.confirm(`Отозвать сертификат ${code} (${name})? Ссылка на него перестанет работать.`)) return;
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/admin/certificates/${code}`, { method: 'DELETE' });
      if (!res.ok) setError(true);
      else router.refresh();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span role="alert" className="text-xs text-red-500">ошибка</span>}
      <button
        type="button"
        disabled={busy}
        onClick={revoke}
        className="min-h-8 rounded-lg border border-red-400/60 px-2.5 text-xs font-semibold text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
      >
        Отозвать
      </button>
    </span>
  );
}
