// scripts/check-tasks.mjs — проверяет content/tasks.json: формат каждого задания
// и то, что эталонное решение выполняется на базе «Чайхана» и возвращает строки.
// Решения выполняются на sql.js с теми же ограничениями, что и на сервере
// (lib/sql/server-runner.ts), — значит, что прошло здесь, пройдёт и там.
// Запуск: npm run tasks:check (после npm run db:seed)
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tasksPath = path.join(root, 'content', 'tasks.json');

const KEYS = ['id', 'topic', 'level', 'title_ru', 'title_tj', 'task_ru', 'task_tj', 'tables', 'solution', 'hints', 'hints_tj'];
const OPTIONAL_KEYS = ['db'];
// Порядок тем совпадает с lib/course.ts — задания должны идти по курсу
const TOPICS = ['intro', 'select', 'where', 'order', 'functions', 'aggregate', 'join', 'subquery', 'set', 'modify', 'cte', 'window', 'analytics', 'final'];
const SQL_TYPES = ['INTEGER', 'INT', 'REAL', 'TEXT', 'NUMERIC', 'BLOB'];
const LEVELS = ['easy', 'medium', 'hard'];
// Должно совпадать с lib/schema.ts
const DB_TABLES = {
  chaikhana: ['visitors', 'tables', 'teas', 'orders', 'order_items'],
  bazaar: ['vendors', 'products', 'sales'],
};
const DB_FILES = { chaikhana: 'chaikhana.sqlite', bazaar: 'bazaar.sqlite' };

for (const file of Object.values(DB_FILES)) {
  if (!existsSync(path.join(root, 'public', file))) {
    console.error(`✗ Нет public/${file} — сначала выполните npm run db:seed`);
    process.exit(1);
  }
}

let tasks;
try {
  tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));
} catch (err) {
  console.error(`✗ content/tasks.json не читается: ${err.message}`);
  process.exit(1);
}

const SQL = await createRequire(import.meta.url)(path.join(root, 'vendor', 'sqljs', 'sql-wasm.js'))();
const dbBytes = Object.fromEntries(Object.entries(DB_FILES).map(([name, file]) => [name, readFileSync(path.join(root, 'public', file))]));

