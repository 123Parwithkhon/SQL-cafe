// lib/env.ts — режим сборки.
//
// Полный режим (по умолчанию, Vercel): сервер проверяет решения, вход через Google,
// база пользователей, рейтинг, сертификаты.
//
// Статический режим (NEXT_PUBLIC_STATIC_EXPORT=1, GitHub Pages): только файлы, без сервера.
// Всё обучение работает, решения проверяются в браузере; вход, рейтинг и сертификаты скрыты.
// Страницы для режимов разделены суффиксами: *.server.tsx — только в полном, *.static.tsx — только в статическом.

export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_EXPORT === '1';

/** Префикс адресов: на GitHub Pages сайт живёт в подпапке, например /SQL-cafe */
/** Адрес полной версии (вход, рейтинг, админка). Гостевая версия ведёт туда кнопкой «Войти». */
export const FULL_SITE_URL = (process.env.NEXT_PUBLIC_FULL_SITE_URL ?? '').replace(/\/+$/, '');

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
