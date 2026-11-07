// scripts/build-pages.mjs — статическая сборка для GitHub Pages → папка out/
//   npm run build:pages
// Сайт живёт по адресу https://<user>.github.io/<repo>/, поэтому все пути получают префикс.
// Другой префикс (например, для своего домена — пустой): BASE_PATH=/ npm run build:pages
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, readdirSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = process.env.BASE_PATH ?? '/SQL-cafe';
const basePath = raw === '/' ? '' : raw.replace(/\/+$/, '');
// Куда ведёт «Войти» в гостевой версии; пустая строка — кнопки не будет
const fullSite = process.env.FULL_SITE_URL ?? 'https://sql-cafe-gray.vercel.app';

console.log(`Статическая сборка для GitHub Pages, префикс: «${basePath || '/'}»`);
const result = spawnSync('npx', ['next', 'build'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, NEXT_PUBLIC_STATIC_EXPORT: '1', NEXT_PUBLIC_BASE_PATH: basePath, NEXT_PUBLIC_FULL_SITE_URL: fullSite },
});
if (result.status !== 0) process.exit(result.status ?? 1);

const out = path.join(root, 'out');
if (!existsSync(out)) {
  console.error('✗ Папка out/ не создана');
  process.exit(1);
}
// Без .nojekyll GitHub Pages прячет папки с «_» в начале — а весь JS лежит в _next/
writeFileSync(path.join(out, '.nojekyll'), '');

// Next.js 16 кладёт файлы предзагрузки страниц во вложенные папки
// (trainer/18/__next.trainer/$d$id/__PAGE__.txt), а браузер просит их одним именем
// (trainer/18/__next.trainer.$d$id.__PAGE__.txt). Сервер Next сопоставляет это сам,
// GitHub Pages — нет: без этого шага предзагрузка ссылок получает 404 и переходы медленнее.
let flattened = 0;
function flatten(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('__next.')) {
      const moveAll = (sub, prefix) => {
        for (const item of readdirSync(sub, { withFileTypes: true })) {
          const itemPath = path.join(sub, item.name);
          const flatName = `${prefix}.${item.name}`;
          if (item.isDirectory()) moveAll(itemPath, flatName);
          else {
            renameSync(itemPath, path.join(dir, flatName));
            flattened++;
          }
        }
      };
      moveAll(full, entry.name);
      rmSync(full, { recursive: true, force: true });
    } else {
      flatten(full);
    }
  }
}
flatten(out);
console.log(`✓ Файлы предзагрузки приведены к виду, который ждёт браузер: ${flattened}`);
console.log('✓ Готово: out/ — можно публиковать на GitHub Pages');