/** Свежая копия базы с ограничениями, как на сервере */
function freshDb(name = 'chaikhana') {
  const db = new SQL.Database(dbBytes[name]);
  for (const name of ['printf', 'format']) {
    for (let arity = 0; arity <= 8; arity++) {
      const blocked = () => { throw new Error(`функция ${name} отключена на сервере`); };
      Object.defineProperty(blocked, 'length', { value: arity });
      db.create_function(name, blocked);
    }
  }
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

const totalChanges = (db) => db.exec('SELECT total_changes()')[0].values[0][0];

/** Выполняет запрос на свежей копии; для DML возвращает число изменённых строк, иначе — строк результата */
function runOnFresh(sql, { modify = false, after, db: name = 'chaikhana' } = {}) {
  const db = freshDb(name);
  try {
    const before = totalChanges(db);
    const stmt = db.prepare(sql);
    let rows = 0;
    try {
      while (stmt.step()) rows++;
    } finally {
      stmt.free();
    }
    if (after) db.exec(after);
    return modify ? totalChanges(db) - before : rows;
  } finally {
    db.close();
  }
}

const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const seenIds = new Set();
let failed = 0;
let lastTopicIndex = 0;

for (const [index, task] of tasks.entries()) {
  const errors = [];
  const keys = Object.keys(task);

  const required = keys.filter((k) => !OPTIONAL_KEYS.includes(k));
  if (required.join() !== KEYS.join() || keys.slice(0, KEYS.length).join() !== KEYS.join()) {
    errors.push(`поля должны быть ровно: ${KEYS.join(', ')} (+ необязательное db в конце)`);
  }
  const dbName = task.db ?? 'chaikhana';
  if (!DB_TABLES[dbName]) errors.push(`неизвестная база db «${task.db}»`);
  const tablesOfDb = DB_TABLES[dbName] ?? [];
  if (!Number.isInteger(task.id) || task.id !== index + 1) errors.push(`id должен быть ${index + 1}`);
  if (seenIds.has(task.id)) errors.push('повторяющийся id');
  seenIds.add(task.id);
  if (!TOPICS.includes(task.topic)) {
    errors.push(`неизвестный topic «${task.topic}»`);
  } else {
    const topicIndex = TOPICS.indexOf(task.topic);
    if (topicIndex < lastTopicIndex) errors.push(`тема «${task.topic}» идёт не по порядку курса`);
    lastTopicIndex = topicIndex;
  }
  if (!LEVELS.includes(task.level)) errors.push(`неизвестный level «${task.level}»`);
  for (const k of ['title_ru', 'title_tj', 'task_ru', 'task_tj', 'solution']) {
    if (!isText(task[k])) errors.push(`пустое поле ${k}`);
  }
  if (!Array.isArray(task.tables) || task.tables.length === 0 || !task.tables.every((t) => tablesOfDb.includes(t))) {
    errors.push(`tables: непустой массив имён таблиц базы ${dbName}`);
  }
  if (!Array.isArray(task.hints) || task.hints.length === 0 || !task.hints.every(isText)) {
    errors.push('hints: непустой массив строк');
  }
  if (!Array.isArray(task.hints_tj) || task.hints_tj.length !== task.hints?.length || !task.hints_tj.every(isText)) {
    errors.push('hints_tj: столько же подсказок, сколько в hints');
  }

  let rowCount = 0;
  const isModify = task.topic === 'modify';
  if (isText(task.solution)) {
    const sql = task.solution.trim();
    const firstWord = isModify ? /^(INSERT|UPDATE|DELETE|REPLACE|WITH)\b/i : /^(SELECT|WITH)\b/i;
    if (!firstWord.test(sql) || sql.replace(/;\s*$/, '').includes(';')) {
      errors.push(isModify ? 'solution: один запрос INSERT/UPDATE/DELETE' : 'solution: один запрос SELECT');
    } else {
      // Каждая таблица из решения должна быть указана в поле tables
      const used = tablesOfDb.filter((t) => new RegExp(`\\b${t}\\b`, 'i').test(sql));
      const missing = used.filter((t) => !task.tables.includes(t));
      if (missing.length) errors.push(`solution использует таблицы не из tables: ${missing.join(', ')}`);
      // Если в решении есть псевдонимы, проверка сравнивает имена столбцов —
      // значит, каждое имя должно быть названо студенту в условии или подсказках
      const aliases = [...sql.matchAll(/\bAS\s+([A-Za-z_]\w*)/gi)].map((m) => m[1]).filter((a) => !SQL_TYPES.includes(a.toUpperCase()));
      const told = [task.task_ru, task.task_tj, ...(task.hints ?? [])].join(' ');
      const untold = aliases.filter((a) => !new RegExp(`\\b${a}\\b`).test(told));
      if (untold.length) errors.push(`псевдонимы не названы в условии/подсказках: ${untold.join(', ')}`);
      try {
        rowCount = runOnFresh(sql, { modify: isModify, db: dbName });
        if (rowCount === 0) errors.push(isModify ? 'solution ничего не изменяет' : 'solution возвращает 0 строк');
      } catch (err) {
        errors.push(`solution падает: ${err.message}`);
      }
    }
  }

  const label = `#${String(task.id).padStart(2)} ${task.topic?.padEnd(7)} ${task.title_ru}`;
  if (errors.length) {
    failed++;
    console.log(`  ✗ ${label}\n      ${errors.join('\n      ')}`);
  } else {
    console.log(`  ✓ ${label} — ${rowCount} ${isModify ? 'изменено' : 'строк'}`);
  }
}

if (failed) {
  console.error(`\n✗ Заданий с ошибками: ${failed} из ${tasks.length}`);
  process.exit(1);
}
console.log(`\n✓ Все ${tasks.length} заданий корректны`);

// ── Уроки: у каждой темы с заданиями есть урок, все примеры выполняются ──
// Node 24 импортирует .ts напрямую (type stripping)
const { LESSONS } = await import('../content/lessons.ts');
let lessonErrors = 0;
let examples = 0;
for (const topic of new Set(tasks.map((t) => t.topic))) {
  if (!LESSONS.some((l) => l.topic === topic)) {
    lessonErrors++;
    console.log(`  ✗ нет урока для темы «${topic}»`);
  }
}
for (const lesson of LESSONS) {
  for (const [i, section] of lesson.sections.entries()) {
    if (!section.sql) continue;
    examples++;
    const where = `урок «${lesson.topic}», раздел ${i + 1}`;
    const isDml = /^\s*(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(section.sql);
    let error = null;
    try {
      runOnFresh(section.sql, { modify: isDml, after: section.after, db: section.db ?? lesson.db ?? 'chaikhana' });
    } catch (err) {
      error = err.message;
    }
    if (error && !section.expectError) {
      lessonErrors++;
      console.log(`  ✗ ${where}: ${error}`);
    } else if (!error && section.expectError) {
      lessonErrors++;
      console.log(`  ✗ ${where}: ожидалась ошибка, но запрос выполнился`);
    }
  }
}

if (lessonErrors) {
  console.error(`\n✗ Ошибок в уроках: ${lessonErrors}`);
  process.exit(1);
}
console.log(`✓ Уроков: ${LESSONS.length}, примеров: ${examples} — все выполняются`);
