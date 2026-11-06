'use client';

// Праздник: новое звание, «чайник дня», пройденный уровень, серия дней.
// Глобальный: любой компонент вызывает celebrate(...) из lib/motivation.
import { useEffect, useState } from 'react';
import { CELEBRATE_EVENT, type CelebrationDetail } from '@/lib/motivation';
import { useLang } from './LangProvider';
import { PetalConfetti } from './PetalConfetti';
import { Rosette } from './Ornament';
import { Award, Flame, Star, Trophy, type IconComponent } from './icons';

const ICONS: Record<CelebrationDetail['kind'], IconComponent> = { rank: Star, daily: Award, tier: Trophy, streak: Flame };

export function Celebration() {
  const { t } = useLang();
  const [current, setCurrent] = useState<CelebrationDetail | null>(null);
  const [fire, setFire] = useState(0);

  useEffect(() => {
    const onCelebrate = (event: Event) => {
      setCurrent((event as CustomEvent<CelebrationDetail>).detail);
      setFire((n) => n + 1);
    };
    window.addEventListener(CELEBRATE_EVENT, onCelebrate);
    return () => window.removeEventListener(CELEBRATE_EVENT, onCelebrate);
  }, []);

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCurrent(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current]);

  if (!current) return <PetalConfetti fireKey={0} />;
  const Icon = ICONS[current.kind];

  return (
    <>
      <PetalConfetti fireKey={fire} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setCurrent(null)}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="celebration-title"
          className="pop-in relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-gold bg-panel p-6 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div aria-hidden className="ornament-band absolute inset-x-0 top-0 h-3" />
          <div className="mx-auto mt-3 flex h-16 w-16 items-center justify-center rounded-full bg-gold text-lazur">
            <Icon size={30} />
          </div>
          <Rosette className="mx-auto mt-3 h-5 w-5 text-gold" />
          <h2 id="celebration-title" className="mt-2 font-serif text-2xl font-bold text-fg">{current.title}</h2>
          <p className="mt-2 text-fg/75">{current.text}</p>
          <button
            type="button"
            autoFocus
            onClick={() => setCurrent(null)}
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-terra px-6 font-semibold text-white hover:bg-terra-dark"
          >
            {t('celebrate.ok')}
          </button>
          <div aria-hidden className="ornament-band absolute inset-x-0 bottom-0 h-3" />
        </div>
      </div>
    </>
  );
}
