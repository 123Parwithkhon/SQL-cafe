# Полная версия на Vercel: аккаунты Google, рейтинг, админка

Всё бесплатно и без банковской карты: Vercel (хостинг), Neon (база PostgreSQL), Google Cloud (вход через Google).
Займёт около 20 минут. Версия на GitHub Pages продолжает работать как раньше — это гостевая версия без аккаунтов.

## 1. База данных — Neon

1. Откройте https://neon.tech → **Sign up** → войдите через GitHub или Google.
2. **Create project**: имя `sql-cafe`, регион **AWS Europe Central 1 (Frankfurt)** — ближайший к Таджикистану.
3. На странице проекта нажмите **Connect**, включите **Connection pooling** и скопируйте строку вида
   `postgresql://...@ep-....-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`.
   Это `DATABASE_URL`. Таблицы сайт создаст сам при первом запуске.

## 2. Сайт — Vercel

1. Откройте https://vercel.com → **Sign up** → **Continue with GitHub** (тариф Hobby — бесплатный).
2. **Add New → Project** → выберите репозиторий `SQL-cafe` → **Import**.
3. Framework определится сам (Next.js). Ничего в настройках сборки не меняйте.
4. Раскройте **Environment Variables** и добавьте:

   | Имя | Значение |
   |---|---|
   | `DATABASE_URL` | строка из Neon (шаг 1) |
   | `DATABASE_POOL_MAX` | `3` |
   | `AUTH_SECRET` | случайная строка: выполните `npx auth secret` в папке проекта и скопируйте значение |
   | `ADMIN_EMAILS` | ваш Gmail, например `you@gmail.com` (несколько — через запятую) |

5. **Deploy**. Через 1–2 минуты получите адрес вида `https://sql-cafe-xxxx.vercel.app` — запишите его.
   Сайт уже работает, но на странице входа будет написано, что вход через Google не настроен — это следующий шаг.

## 3. Вход через Google — Google Cloud

1. Откройте https://console.cloud.google.com → вверху **Select a project → New project** → имя `Chaikhona SQL` → **Create**.
2. Меню → **APIs & Services → OAuth consent screen** (или **Google Auth Platform**) → **Get started**:
   - App name: `Чайхона SQL`, User support email: ваш Gmail;
   - Audience: **External**;
   - Contact email: ваш Gmail → **Create**.
3. **Clients → Create client**:
   - Application type: **Web application**;
   - Authorized JavaScript origins: `https://sql-cafe-xxxx.vercel.app`;
   - Authorized redirect URIs: `https://sql-cafe-xxxx.vercel.app/api/auth/callback/google`;
   - **Create** → скопируйте **Client ID** и **Client secret**.
4. **Audience → Publish app → Confirm**. Без этого войти смогут только тестовые пользователи.
   Сайт запрашивает только имя, почту и фото — проверка Google для этого не нужна.
5. Вернитесь в Vercel → проект → **Settings → Environment Variables** и добавьте:

   | Имя | Значение |
   |---|---|
   | `AUTH_GOOGLE_ID` | Client ID |
   | `AUTH_GOOGLE_SECRET` | Client secret |

6. **Deployments** → у последнего деплоя **⋯ → Redeploy**. Переменные применяются только к новому деплою.

## 4. Проверка

1. Откройте адрес Vercel → **Войти** → **Войти через Google**.
2. Войдите тем Gmail, что указали в `ADMIN_EMAILS`, — в шапке появится **Админка**.
3. В админке: **Обзор** (цифры и графики за 14 дней), **Пользователи** (поиск, блокировка, назначение админов, удаление),
   **Задания** (где ученики ошибаются чаще всего), **Сертификаты** (отзыв).

## Права в админке

- **Главные администраторы** — почты из `ADMIN_EMAILS`. Могут всё: назначать и снимать админов, удалять пользователей.
  Их самих нельзя заблокировать или разжаловать из админки.
- **Администраторы** — назначенные в админке. Видят всё, могут блокировать и разблокировать обычных пользователей.
- **Заблокированный** пользователь может заниматься, но его решения не засчитываются, а сам он не виден в рейтинге
  и среди «решений других».

## Дальше

- Каждый `git push` в `main` обновляет обе версии: Vercel пересобирает полную, GitHub Actions — версию на Pages.
- Свой домен: Vercel → **Settings → Domains**. После этого добавьте новый адрес в Google Cloud (шаг 3.3).
- Вход «по имени» без Google на продакшене выключен всегда, даже если задать `AUTH_DEV_LOGIN`.
