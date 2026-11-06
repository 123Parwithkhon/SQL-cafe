// Заглушка вместо sharp (см. package.json рядом). Если понадобится next/image —
// уберите overrides.sharp из корневого package.json и images.unoptimized из next.config.ts.
throw new Error('sharp отключён в Чайхона SQL: next/image не используется (images.unoptimized = true)');
