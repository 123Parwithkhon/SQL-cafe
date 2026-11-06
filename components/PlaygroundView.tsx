'use client';

// Песочница: свободные запросы без проверки на любой учебной базе.
// Можно менять данные (INSERT/UPDATE/DELETE) — меняется только копия в браузере.
// Сохранённые запросы — на устройстве; «поделиться» кладёт запрос прямо в ссылку.
import { useCallback, useEffect, useState } from 'react';
import type { QueryResult } from '@/lib/sql/compare';
import { diagnose, type Hint } from '@/lib/sql/diagnose';
import { preloadSql, resetDatabase, runSql, type BrowserRunResult } from '@/lib/sql/browser';
import { DB_NAMES, SCHEMAS, type DbName } from '@/lib/schema';
import { BASE_PATH, IS_STATIC } from '@/lib/env';
import type { DictKey } from '@/lib/i18n';
import { useLang } from './LangProvider';
import { SqlEditor } from './SqlEditor';
import { ResultTable } from './ResultTable';
import { ErSchema } from './ErSchema';
import { HintList } from './Feedback';
import { Check, Network, Play, RotateCcw, Save, Share2, Terminal, Trash2 } from './icons';

const SAVED_KEY = 'chaikhona:playground:saved';
const DRAFT_KEY = 'chaikhona:playground:draft';
const MAX_SAVED = 30;

type Saved = { id: string; name: string; db: DbName; sql: string };

function readSaved(): Saved[] {
  try {
    const list = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') as Saved[];
    return Array.isArray(list) ? list.filter((s) => s && typeof s.sql === 'string') : [];
  } catch {
    return [];
  }
}

function writeSaved(list: Saved[]) {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list.slice(0, MAX_SAVED)));
  } catch {
    // нет места — сохранённые запросы не обновятся
  }
}

/** base64url от UTF-8 — кириллица в запросе не ломается */
function encodeQuery(sql: string): string {
  const bytes = new TextEncoder().encode(sql);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Обратное к encodeQuery — для статической сборки, где ссылку разбирает браузер */
function decodeQuery(raw: string | null): string {
  if (!raw || raw.length > 4000) return '';
  try {
    const binary = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0))).slice(0, 2000);
  } catch {
    return '';
  }
}

type Props = {
  initialDb: DbName;
  initialSql: string;
  /** Статическая сборка: прочитать ?db= и ?q= из адреса в браузере (сервер этого сделать не может) */
  readFromUrl?: boolean;
};

