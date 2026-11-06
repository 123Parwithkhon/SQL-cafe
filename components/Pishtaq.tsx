// Пиштак — стрельчатая арка входного портала. Тонкая золотая рамка вокруг блока.
import type { ReactNode } from 'react';

/** Свод арки (0..100 × 0..40) — растягивается только по ширине, высота свода постоянная */
const VAULT_PATH = 'M1,40 C1,26 22,18 38,12 C45,9 48,5 50,1 C52,5 55,9 62,12 C78,18 99,26 99,40';
const VAULT_HEIGHT = 'h-14'; // 56px; контенту внутри нужен отступ сверху не меньше ~64px

export function PishtaqFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 w-full ${VAULT_HEIGHT}`}
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
      >
        <path d={VAULT_PATH} fill="none" stroke="var(--color-gold)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity="0.85" />
      </svg>
      {/* Стойки и основание портала — на 1% от краёв, как и концы свода (x = 1 и 99) */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 top-14 border-x border-b border-gold/85"
        style={{ left: '1%', right: '1%' }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Маленькая арка-логотип */
export function PishtaqMark({ className = 'h-7 w-6' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 28" className={className}>
      <path d="M2,27 V12 C2,7 8,4 12,1 C16,4 22,7 22,12 V27" fill="none" stroke="var(--color-gold)" strokeWidth="1.6" />
      <path d="M6,27 V14 C6,11 9,9 12,6.5 C15,9 18,11 18,14 V27" fill="none" stroke="var(--color-terra)" strokeWidth="1.4" />
      <path d="M9,20 h6 l-1,4 h-4 Z" fill="var(--color-gold)" />
    </svg>
  );
}
