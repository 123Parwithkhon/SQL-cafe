import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { getUser, upsertUser, type FullUser } from '@/lib/stats';

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const devLoginEnabled =
  process.env.VERCEL_ENV !== 'production' &&
  (process.env.NODE_ENV === 'development' || process.env.AUTH_DEV_LOGIN === 'true');

const providers: NextAuthConfig['providers'] = [];
if (googleEnabled) providers.push(Google);
if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Тестовый вход',
      credentials: { name: { label: 'Имя', type: 'text' } },
      authorize(credentials) {
        const name = String(credentials?.name ?? '').trim().slice(0, 40);
        if (name.length < 2) return null;
        // Одно имя — один тестовый пользователь; email нужен, чтобы проверять админку через ADMIN_EMAILS
        const id = name.toLowerCase();
        return { id, name, email: `${id.replace(/\s+/g, '.')}@dev.local` };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: '/auth', error: '/auth' },
  callbacks: {
    signIn({ account, profile }) {
      // Только подтверждённые Google-адреса: по email назначаются администраторы
      if (account?.provider === 'google') return profile?.email_verified === true;
      return true;
    },
    async jwt({ token, account, user }) {
      // account есть только в момент входа — заводим пользователя в нашей базе
      if (account) {
        token.uid = await upsertUser(
          account.provider,
          account.providerAccountId,
          user?.name ?? 'Гость',
          user?.image ?? null,
          user?.email ?? null,
        );
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = String(token.uid);
      return session;
    },
  },
});

/** id пользователя из сессии или null */
export async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Текущий администратор или null. Проверяется по базе при каждом запросе,
 * а не по сессии: разжалованный или заблокированный админ теряет доступ сразу.
 */
export async function currentAdmin(): Promise<FullUser | null> {
  const id = await currentUserId();
  if (!id) return null;
  const user = await getUser(id);
  return user && user.isAdmin && !user.blocked ? user : null;
}
