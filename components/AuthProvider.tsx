'use client';

// Текущий пользователь — с сервера через layout, без лишнего запроса из браузера
import { createContext, useContext, type ReactNode } from 'react';

export type AuthUser = { id: string; name: string; image: string | null } | null;

const AuthContext = createContext<AuthUser>(null);

export function AuthProvider({ user, children }: { user: AuthUser; children: ReactNode }) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}

export function useAuthUser(): AuthUser {
  return useContext(AuthContext);
}
