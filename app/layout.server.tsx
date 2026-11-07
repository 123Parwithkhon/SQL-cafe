// Полный режим: язык и тема — из cookies, пользователь — из сессии
import { cookies } from 'next/headers';
import { LANG_COOKIE, THEME_COOKIE, parseLang, parseTheme } from '@/lib/i18n';
import type { AuthUser } from '@/components/AuthProvider';
import { RootShell, siteMetadata, siteViewport } from '@/components/RootShell';
import { auth } from '@/auth';
import { getUser, touchLastSeen } from '@/lib/stats';
import './globals.css';

export const metadata = siteMetadata;
export const viewport = siteViewport;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const lang = parseLang(cookieStore.get(LANG_COOKIE)?.value);
  const theme = parseTheme(cookieStore.get(THEME_COOKIE)?.value);

  // Имя берём из нашей базы: пользователь мог изменить его в профиле.
  // Если база недоступна — сайт работает дальше как для гостя.
  let user: AuthUser = null;
  try {
    const session = await auth();
    if (session?.user?.id) {
      const dbUser = await getUser(session.user.id);
      if (dbUser) {
        user = { id: dbUser.id, name: dbUser.name, image: dbUser.image, isAdmin: dbUser.isAdmin && !dbUser.blocked, blocked: dbUser.blocked };
        // «Был на сайте» для админки; запись не чаще раза в 10 минут, ошибка не мешает странице
        touchLastSeen(dbUser.id).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[layout] не удалось получить пользователя:', err);
  }

  return (
    <RootShell lang={lang} theme={theme} user={user}>
      {children}
    </RootShell>
  );
}
