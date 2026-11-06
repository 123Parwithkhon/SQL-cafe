// lib/db.ts — база данных платформы: пользователи, решения, дни активности.
//
// • DATABASE_URL задан  → PostgreSQL (Neon, Supabase или свой сервер) через postgres.js.
// • DATABASE_URL не задан → встроенный PostgreSQL (PGlite) в папке .data/ — для локальной
//   разработки без всякой настройки. На Vercel так нельзя: файловая система там временная.
//
// Все запросы — только параметризованные ($1, $2, ...), никакой склейки строк.
import 'server-only';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

type Row = Record<string, unknown>;
type Driver = { query<T extends Row>(sql: string, params?: unknown[]): Promise<T[]> };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  provider      TEXT NOT NULL,
  provider_id   TEXT NOT NULL,
  name          TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  image         TEXT,
  city          TEXT,
  university    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_id)
);

-- Одна строка на пару (пользователь, задание). verified = решение проверено сервером;
-- задания, перенесённые из браузера при первом входе, — verified = false и 0 очков.
CREATE TABLE IF NOT EXISTS solves (
  user_id    BIGINT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id    INTEGER NOT NULL CHECK (task_id > 0),
  sql        TEXT CHECK (length(sql) <= 2000),
  points     INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  verified   BOOLEAN NOT NULL DEFAULT false,
  solved_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, task_id)
);
CREATE INDEX IF NOT EXISTS idx_solves_task ON solves (task_id) WHERE verified;
CREATE INDEX IF NOT EXISTS idx_solves_time ON solves (solved_at) WHERE verified;

-- Сертификаты за пройденный уровень. Имя сохраняется на момент выдачи: сертификат не меняется,
-- даже если пользователь потом переименуется.
CREATE TABLE IF NOT EXISTS certificates (
  code       TEXT PRIMARY KEY CHECK (code ~ '^[A-Z0-9]{10}$'),
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier       TEXT   NOT NULL,
  name       TEXT   NOT NULL,
  task_count INTEGER NOT NULL,
  issued_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tier)
);

-- Дни, когда пользователь решал задания (по времени Душанбе) — для streak
CREATE TABLE IF NOT EXISTS activity (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day     DATE   NOT NULL,
  PRIMARY KEY (user_id, day)
);
`;

function createPostgres(url: string): Driver {
  // Ленивая загрузка, чтобы локально без DATABASE_URL пакет не требовался
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const postgres = require('postgres') as typeof import('postgres');
  const sql = postgres(url, { max: 5, idle_timeout: 20, prepare: false });
  return {
    async query<T extends Row>(text: string, params: unknown[] = []) {
      return (await sql.unsafe(text, params as never[])) as unknown as T[];
    },
  };
}

async function createPglite(): Promise<Driver> {
  if (process.env.VERCEL) {
    throw new Error('DATABASE_URL не задан: на Vercel нужна внешняя база PostgreSQL (например, Neon)');
  }
  const { PGlite } = await import('@electric-sql/pglite');
  // PGLITE_DIR — своя папка базы (например, для автотестов): один каталог PGlite
  // нельзя открывать из двух процессов одновременно
  const dir = process.env.PGLITE_DIR || path.join(process.cwd(), '.data', 'pglite');
  // PGlite создаёт только последнюю папку пути — родительскую .data создаём сами
  mkdirSync(path.dirname(dir), { recursive: true });
  const db = await PGlite.create(dir);
  return {
    async query<T extends Row>(text: string, params: unknown[] = []) {
      return (await db.query<T>(text, params)).rows;
    },
  };
}

// Один драйвер и одна миграция на процесс (в dev переживает горячую перезагрузку)
const globalDb = globalThis as unknown as { __chaikhanaDb?: Promise<Driver> };

async function init(): Promise<Driver> {
  const driver = process.env.DATABASE_URL ? createPostgres(process.env.DATABASE_URL) : await createPglite();
  for (const statement of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
    await driver.query(statement);
  }
  return driver;
}

function getDb(): Promise<Driver> {
  globalDb.__chaikhanaDb ??= init().catch((err) => {
    globalDb.__chaikhanaDb = undefined; // следующая попытка начнёт заново
    throw err;
  });
  return globalDb.__chaikhanaDb;
}

export async function query<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await getDb()).query<T>(sql, params);
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL) || !process.env.VERCEL;
}
