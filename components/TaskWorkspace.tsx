'use client';

// Рабочая область задания: условие, редактор, запуск в браузере, проверка на сервере,
// разбор ошибок (подсказки по смыслу + «не хватает / лишнее»).
// variant: 'default' — страница задания, 'compact' — демо на главной, 'interview' — режим собеседования.
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { PublicTask } from '@/lib/tasks';
import type { QueryResult, RowDiff, Verdict } from '@/lib/sql/compare';
import { diagnose, type Hint } from '@/lib/sql/diagnose';
import { preloadSql, resetDatabase, runSql, type BrowserRunResult } from '@/lib/sql/browser';
import { DEFAULT_DB, SCHEMAS } from '@/lib/schema';
import { computeStreak, useProgress } from '@/lib/progress';
import { recordReview } from '@/lib/review';
import type { DictKey } from '@/lib/i18n';
import { useLang } from './LangProvider';
import { SqlEditor } from './SqlEditor';
import { ResultTable } from './ResultTable';
import { PetalConfetti } from './PetalConfetti';
import { ErSchema } from './ErSchema';
import { OtherSolutions } from './OtherSolutions';
import { DiffView, HintList } from './Feedback';
import { IS_STATIC } from '@/lib/env';
import { checkLocally } from '@/lib/sql/local-check';
import type { Tier } from '@/lib/course';
import {
  DAILY_GOAL, STREAK_MILESTONES, bumpCombo, celebrate, pickPraise, pickProverb, rankName, rankOf, readDaily, recordDaily,
  type CelebrationDetail,
} from '@/lib/motivation';

/** Пословица в поддержку после неудачной попытки */
function Encouragement({ seed }: { seed: number }) {
  const { lang, t } = useLang();
  const proverb = pickProverb(seed);
  return (
    <figure className="rounded-xl border-l-4 border-turquoise bg-panel px-4 py-2.5">
      <figcaption className="text-[11px] font-semibold uppercase tracking-wider text-turquoise-soft">{t('encourage.title')}</figcaption>
      <blockquote className="font-serif italic text-fg">«{proverb.tj}»</blockquote>
      {lang === 'ru' && <p className="text-xs text-fg/60">{proverb.ru}</p>}
    </figure>
  );
}
import { ArrowLeft, ArrowRight, BookOpen, Check, Lightbulb, Loader2, Network, Play, RotateCcw } from './icons';

type Message = { kind: 'success' | 'error' | 'info'; text: string } | null;

type CheckResponse =
  | { verdict: Verdict; saved?: boolean; hints?: Hint[]; diff?: RowDiff | null }
  | { error: string; code?: string; detail?: string; message?: string };

