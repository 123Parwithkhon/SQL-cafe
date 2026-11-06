// scripts/copy-sqljs.mjs — кладёт движок sql.js в public/sqljs, чтобы браузер грузил его
// с нашего же домена (без внешних CDN — быстрее и надёжнее из Таджикистана)
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Движок лежит в vendor/sqljs (2 файла, 1,3 МБ) — вместо пакета sql.js на 30 МБ
const src = path.join(root, 'vendor', 'sqljs');
const dest = path.join(root, 'public', 'sqljs');

mkdirSync(dest, { recursive: true });
for (const file of ['sql-wasm.js', 'sql-wasm.wasm']) {
  copyFileSync(path.join(src, file), path.join(dest, file));
}
console.log('✓ sql.js скопирован в public/sqljs');
