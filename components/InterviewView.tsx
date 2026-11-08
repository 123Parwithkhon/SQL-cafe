'use client';

// Режим «Собеседование»: 10 случайных задач уровней «Мастер» и «Эксперт» за 30 минут, без подсказок.
// В конце — отчёт: сколько решено, время по задачам, какие темы повторить.
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicTask } from '@/lib/tasks';
import { taskPath } from '@/lib/task-path';
import type { DictKey } from '@/lib/i18n';
import { useLang } from './LangProvider';
import { PishtaqFrame } from './Pishtaq';
import { TaskWorkspace } from './TaskWorkspace';
import { ArrowRight, BookOpen, Check, RotateCcw, SkipForward, Timer, Trophy } from './icons';

const TASKS_COUNT = 10;
const DURATION_SEC = 30 * 60;
const BEST_KEY = 'chaikhona:interview:best';

type Attempt = { taskId: number; solved: boolean; seconds: number };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

function readBest(): number | null {
  try {
    const v = localStorage.getItem(BEST_KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

export function InterviewView({ pool }: { pool: PublicTask[] }) {
  const { lang, t } = useLang();
  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>('intro');
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [left, setLeft] = useState(DURATION_SEC);
  const [solvedCurrent, setSolvedCurrent] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const taskStart = useRef(0);

  useEffect(() => setBest(readBest()), []);

  const finish = useCallback((all: Attempt[]) => {
    setAttempts(all);
    setPhase('done');
    const score = all.filter((a) => a.solved).length;
    const prev = readBest();
    if (prev === null || score > prev) {
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        // не сохранилось — не страшно
      }
      setBest(score);
    }
  }, []);

  // Таймер; по истечении времени оставшиеся задачи считаются нерешёнными
  useEffect(() => {
    if (phase !== 'running') return;
    const timer = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running' || left > 0) return;
    const spent = Math.round((Date.now() - taskStart.current) / 1000);
    const rest = tasks.slice(index).map((task, i) => ({ taskId: task.id, solved: i === 0 && solvedCurrent, seconds: i === 0 ? spent : 0 }));
    finish([...attempts, ...rest]);
  }, [left, phase, tasks, index, attempts, solvedCurrent, finish]);

  function start() {
    // Берём по кругу: по одной случайной задаче из каждой темы, пока не наберётся 10 —
    // так в собеседовании будут и JOIN, и подзапросы, и оконные функции
    const byTopic = new Map<string, PublicTask[]>();
    for (const task of shuffle(pool)) byTopic.set(task.topic, [...(byTopic.get(task.topic) ?? []), task]);
    const queues = shuffle([...byTopic.values()]);
    const picked: PublicTask[] = [];
    while (picked.length < TASKS_COUNT && queues.some((q) => q.length > 0)) {
      for (const queue of queues) {
        const task = queue.shift();
        if (task && picked.length < TASKS_COUNT) picked.push(task);
      }
    }
    setTasks(picked);
    setIndex(0);
    setAttempts([]);
    setLeft(DURATION_SEC);
    setSolvedCurrent(false);
    taskStart.current = Date.now();
    setPhase('running');
  }

  function next(solved: boolean) {
    const attempt = { taskId: tasks[index].id, solved, seconds: Math.round((Date.now() - taskStart.current) / 1000) };
    const all = [...attempts, attempt];
    if (index + 1 >= tasks.length) {
      finish(all);
      return;
    }
    setAttempts(all);
    setIndex(index + 1);
    setSolvedCurrent(false);
    taskStart.current = Date.now();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const titleOf = (id: number) => {
    const task = pool.find((x) => x.id === id);
    return task ? (lang === 'tj' ? task.title_tj : task.title_ru) : `#${id}`;
  };

  if (phase === 'intro') {
    return (
      <div className="mx-auto max-w-2xl">
        <PishtaqFrame className="px-6 pb-8 pt-20 text-center sm:px-10">
          <Timer size={40} className="mx-auto text-gold" />
          <h1 className="mt-3 font-serif text-3xl font-bold text-fg">{t('interview.title')}</h1>
          <p className="mt-3 text-fg/75">{t('interview.intro', { n: TASKS_COUNT, min: DURATION_SEC / 60 })}</p>
          <ul className="mx-auto mt-5 max-w-md space-y-2 text-left text-sm text-fg/80">
            {(['interview.rule1', 'interview.rule2', 'interview.rule3'] as const).map((key) => (
              <li key={key} className="flex gap-2">
                <Check size={18} className="mt-0.5 shrink-0 text-gold" />
                {t(key)}
              </li>
            ))}
          </ul>
          {best !== null && <p className="mt-5 text-sm text-gold-soft">{t('interview.best', { n: best, total: TASKS_COUNT })}</p>}
          <button type="button" onClick={start} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-terra px-6 text-lg font-semibold text-white hover:bg-terra-dark">
            {t('interview.start')}
            <ArrowRight size={20} />
          </button>
        </PishtaqFrame>
      </div>
    );
  }

  if (phase === 'done') {
    const score = attempts.filter((a) => a.solved).length;
    const total = attempts.reduce((s, a) => s + a.seconds, 0);
    const weak = [...new Set(attempts.filter((a) => !a.solved).map((a) => pool.find((x) => x.id === a.taskId)?.topic).filter(Boolean))] as string[];
    const verdict = score >= 8 ? 'interview.great' : score >= 5 ? 'interview.good' : 'interview.practice';
    return (
      <div className="mx-auto max-w-3xl">
        <PishtaqFrame className="px-6 pb-8 pt-20 text-center">
          <Trophy size={40} className="mx-auto text-gold" />
          <h1 className="mt-3 font-serif text-3xl font-bold text-fg">{t('interview.result', { n: score, total: attempts.length })}</h1>
          <p className="mt-2 text-fg/75">{t(verdict)}</p>
          <p className="mt-1 text-sm text-fg/60">{t('interview.totalTime', { time: mmss(total) })}</p>
        </PishtaqFrame>

        <ol className="mt-6 overflow-hidden rounded-2xl bg-cream text-ink">
          {attempts.map((a, i) => (
            <li key={a.taskId} className="flex items-center gap-3 border-b border-cream-dark/60 px-4 py-3 last:border-b-0">
              <span className="w-6 text-sm font-bold text-ink-soft">{i + 1}</span>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${a.solved ? 'bg-emerald text-white' : 'bg-danger-soft text-danger'}`}>
                {a.solved ? <Check size={16} strokeWidth={3} /> : '—'}
              </span>
              <Link href={taskPath(pool.find((x) => x.id === a.taskId)?.num ?? 1)} className="min-w-0 flex-1 truncate font-semibold hover:underline">{titleOf(a.taskId)}</Link>
              <span className="shrink-0 font-mono text-xs text-ink-soft">{mmss(a.seconds)}</span>
            </li>
          ))}
        </ol>

        {weak.length > 0 && (
          <div className="mt-6 rounded-2xl border border-gold/40 bg-panel p-4">
            <h2 className="font-semibold text-gold-soft">{t('interview.weak')}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {weak.map((topic) => (
                <Link key={topic} href={`/learn/${topic}`} className="inline-flex items-center gap-1.5 rounded-lg bg-cream px-3 py-2 text-sm font-semibold text-lazur">
                  <BookOpen size={15} />
                  {t(`topic.${topic}` as DictKey)}
                </Link>
              ))}
            </div>
          </div>
        )}

        <button type="button" onClick={start} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-terra px-5 font-semibold text-white hover:bg-terra-dark">
          <RotateCcw size={18} />
          {t('interview.again')}
        </button>
      </div>
    );
  }

  const task = tasks[index];
  return (
    <div>
      <div className="sticky top-[69px] z-30 -mx-4 mb-4 flex items-center gap-3 border-b border-gold/30 bg-page/95 px-4 py-2 backdrop-blur">
        <span className="text-sm font-semibold text-fg">{t('interview.progress', { n: index + 1, total: tasks.length })}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/10">
          <div className="h-full bg-gold transition-all" style={{ width: `${(index / tasks.length) * 100}%` }} />
        </div>
        <span className={`flex items-center gap-1 font-mono text-sm font-bold ${left < 120 ? 'text-terra' : 'text-gold-soft'}`}>
          <Timer size={16} />
          {mmss(left)}
        </span>
      </div>

      <TaskWorkspace key={task.id} task={task} variant="interview" onSolved={() => setSolvedCurrent(true)} />

      <div className="mt-4 flex justify-end gap-3">
        {solvedCurrent ? (
          <button type="button" onClick={() => next(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald px-5 font-semibold text-white hover:brightness-110">
            {index + 1 >= tasks.length ? t('interview.finish') : t('interview.next')}
            <ArrowRight size={18} />
          </button>
        ) : (
          <button type="button" onClick={() => next(false)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-fg/20 px-5 font-semibold text-fg/80 hover:bg-fg/5">
            <SkipForward size={18} />
            {t('interview.skip')}
          </button>
        )}
      </div>
    </div>
  );
}
