// Орнаменты в духе таджикской изразцовой керамики и сюзане.
// Только геометрия (гирих, ромбы, розетки) — тонко и сдержанно, без «восточного клипарта».

/** Горизонтальная орнаментальная лента — под шапкой, над подвалом, между разделами */
export function OrnamentBand({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`ornament-band h-3 w-full ${className}`} />
  );
}

/** Разделитель с розеткой посередине — для заголовков разделов */
export function OrnamentDivider({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center gap-3 ${className}`}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-gold/70" />
      <Rosette className="h-5 w-5 shrink-0 text-gold" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/50 to-gold/70" />
    </div>
  );
}

/** Восьмилучевая розетка — мотив изразцов медресе */
export function Rosette({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <rect x="6" y="6" width="12" height="12" />
        <rect x="6" y="6" width="12" height="12" transform="rotate(45 12 12)" />
      </g>
      <circle cx="12" cy="12" r="2.2" fill="var(--color-turquoise)" />
    </svg>
  );
}
