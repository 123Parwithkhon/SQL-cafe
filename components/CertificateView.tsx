'use client';

// Сертификат за уровень: красивый, печатается на A4 (Ctrl+P), ссылку можно вставить в резюме
import { useState } from 'react';
import type { Certificate } from '@/lib/stats';
import type { DictKey } from '@/lib/i18n';
import { useLang } from './LangProvider';
import { PishtaqMark } from './Pishtaq';
import { Check, Copy, Printer, ShieldCheck } from './icons';

export function CertificateView({ cert }: { cert: Certificate }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // буфер обмена недоступен — пользователь скопирует адрес вручную
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Сам сертификат — всегда светлый, как бумага */}
      <div className="relative overflow-hidden rounded-2xl border-4 border-double border-[#b07d22] bg-[#fffdf8] px-6 py-10 text-center text-[#1f2a37] shadow-xl sm:px-12">
        <svg aria-hidden viewBox="0 0 100 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-6 top-4 h-16 w-[calc(100%-3rem)]">
          <path d="M1,40 C1,26 22,18 38,12 C45,9 48,5 50,1 C52,5 55,9 62,12 C78,18 99,26 99,40" fill="none" stroke="#b07d22" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="relative">
          <PishtaqMark className="mx-auto h-12 w-10" />
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-[#8a5d12]">{t('cert.heading')}</p>
          <p className="mt-6 text-sm text-[#5b6573]">{t('cert.certifies')}</p>
          <p className="mt-2 font-serif text-3xl font-bold text-[#1d3557] sm:text-4xl">{cert.name}</p>
          <p className="mt-4 text-sm text-[#5b6573]">{t('cert.completed')}</p>
          <p className="mt-1 font-serif text-2xl font-bold text-[#c8552c]">{t(`tier.${cert.tier}` as DictKey)}</p>
          <p className="mt-1 text-sm text-[#5b6573]">{t(`tier.${cert.tier}.desc` as DictKey)}</p>
          <p className="mt-4 text-sm">{t('cert.tasks', { n: cert.taskCount })}</p>
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-[#e9dcc6] pt-4 text-left text-xs text-[#5b6573]">
            <div>
              <div>{t('cert.date')}</div>
              <div className="font-semibold text-[#1f2a37]">{cert.issuedAt}</div>
            </div>
            <div className="font-serif text-base font-bold text-[#1d3557]">Чайхона SQL</div>
            <div className="text-right">
              <div>{t('cert.code')}</div>
              <div className="font-mono font-semibold tracking-wider text-[#1f2a37]">{cert.code}</div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-emerald">
        <ShieldCheck size={18} />
        {t('cert.verified')}
      </p>

      <div className="no-print mt-4 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={copyLink} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-terra px-5 font-semibold text-white hover:bg-terra-dark">
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? t('cert.copied') : t('cert.copy')}
        </button>
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gold/60 px-5 font-semibold text-gold-soft hover:bg-fg/5">
          <Printer size={18} />
          {t('cert.print')}
        </button>
      </div>
    </div>
  );
}