export function PlaygroundView({ initialDb, initialSql, readFromUrl = false }: Props) {
  const { t } = useLang();
  const [db, setDb] = useState<DbName>(initialDb);
  const [sqlText, setSqlText] = useState(initialSql);
  // Ключ редактора: меняется, когда текст подставляется извне (загрузка сохранённого, черновик)
  const [editorKey, setEditorKey] = useState(0);
  const [editorValue, setEditorValue] = useState(initialSql);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ data: QueryResult; ms: number } | null>(null);
  const [note, setNote] = useState<{ kind: 'info' | 'error' | 'success'; text: string } | null>(null);
  const [hints, setHints] = useState<Hint[]>([]);
  // Схема свёрнута по умолчанию: на телефоне она заняла бы весь экран над редактором
  const [showSchema, setShowSchema] = useState(false);
  const [saved, setSaved] = useState<Saved[]>([]);

  // Черновик восстанавливаем, только если в ссылке не было запроса
  useEffect(() => {
    setSaved(readSaved());
    if (readFromUrl) {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = decodeQuery(params.get('q'));
      const dbParam = params.get('db');
      if (dbParam === 'chaikhana' || dbParam === 'bazaar') setDb(dbParam);
      if (fromUrl) {
        setSqlText(fromUrl);
        setEditorValue(fromUrl);
        setEditorKey((k) => k + 1);
        return;
      }
    }
    if (!initialSql) {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
          setSqlText(draft);
          setEditorValue(draft);
          setEditorKey((k) => k + 1);
        }
      } catch {
        // нет доступа к хранилищу — начинаем с пустого редактора
      }
    }
  }, [initialSql, readFromUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, sqlText);
    } catch {
      // черновик не сохранится — не страшно
    }
  }, [sqlText]);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    preloadSql(db).then(async (ok) => {
      if (ok) await resetDatabase(db);
      if (!cancelled) setReady(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  const describe = useCallback(
    (res: Exclude<BrowserRunResult, { ok: true }>) => {
      if (res.code === 'invalid') return t(`error.${res.validation}` as DictKey, { detail: res.detail ?? '' });
      if (res.code === 'sql_error') return t('error.sql_error', { message: res.message });
      return t(`error.${res.code}` as DictKey);
    },
    [t],
  );

  const run = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    setHints([]);
    const res = await runSql(sqlText, 'modify', db);
    if (!res.ok) {
      setResult(null);
      setNote({ kind: 'error', text: describe(res) });
      if (res.code === 'sql_error') setHints(diagnose({ sql: sqlText, schema: SCHEMAS[db], error: res.message }));
    } else if (res.result.columns.length === 0) {
      setResult(null);
      setNote({ kind: 'info', text: t('task.changes', { n: res.result.changes ?? 0 }) });
    } else {
      setResult({ data: res.result, ms: res.ms });
    }
    setBusy(false);
  }, [busy, sqlText, db, describe, t]);

  async function reset() {
    await resetDatabase(db);
    setResult(null);
    setHints([]);
    setNote({ kind: 'info', text: t('task.resetDone') });
  }

  function save() {
    const name = window.prompt(t('playground.saveName'), sqlText.trim().split('\n')[0].slice(0, 40));
    if (!name) return;
    const list = [{ id: String(Date.now()), name: name.slice(0, 60), db, sql: sqlText }, ...readSaved()];
    writeSaved(list);
    setSaved(list.slice(0, MAX_SAVED));
    setNote({ kind: 'success', text: t('playground.saved') });
  }

  function load(item: Saved) {
    setDb(item.db);
    setSqlText(item.sql);
    setEditorValue(item.sql);
    setEditorKey((k) => k + 1);
    setResult(null);
    setNote(null);
    setHints([]);
  }

  function remove(id: string) {
    const list = readSaved().filter((s) => s.id !== id);
    writeSaved(list);
    setSaved(list);
  }

  async function share() {
    const url = `${window.location.origin}${BASE_PATH}/playground${IS_STATIC ? '/' : ''}?db=${db}&q=${encodeQuery(sqlText)}`;
    try {
      await navigator.clipboard.writeText(url);
      setNote({ kind: 'success', text: t('playground.shared') });
    } catch {
      window.prompt(t('playground.copyManually'), url);
    }
  }

  const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-semibold transition disabled:opacity-50';

  return (
    <div>
      <h1 className="flex items-center gap-2 font-serif text-3xl font-bold text-fg">
        <Terminal size={28} className="text-gold" />
        {t('playground.title')}
      </h1>
      <p className="mt-2 text-fg/70">{t('playground.subtitle')}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div role="group" aria-label={t('playground.db')} className="flex overflow-hidden rounded-xl border border-gold/40 text-sm font-semibold">
          {DB_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setDb(name)}
              aria-pressed={db === name}
              className={`min-h-10 px-4 transition ${db === name ? 'bg-gold text-lazur' : 'text-fg/80 hover:bg-fg/5'}`}
            >
              {t(`db.${name}` as DictKey)}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setShowSchema((v) => !v)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-gold-soft hover:bg-fg/5">
          <Network size={16} />
          {showSchema ? t('task.schemaHide') : t('task.schema')}
        </button>
      </div>

      {showSchema && (
        <div className="mt-3 rounded-2xl bg-cream p-3">
          <ErSchema db={db} title={t(`er.title.${db}` as DictKey)} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <SqlEditor
            key={`${editorKey}-${db}`}
            initialValue={editorValue}
            onChange={(v) => {
              setSqlText(v);
              setEditorValue(v);
            }}
            onRun={run}
            placeholder={t('playground.placeholder')}
            ariaLabel={t('playground.placeholder')}
            schema={SCHEMAS[db]}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={run} disabled={busy || !ready} className={`${button} bg-terra text-white hover:bg-terra-dark`}>
              <Play size={16} className="fill-current" />
              {t('task.run')}
            </button>
            <button type="button" onClick={reset} disabled={busy} className={`${button} text-fg/80 hover:bg-fg/5`}>
              <RotateCcw size={16} />
              {t('task.reset')}
            </button>
            <button type="button" onClick={save} disabled={!sqlText.trim()} className={`${button} border border-gold/50 text-gold-soft hover:bg-fg/5`}>
              <Save size={16} />
              {t('playground.save')}
            </button>
            <button type="button" onClick={share} disabled={!sqlText.trim()} className={`${button} border border-gold/50 text-gold-soft hover:bg-fg/5`}>
              <Share2 size={16} />
              {t('playground.share')}
            </button>
          </div>

          {note && (
            <div
              role="status"
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                note.kind === 'error' ? 'bg-danger-soft text-danger' : note.kind === 'success' ? 'bg-emerald text-white' : 'bg-cream text-ink'
              }`}
            >
              {note.kind === 'success' && <Check size={16} />}
              {note.text}
            </div>
          )}
          <HintList hints={hints} />

          <div className="rounded-2xl bg-cream p-4 text-ink">
            {!ready ? (
              <p className="text-sm text-ink-soft">{t('result.loading')}</p>
            ) : result ? (
              <ResultTable result={result.data} ms={result.ms} />
            ) : (
              <p className="text-sm text-ink-soft">{t('result.empty')}</p>
            )}
          </div>
        </div>

        <aside className="min-w-0">
          <h2 className="font-serif text-lg font-bold text-gold">{t('playground.savedTitle')}</h2>
          {saved.length === 0 ? (
            <p className="mt-2 text-sm text-fg/60">{t('playground.savedEmpty')}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {saved.map((item) => (
                <li key={item.id} className="flex items-center gap-2 rounded-xl border border-gold/30 bg-panel px-3 py-2">
                  <button type="button" onClick={() => load(item)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-fg">{item.name}</span>
                    <span className="block text-xs text-fg/50">{t(`db.${item.db}` as DictKey)}</span>
                  </button>
                  <button type="button" onClick={() => remove(item.id)} aria-label={t('playground.delete')} className="rounded-lg p-2 text-fg/50 hover:bg-fg/5 hover:text-terra">
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
