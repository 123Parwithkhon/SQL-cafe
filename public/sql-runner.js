// public/sql-runner.js — Web Worker: выполняет SQL студента в браузере через sql.js.
// Работает в отдельном потоке: бесконечный запрос не подвесит страницу,
// главный поток просто убьёт этот worker по таймауту.
// Учебных баз пять (chaikhana, bazaar, maktab, safar, liga); каждая скачивается один раз, при первом обращении.
/* global initSqlJs */
// Префикс сайта (на GitHub Pages — подпапка, например /SQL-cafe) передаётся в адресе worker-а
const BASE = new URLSearchParams(self.location.search).get('base') || '';
importScripts(BASE + '/sqljs/sql-wasm.js');

// Меняйте версию при изменении баз, чтобы браузеры не держали старые копии
const DB_VERSION = 4;
const DB_FILES = { chaikhana: 'chaikhana.sqlite', bazaar: 'bazaar.sqlite', maktab: 'maktab.sqlite', safar: 'safar.sqlite', liga: 'liga.sqlite' };
const MAX_ROWS = 1000;
const MAX_BLOB = 1000000;

let SQL = null;
let engine = null; // промис загрузки движка — параллельные сообщения не грузят его дважды
const pristine = {}; // исходные байты каждой базы — для быстрого сброса
const downloads = {};
let current = null; // имя открытой базы
let db = null;

function loadEngine() {
  engine ??= initSqlJs({ locateFile: (file) => BASE + '/sqljs/' + file }).catch((err) => {
    engine = null;
    throw err;
  });
  return engine;
}

function download(name) {
  downloads[name] ??= fetch(BASE + '/' + DB_FILES[name] + '?v=' + DB_VERSION)
    .then((response) => {
      if (!response.ok) throw new Error('db_download_failed');
      return response.arrayBuffer();
    })
    .then((buffer) => {
      pristine[name] = new Uint8Array(buffer);
    })
    .catch((err) => {
      delete downloads[name]; // следующая попытка скачает заново
      throw err;
    });
  return downloads[name];
}

/** Открывает нужную базу (если открыта другая — переключает) */
async function use(name) {
  if (!DB_FILES[name]) throw new Error('unknown_db');
  SQL = await loadEngine();
  await download(name);
  if (current !== name || !db) open(name);
}

function open(name) {
  if (db) db.close();
  db = new SQL.Database(pristine[name]);
  current = name;
  // Те же ограничения, что на сервере (lib/sql/server-runner.ts)
  db.create_function('randomblob', (n) => {
    const size = Math.max(1, Math.min(Number(n) || 1, MAX_BLOB));
    const out = new Uint8Array(size);
    crypto.getRandomValues(out.subarray(0, Math.min(size, 65536)));
    return out;
  });
  db.create_function('zeroblob', (n) => new Uint8Array(Math.max(0, Math.min(Number(n) || 0, MAX_BLOB))));
  // sql.js регистрирует функцию на число аргументов = fn.length, поэтому глушим каждую арность
  for (const fname of ['printf', 'format']) {
    for (let arity = 0; arity <= 8; arity++) {
      const blocked = () => {
        throw new Error('функция ' + fname + ' отключена в тренажёре');
      };
      Object.defineProperty(blocked, 'length', { value: arity });
      db.create_function(fname, blocked);
    }
  }
  db.exec('PRAGMA foreign_keys = ON');
  // Потолок размера (~20 МБ): INSERT из бесконечного CTE не съест память телефона
  db.exec('PRAGMA max_page_count = 5000');
}

function totalChanges() {
  return db.exec('SELECT total_changes()')[0].values[0][0];
}

function exec(sql) {
  const before = totalChanges();
  const stmt = db.prepare(sql);
  try {
    const columns = stmt.getColumnNames();
    const rows = [];
    let truncated = false;
    while (stmt.step()) {
      if (rows.length >= MAX_ROWS) {
        truncated = true;
        break;
      }
      rows.push(stmt.get().map((v) => (v instanceof Uint8Array ? '[BLOB]' : v)));
    }
    return { columns, rows, truncated, changes: totalChanges() - before };
  } finally {
    stmt.free();
  }
}

self.onmessage = async (event) => {
  const { id, type, sql, db: dbName = 'chaikhana' } = event.data;
  try {
    await use(dbName);
    if (type === 'init') {
      self.postMessage({ id, ok: true });
    } else if (type === 'reset') {
      open(dbName);
      self.postMessage({ id, ok: true });
    } else if (type === 'exec') {
      self.postMessage({ id, ok: true, result: exec(sql) });
    } else {
      self.postMessage({ id, ok: false, error: 'unknown_command' });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
