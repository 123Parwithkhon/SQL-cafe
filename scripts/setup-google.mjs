// scripts/setup-google.mjs — записывает ключи входа через Google в .env.local.
//   npm run setup:google                                  — спросит ключи в терминале
//   npm run setup:google -- --id <CLIENT_ID> --secret <SECRET>  — без вопросов
// Остальные строки .env.local (AUTH_SECRET, DATABASE_URL...) сохраняются как есть.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env.local');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

let id = arg('id');
let secret = arg('secret');

if (!id || !secret) {
  console.log('Ключи берутся в Google Cloud Console → APIs & Services → Credentials → OAuth client ID.');
  console.log('Подробная инструкция — в ответе Claude или в .env.example.\n');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  id ||= (await rl.question('Client ID (…apps.googleusercontent.com): ')).trim();
  secret ||= (await rl.question('Client secret (GOCSPX-…): ')).trim();
  rl.close();
}

// Проверка формата — частая ошибка: перепутать ID и секрет или скопировать с пробелом
const errors = [];
if (!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(id ?? '')) {
  errors.push('Client ID должен выглядеть как 1234567890-abc123.apps.googleusercontent.com');
}
if (!/^GOCSPX-[A-Za-z0-9_-]{20,}$/.test(secret ?? '')) {
  errors.push('Client secret должен начинаться с GOCSPX-');
}
if (errors.length) {
  console.error('\n✗ ' + errors.join('\n✗ '));
  process.exit(1);
}

const lines = existsSync(envPath) ? readFileSync(envPath, 'utf8').split(/\r?\n/) : [];
const set = (key, value) => {
  const i = lines.findIndex((l) => new RegExp(`^#?\\s*${key}=`).test(l));
  if (i > -1) lines[i] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
};
// Без AUTH_SECRET вход не работает — создаём, если его ещё нет
if (!lines.some((l) => /^AUTH_SECRET=.+/.test(l))) set('AUTH_SECRET', randomBytes(32).toString('base64'));
set('AUTH_GOOGLE_ID', id);
set('AUTH_GOOGLE_SECRET', secret);
writeFileSync(envPath, lines.filter((l, i, arr) => l !== '' || i < arr.length - 1).join('\n') + '\n', 'utf8');

console.log('\n✓ Ключи Google записаны в .env.local');
console.log('  Перезапустите сервер (Ctrl+C, затем npm run dev) и нажмите «Войти через Google».');
