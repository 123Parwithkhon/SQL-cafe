import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { upsertUser } from '@/lib/stats';

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
        // Одно имя — один тестовый пользователь
        return { id: name.toLowerCase(), name };
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
    async jwt({ token, account, user }) {
      // account есть только в момент входа — заводим пользователя в нашей базе
      if (account) {
        token.uid = await upsertUser(account.provider, account.providerAccountId, user?.name ?? 'Гость', user?.image ?? null);
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