type Props = {
  task: PublicTask;
  prevId?: number;
  nextId?: number;
  variant?: 'default' | 'compact' | 'interview';
  /** Вызывается после верного решения (режим собеседования) */
  onSolved?: () => void;
  /** Задания уровня — чтобы отпраздновать прохождение уровня целиком */
  tierTaskIds?: number[];
  tierId?: Tier;
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function TaskWorkspace({ task, prevId, nextId, variant = 'default', onSolved, tierTaskIds, tierId }: Props) {
  const { lang, t } = useLang();
  const { progress, markSolved } = useProgress();
  const [failCount, setFailCount] = useState(0);
  const [sqlText, setSqlText] = useState('');
  const [engineReady, setEngineReady] = useState(false);
  const [busy, setBusy] = useState<'run' | 'check' | null>(null);
  const [result, setResult] = useState<{ data: QueryResult; ms: number; caption?: string } | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [errorHints, setErrorHints] = useState<Hint[]>([]);
  const [diff, setDiff] = useState<RowDiff | null>(null);
  const [hintsShown, setHintsShown] = useState(0);
  const [confetti, setConfetti] = useState(0);
  const [justSolved, setJustSolved] = useState(false);
  const [savedToAccount, setSavedToAccount] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  const compact = variant === 'compact';
  const interview = variant === 'interview';
  const full = variant === 'default';
  const db = task.db ?? DEFAULT_DB;
  const schema = SCHEMAS[db];
  const solved = progress.solved.includes(task.id);
  const mode = task.topic === 'modify' ? 'modify' : 'select';
  const title = lang === 'tj' ? task.title_tj : task.title_ru;
  const text = lang === 'tj' ? task.task_tj : task.task_ru;
  const hints = lang === 'tj' ? task.hints_tj : task.hints;

  useEffect(() => {
    let cancelled = false;
    preloadSql(db).then(async (ok) => {
      // Каждое задание начинается с исходной базы: изменения из песочницы не переносятся
      if (ok) await resetDatabase(db);
      if (cancelled) return;
      setEngineReady(ok);
      if (!ok) setMessage({ kind: 'error', text: t('error.load_failed') });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  const describeLocalError = useCallback(
    (res: Exclude<BrowserRunResult, { ok: true }>): string => {
      if (res.code === 'invalid') return t(`error.${res.validation}` as DictKey, { detail: res.detail ?? '' });
      if (res.code === 'sql_error') return t('error.sql_error', { message: res.message });
      return t(`error.${res.code}` as DictKey);
    },
    [t],
  );

  const describeVerdict = useCallback(
    (v: Verdict): string => {
      if (v.ok) return t('verdict.ok');
      if (v.code === 'columns_count' || v.code === 'row_count') return t(`verdict.${v.code}`, { expected: v.expected, actual: v.actual });
      if (v.code === 'column_names') return t('verdict.column_names', { expected: v.expected.join(', ') });
      if (v.code === 'table_rows') return t('verdict.table_rows', { table: v.table, expected: v.expected, actual: v.actual });
      if (v.code === 'table_values') return t('verdict.table_values', { table: v.table });
      return t(`verdict.${v.code}` as DictKey);
    },
    [t],
  );

  const clearFeedback = () => {
    setMessage(null);
    setErrorHints([]);
    setDiff(null);
  };

  /**
   * Выполняет запрос в браузере и показывает таблицу. Возвращает true при успехе.
   * В песочнице после INSERT/UPDATE/DELETE показываем, как выглядит изменённая таблица.
   */
  const runLocal = useCallback(async (): Promise<boolean> => {
    const res = await runSql(sqlText, mode, db);
    if (!res.ok) {
      setResult(null);
      setMessage({ kind: 'error', text: describeLocalError(res) });
      if (res.code === 'sql_error') setErrorHints(diagnose({ sql: sqlText, schema, error: res.message }));
      return false;
    }
    if (mode === 'modify' && res.result.columns.length === 0) {
      const table = task.tables[0];
      const after = await runSql(`SELECT * FROM ${table}`, 'select', db);
      setMessage({ kind: 'info', text: t('task.changes', { n: res.result.changes ?? 0 }) });
      if (after.ok) setResult({ data: after.result, ms: res.ms, caption: t('task.tableAfter', { table }) });
      return true;
    }
    setResult({ data: res.result, ms: res.ms });
    return true;
  }, [sqlText, mode, db, schema, task.tables, describeLocalError, t]);

  const handleReset = useCallback(async () => {
    if (busy) return;
    await resetDatabase(db);
    setResult(null);
    clearFeedback();
    setMessage({ kind: 'info', text: t('task.resetDone') });
  }, [busy, db, t]);

  const handleRun = useCallback(async () => {
    if (busy) return;
    setBusy('run');
    clearFeedback();
    await runLocal();
    setBusy(null);
  }, [busy, runLocal]);

  const handleCheck = useCallback(async () => {
    if (busy) return;
    setBusy('check');
    clearFeedback();
    try {
      // В песочнице показываем результат на чистой базе — как его увидит сервер
      if (mode === 'modify') await resetDatabase(db);
      if (!(await runLocal())) return;

      let data: CheckResponse;
      if (IS_STATIC) {
        // GitHub Pages: сервера нет — сравниваем с эталоном прямо в браузере
        data = await checkLocally(task, sqlText);
      } else {
        try {
          const response = await fetch('/api/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: task.id, sql: sqlText }),
          });
          data = (await response.json()) as CheckResponse;
        } catch {
          setMessage({ kind: 'error', text: t('error.network') });
          return;
        }
      }

      if ('verdict' in data) {
        setErrorHints(data.hints ?? []);
        setDiff(data.diff ?? null);
        if (data.verdict.ok) {
          // Состояние «до» — чтобы понять, что изменилось: звание, уровень, серия, цель дня
          const before = progress.solved;
          const wasNew = !before.includes(task.id);
          const countBefore = before.length;
          const countAfter = countBefore + (wasNew ? 1 : 0);
          const streakBefore = computeStreak(progress.days);
          const streakAfter = computeStreak([...progress.days, todayStr()]);
          const dailyBefore = readDaily();
          const dailyAfter = recordDaily(task.id);
          const combo = bumpCombo(true);
          const praise = pickPraise(task.id + combo);

          const comboText = combo >= 3 ? ` · ${t('combo', { n: combo })}` : '';
          setMessage({ kind: 'success', text: `${praise.tj} ${describeVerdict(data.verdict)}${comboText}` });
          markSolved(task.id);
          recordReview(task.id, task.topic);
          setSavedToAccount(Boolean(data.saved));
          setJustSolved(true);
          setConfetti((n) => n + 1);
          onSolved?.();

          // Один, самый значимый праздник — чтобы окна не сыпались одно за другим.
          // В собеседовании не отвлекаем: идёт таймер.
          if (!interview) {
            let detail: CelebrationDetail | null = null;
            const tierDone = wasNew && tierTaskIds && tierTaskIds.length > 0 && tierTaskIds.every((id) => id === task.id || before.includes(id));
            if (tierDone && tierId) {
              detail = { kind: 'tier', title: t('celebrate.tier.title'), text: t('celebrate.tier.text', { tier: t(`tier.${tierId}` as DictKey) }) };
            } else if (rankOf(countAfter).index > rankOf(countBefore).index) {
              detail = { kind: 'rank', title: t('celebrate.rank.title'), text: t('celebrate.rank.text', { rank: rankName(rankOf(countAfter).rank, lang) }) };
            } else if (streakAfter > streakBefore && STREAK_MILESTONES.includes(streakAfter)) {
              detail = { kind: 'streak', title: t('celebrate.streak.title', { n: streakAfter }), text: t('celebrate.streak.text') };
            } else if (dailyBefore < DAILY_GOAL && dailyAfter >= DAILY_GOAL) {
              detail = { kind: 'daily', title: t('celebrate.daily.title'), text: t('celebrate.daily.text') };
            }
            if (detail) {
              const d = detail;
              setTimeout(() => celebrate(d), 900);
            }
          }
        } else {
          bumpCombo(false);
          setFailCount((n) => n + 1);
          setMessage({ kind: 'error', text: describeVerdict(data.verdict) });
        }
      } else if (data.error === 'invalid_sql') {
        setMessage({ kind: 'error', text: t(`error.${data.code ?? 'forbidden'}` as DictKey, { detail: data.detail ?? '' }) });
      } else if (data.error === 'sql_error') {
        setMessage({ kind: 'error', text: t('error.sql_error', { message: data.message ?? '' }) });
        setErrorHints(diagnose({ sql: sqlText, schema, error: data.message }));
      } else if (['timeout', 'memory', 'rate_limited', 'busy'].includes(data.error)) {
        setMessage({ kind: 'error', text: t(`error.${data.error}` as DictKey) });
      } else {
        setMessage({ kind: 'error', text: t('error.internal') });
      }
    } finally {
      setBusy(null);
    }
  }, [busy, mode, db, schema, runLocal, task.id, task.topic, sqlText, t, lang, describeVerdict, markSolved, onSolved, progress, interview, tierTaskIds, tierId]);

  const buttonBase = 'inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-base font-semibold transition disabled:opacity-50';

  return (
    // grid-cols-1 = minmax(0, 1fr): широкий контент (ER-схема, таблица) прокручивается внутри, а не растягивает страницу
    <div className={compact ? 'min-w-0' : 'grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]'}>
      <PetalConfetti fireKey={confetti} />

      {/* Условие */}
      <section className={`min-w-0 rounded-2xl bg-cream p-5 text-ink shadow-lg ${compact ? 'mb-4' : ''}`}>
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-ink-soft">
          {!interview && (
            <>
              <span>
                {t('task.label')} {task.id}
              </span>
              <span aria-hidden>·</span>
            </>
          )}
          <span>{t(`topic.${task.topic}` as DictKey)}</span>
          <span aria-hidden>·</span>
          <span>{t(`level.${task.level}` as DictKey)}</span>
          {db !== DEFAULT_DB && <span className="rounded-full bg-lazur px-2 py-0.5 normal-case tracking-normal text-on-dark">{t(`db.${db}` as DictKey)}</span>}
          {solved && !interview && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald px-2 py-0.5 font-semibold normal-case tracking-normal text-white">
              <Check size={12} strokeWidth={3} />
              {t('task.solvedBadge')}
            </span>
          )}
        </div>
        <h1 className="font-serif text-2xl font-bold text-lazur">{title}</h1>
        <p className="mt-3 leading-relaxed">{text}</p>

        <div className="mt-4">
          <div className="mb-1 text-xs uppercase tracking-wide text-ink-soft">{t('task.tables')}</div>
          <div className="flex flex-col gap-1.5">
            {task.tables.map((name) => (
              <div key={name} className="rounded-lg bg-white/60 px-3 py-2 font-mono text-sm">
                <span className="font-semibold text-terra">{name}</span>
                <span className="text-ink-soft"> ({schema[name]?.join(', ')})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setShowSchema((v) => !v)}
            aria-expanded={showSchema}
            className="inline-flex items-center gap-1.5 text-lazur underline-offset-4 hover:underline"
          >
            <Network size={16} />
            {showSchema ? t('task.schemaHide') : t('task.schema')}
          </button>
          {full && (
            <Link href={`/learn/${task.topic}`} className="inline-flex items-center gap-1.5 text-lazur underline-offset-4 hover:underline">
              <BookOpen size={16} />
              {t('task.theory')}
            </Link>
          )}
        </div>
        {showSchema && (
          <div className="mt-3">
            <ErSchema db={db} highlight={task.tables} title={t(`er.title.${db}` as DictKey)} />
            <p className="mt-1.5 text-xs text-ink-soft">{t('er.legend')}</p>
          </div>
        )}

        {full && (
          <div className="mt-4">
            {hints.slice(0, hintsShown).map((hint, i) => (
              <p key={i} className="mb-2 flex gap-2 rounded-lg border-l-4 border-gold bg-gold/15 px-3 py-2 text-sm">
                <Lightbulb size={16} className="mt-0.5 shrink-0 text-[#b07d22]" />
                {hint}
              </p>
            ))}
            <button
              type="button"
              onClick={() => setHintsShown((n) => n + 1)}
              disabled={hintsShown >= hints.length}
              className="text-sm font-semibold text-terra underline-offset-4 hover:underline disabled:text-ink-soft disabled:no-underline"
            >
              {hintsShown >= hints.length ? t('task.noMoreHints') : hintsShown === 0 ? t('task.hint') : t('task.hintMore')}
            </button>
          </div>
        )}
      </section>

      {/* Редактор и результат */}
      <section className="flex min-w-0 flex-col gap-3">
        <SqlEditor
          key={task.id}
          initialValue=""
          onChange={setSqlText}
          onRun={handleRun}
          placeholder={t('task.placeholder')}
          ariaLabel={t('task.placeholder')}
          schema={schema}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleRun} disabled={!!busy} className={`${buttonBase} gap-2 border border-gold/60 text-gold-soft hover:bg-fg/5`}>
            <Play size={16} className="fill-current" />
            {t('task.run')}
          </button>
          <button type="button" onClick={handleCheck} disabled={!!busy || (interview && justSolved)} className={`${buttonBase} gap-2 bg-terra text-white hover:bg-terra-dark`}>
            {busy === 'check' ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={2.5} />}
            {busy === 'check' ? t('task.checking') : t('task.check')}
          </button>
          {mode === 'modify' && (
            <button type="button" onClick={handleReset} disabled={!!busy} className={`${buttonBase} gap-2 text-fg/80 hover:bg-fg/5`}>
              <RotateCcw size={16} />
              {t('task.reset')}
            </button>
          )}
          <span className="ml-auto hidden text-xs text-fg/50 sm:inline">{t('task.shortcut')}</span>
        </div>

        {message && (
          <div
            role="status"
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              message.kind === 'success' ? 'bg-emerald text-white' : message.kind === 'error' ? 'bg-danger-soft text-danger' : 'bg-cream text-ink'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* В собеседовании подсказок нет — как на настоящем интервью */}
        {!interview && <HintList hints={errorHints} />}
        {!interview && diff && <DiffView diff={diff} />}
        {/* Поддержка после ошибки: ошибаться — нормально, так и учатся */}
        {!interview && failCount > 0 && message?.kind === 'error' && (
          <Encouragement seed={failCount + task.id} />
        )}

        {justSolved && full && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gold/40 bg-panel px-4 py-3 text-sm">
            <span className="text-gold-soft">{savedToAccount ? t('progress.savedAccount') : t('progress.saved')}</span>
            {nextId && (
              <Link href={`/trainer/${nextId}`} className={`${buttonBase} ml-auto gap-2 bg-emerald text-white hover:brightness-110`}>
                {t('task.next')}
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        )}
        {justSolved && compact && nextId && (
          <Link href={`/trainer/${nextId}`} className={`${buttonBase} gap-2 self-start bg-emerald text-white hover:brightness-110`}>
            {t('task.next')}
            <ArrowRight size={18} />
          </Link>
        )}

        <div className="rounded-2xl bg-cream p-4 text-ink">
          {!engineReady ? (
            <p className="text-sm text-ink-soft">{t('result.loading')}</p>
          ) : result ? (
            <>
              {result.caption && <p className="mb-2 text-sm font-semibold text-lazur">{result.caption}</p>}
              <ResultTable result={result.data} ms={result.ms} />
            </>
          ) : (
            <p className="text-sm text-ink-soft">{t('result.empty')}</p>
          )}
        </div>

        {full && !IS_STATIC && (solved || justSolved) && <OtherSolutions key={`${task.id}-${justSolved}`} taskId={task.id} />}

        {full && (
          <nav className="flex justify-between text-sm">
            {prevId ? (
              <Link href={`/trainer/${prevId}`} className="inline-flex items-center gap-1 text-fg/70 hover:text-gold-soft">
                <ArrowLeft size={16} />
                {t('task.prev')}
              </Link>
            ) : (
              <span />
            )}
            {nextId && !justSolved && (
              <Link href={`/trainer/${nextId}`} className="inline-flex items-center gap-1 text-fg/70 hover:text-gold-soft">
                {t('task.next')}
                <ArrowRight size={16} />
              </Link>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
