'use client';

// Конфетти из лепестков чайной розы — запускается при верном решении
import { useEffect, useRef } from 'react';

const COLORS = ['#f2c4c9', '#e8a0a8', '#d9707e', '#f7dde0', '#c95b6b'];
const DURATION_MS = 3200;

type Petal = { x: number; y: number; vx: number; vy: number; size: number; rot: number; vr: number; sway: number; phase: number; color: string };

export function PetalConfetti({ fireKey }: { fireKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (fireKey === 0) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // На телефоне — меньше лепестков, чтобы не тормозило
    const count = w < 640 ? 45 : 80;
    const petals: Petal[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: -20 - Math.random() * h * 0.5,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 1.2 + Math.random() * 1.8,
      size: 7 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.08,
      sway: 0.6 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const drawPetal = (p: Petal, t: number) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      // «Переворот» лепестка в воздухе — сжатие по одной оси
      ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(t / 400 + p.phase)));
      ctx.beginPath();
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.6, p.size * 0.7, p.size * 0.7, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.7, -p.size * 0.9, -p.size * 0.6, 0, -p.size);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.restore();
    };

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, w, h);
      const fade = t > DURATION_MS - 600 ? Math.max(0, (DURATION_MS - t) / 600) : 1;
      ctx.globalAlpha = fade;
      for (const p of petals) {
        p.x += p.vx + Math.sin(t / 500 + p.phase) * p.sway * 0.5;
        p.y += p.vy;
        p.rot += p.vr;
        drawPetal(p, t);
      }
      if (t < DURATION_MS) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [fireKey]);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}
