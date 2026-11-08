// scripts/clean.mjs — освобождает место на диске. Удаляет только то, что пересоздаётся само.
//   npm run clean      — кэш и результаты сборки (.next, сгенерированные файлы в public)
//   npm run clean:all  — то же + node_modules (вернуть: npm install, нужен интернет)
// Исходный код, задания, уроки, vendor/, .env.local и локальная база (.data) НЕ трогаются.
import { rmSync, existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const all = process.argv.includes('--all');

const targets = ['.next', 'public/sqljs', 'public/chaikhana.sqlite', 'public/bazaar.sqlite', 'public/maktab.sqlite', 'public/safar.sqlite', 'public/liga.sqlite', 'next-env.d.ts', 'tsconfig.tsbuildinfo'];
if (all) targets.push('node_modules');

function sizeOf(p) {
  if (!existsSync(p)) return 0;
  const st = statSync(p);
  if (!st.isDirectory()) return st.size;
  return readdirSync(p).reduce((sum, f) => sum + sizeOf(path.join(p, f)), 0);
}

let freed = 0;
for (const rel of targets) {
  const abs = path.join(root, rel);
  if (!existsSync(abs)) continue;
  const size = sizeOf(abs);
  rmSync(abs, { recursive: true, force: true });
  freed += size;
  console.log(`  удалено ${rel} (${(size / 1024 / 1024).toFixed(1)} МБ)`);
}
console.log(`✓ Освобождено ${(freed / 1024 / 1024).toFixed(1)} МБ`);
console.log(all ? 'Чтобы снова запустить проект: npm install, затем npm run dev' : 'Всё пересоздастся само при npm run dev или npm run build');
