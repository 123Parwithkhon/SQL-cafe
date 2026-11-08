'use client';

// Вход и регистрация по email и паролю. Одна карточка, переключение «Войти / Зарегистрироваться».
import { useId, useState, type ComponentType, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { useLang } from './LangProvider';
import { Eye, EyeOff, Loader2, Lock, LogIn, Mail, User, type IconProps } from './icons';
import type { DictKey } from '@/lib/i18n';

type Mode = 'login' | 'register';

const PASSWORD_MIN = 8;

const REGISTER_ERRORS: Record<string, DictKey> = {
  invalid_name: 'auth.errName',
  invalid_email: 'auth.errEmail',
  invalid_password: 'auth.errPassword',
  exists: 'auth.errExists',
  too_many: 'auth.errTooMany',
};

export function AuthForms({ initialMode, redirectTo }: { initialMode: Mode; redirectTo: string }) {
  const { t } = useLang();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DictKey | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword('');
    setConfirm('');
  }

  async function login(): Promise<boolean> {
    const res = await signIn('password', { email, password, redirect: false });
    if (res?.error) {
      setError(res.code === 'locked' ? 'auth.errLocked' : 'auth.errWrong');
      return false;
    }
    // Полная перезагрузка: шапка и все страницы получат вошедшего пользователя с сервера
    window.location.assign(redirectTo);
    return true;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (mode === 'register') {
      if (password.length < PASSWORD_MIN) return setError('auth.errPassword');
      if (password !== confirm) return setError('auth.errConfirm');
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(REGISTER_ERRORS[data.error] ?? 'auth.error');
          return;
        }
      }
      if (await login()) return; // остаёмся в состоянии «загрузка» до перехода
    } catch {
      setError('auth.error');
    } finally {
      setBusy(false);
    }
  }

  const isRegister = mode === 'register';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="text-center">
        <h2 className="font-serif text-2xl font-bold text-fg">{t(isRegister ? 'auth.registerTitle' : 'auth.loginTitle')}</h2>
        <p className="mt-1 text-sm text-fg/65">{t(isRegister ? 'auth.registerSubtitle' : 'auth.loginSubtitle')}</p>
      </div>

      {isRegister && (
        <Field
          icon={User}
          label={t('auth.name')}
          value={name}
          onChange={setName}
          autoComplete="name"
          placeholder={t('auth.namePlaceholder')}
          maxLength={40}
        />
      )}
      <Field icon={Mail} label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@gmail.com" inputMode="email" />
      <Field
        icon={Lock}
        label={t('auth.password')}
        type={show ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        placeholder={isRegister ? t('auth.passwordHint') : '••••••••'}
        maxLength={128}
        toggle={{ shown: show, onToggle: () => setShow((v) => !v), label: t(show ? 'auth.hidePassword' : 'auth.showPassword') }}
      />
      {isRegister && (
        <Field
          icon={Lock}
          label={t('auth.confirm')}
          type={show ? 'text' : 'password'}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          placeholder="••••••••"
          maxLength={128}
        />
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger">
          {t(error)}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-terra px-4 font-semibold text-white transition hover:bg-terra-dark disabled:opacity-60"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} aria-hidden />}
        {t(isRegister ? 'auth.registerSubmit' : 'auth.loginSubmit')}
      </button>

      <p className="text-center text-sm text-fg/65">
        {t(isRegister ? 'auth.haveAccount' : 'auth.noAccount')}{' '}
        <button type="button" onClick={() => switchMode(isRegister ? 'login' : 'register')} className="font-semibold text-gold-soft underline-offset-2 hover:underline">
          {t(isRegister ? 'auth.toLogin' : 'auth.toRegister')}
        </button>
      </p>
      {!isRegister && <p className="text-center text-xs text-fg/50">{t('auth.forgot')}</p>}
    </form>
  );
}

type FieldProps = {
  icon: ComponentType<IconProps>;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  inputMode?: 'email' | 'text';
  toggle?: { shown: boolean; onToggle: () => void; label: string };
};

function Field({ icon: Icon, label, value, onChange, type = 'text', autoComplete, placeholder, maxLength, inputMode, toggle }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-fg/90">
        {label}
      </label>
      <div className="relative">
        <Icon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg/45" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
          inputMode={inputMode}
          required
          className={`block min-h-12 w-full rounded-xl border border-lazur-soft bg-page/60 pl-11 text-base text-fg outline-none transition placeholder:text-fg/35 focus:border-gold ${toggle ? 'pr-12' : 'pr-3'}`}
        />
        {toggle && (
          <button
            type="button"
            onClick={toggle.onToggle}
            aria-label={toggle.label}
            title={toggle.label}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-fg/55 hover:bg-fg/5 hover:text-fg"
          >
            {toggle.shown ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
