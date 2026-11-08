import type { NextConfig } from 'next';

// Статическая сборка для GitHub Pages: npm run build:pages (см. lib/env.ts)
const isStatic = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const common: NextConfig = {
  // Оптимизация картинок не нужна: все иллюстрации — встроенные SVG.
  // Благодаря этому пакет sharp (~28 МБ) заменён заглушкой — см. overrides в package.json.
  images: { unoptimized: true },
  // Кэш Turbopack на диске (.next/dev, .next/cache) разрастается до сотен мегабайт.
  // Проект небольшой — пересборка без кэша занимает секунды, поэтому кэш отключён.
  experimental: {
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
};

const staticConfig: NextConfig = {
  ...common,
  output: 'export',
  basePath,
  // /trainer/5 → trainer/5/index.html: GitHub Pages отдаёт такие пути без настройки сервера
  trailingSlash: true,
  // Берём *.static.tsx и общие файлы; *.server.tsx (API, вход, рейтинг) в сборку не попадают
  pageExtensions: ['static.tsx', 'static.ts', 'tsx', 'ts'],
};

const fullConfig: NextConfig = {
  ...common,
  pageExtensions: ['server.tsx', 'server.ts', 'tsx', 'ts'],
  // Пакеты с WASM и нативными зависимостями не бандлим — загружаются из node_modules как есть
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  // Серверная проверка читает базы и движок sql.js с диска — включаем их в бандл функции
  outputFileTracingIncludes: {
    '/api/check': [
      './public/chaikhana.sqlite',
      './public/bazaar.sqlite',
      './public/maktab.sqlite',
      './public/safar.sqlite',
      './public/liga.sqlite',
      './vendor/sqljs/sql-wasm.js',
      './vendor/sqljs/sql-wasm.wasm',
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default isStatic ? staticConfig : fullConfig;
