import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Button, Check, Field, inputClass, Notice } from '../components/ui';
import { authErrorMessage, clearRecovering, isRecovering, useAuth } from '../data/auth';
import { supabase } from '../data/supabase';

function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-4">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="text-lg font-semibold">FitTrack</span>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">{title}</h1>
        <div className="space-y-5 rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-800">
          {children}
        </div>
      </main>
    </div>
  );
}

const linkClass = 'text-emerald-strong underline dark:text-emerald';

export function Welcome() {
  return (
    <AuthLayout title="歡迎使用 FitTrack">
      <p className="leading-relaxed">
        依照你的生活方式，安全地減脂、增重、增肌或維持體重。不用去 Gym 也可以開始。
      </p>
      <div className="grid gap-3">
        <Link
          to="/signup"
          className="flex min-h-11 items-center justify-center rounded-xl bg-emerald px-4 text-sm font-semibold text-navy"
        >
          註冊帳號
        </Link>
        <Link
          to="/login"
          className="flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm dark:border-slate-500"
        >
          已有帳號，登入
        </Link>
        <Link
          to="/onboarding"
          className="flex min-h-11 items-center justify-center rounded-xl px-4 text-sm text-slate-600 dark:text-slate-300"
        >
          先不登入，直接試用
        </Link>
      </div>
      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        有帳號：換手機或電腦登入，記錄都還在。不登入：資料只存在這部裝置，之後可以隨時註冊並上傳。
      </p>
    </AuthLayout>
  );
}

function useEmailPassword() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return { email, setEmail, password, setPassword, busy, setBusy, error, setError };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Login() {
  const f = useEmailPassword();
  const navigate = useNavigate();
  const auth = useAuth();
  if (auth.status === 'signedIn') return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    f.setError('');
    f.setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: f.email.trim(),
      password: f.password,
    });
    f.setBusy(false);
    if (error) f.setError(authErrorMessage(error));
    else navigate('/', { replace: true });
  };

  return (
    <AuthLayout title="登入">
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email">
          {(p) => (
            <input
              {...p}
              type="email"
              autoComplete="email"
              required
              value={f.email}
              onChange={(e) => f.setEmail(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field label="密碼">
          {(p) => (
            <input
              {...p}
              type="password"
              autoComplete="current-password"
              required
              value={f.password}
              onChange={(e) => f.setPassword(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        {f.error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {f.error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={f.busy}>
          {f.busy ? '登入中…' : '登入'}
        </Button>
      </form>
      <div className="flex justify-between text-sm">
        <Link to="/reset-password" className={linkClass}>
          忘記密碼？
        </Link>
        <Link to="/signup" className={linkClass}>
          註冊帳號
        </Link>
      </div>
    </AuthLayout>
  );
}

export function Signup() {
  const f = useEmailPassword();
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const auth = useAuth();
  if (auth.status === 'signedIn') return <Navigate to="/" replace />;

  const emailOk = EMAIL_RE.test(f.email.trim());
  const passwordOk = f.password.length >= 8;
  const matches = f.password === confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!emailOk || !passwordOk || !matches || !agree) return;
    f.setError('');
    f.setBusy(true);
    const email = f.email.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: f.password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    f.setBusy(false);
    if (error) return f.setError(authErrorMessage(error));
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities?.length === 0)
      return f.setError(authErrorMessage({ code: 'user_already_exists' }));
    if (!data.session) setSentTo(email);
  };

  if (sentTo) {
    return (
      <AuthLayout title="請確認你的 Email">
        <Notice title="確認信已寄出">
          我們寄了一封確認信到 <strong>{sentTo}</strong>。請打開信件並點擊連結，就會自動登入。
        </Notice>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          沒收到？看看垃圾郵件匣，或幾分鐘後再試一次。
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="註冊帳號">
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email" error={f.email && !emailOk ? '請輸入有效的 Email。' : null}>
          {(p) => (
            <input
              {...p}
              type="email"
              autoComplete="email"
              required
              value={f.email}
              onChange={(e) => f.setEmail(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field
          label="密碼"
          hint="至少 8 個字元"
          error={f.password && !passwordOk ? '密碼至少要 8 個字元。' : null}
        >
          {(p) => (
            <input
              {...p}
              type="password"
              autoComplete="new-password"
              required
              value={f.password}
              onChange={(e) => f.setPassword(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Field label="再輸入一次密碼" error={confirm && !matches ? '兩次輸入的密碼不一樣。' : null}>
          {(p) => (
            <input
              {...p}
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        <Check checked={agree} onChange={setAgree}>
          我同意把我的身體、飲食和訓練記錄保存到我的帳號，並已閱讀
          <Link to="/legal/privacy" target="_blank" className={`mx-1 ${linkClass}`}>
            隱私政策
          </Link>
        </Check>
        {f.error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {f.error}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={f.busy || !emailOk || !passwordOk || !matches || !agree}
        >
          {f.busy ? '註冊中…' : '註冊'}
        </Button>
      </form>
      <p className="text-sm">
        已有帳號？
        <Link to="/login" className={linkClass}>
          登入
        </Link>
      </p>
    </AuthLayout>
  );
}

export function ResetPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setBusy(false);
    // Same message whether or not the email exists, so accounts cannot be probed.
    if (error && error.code === 'over_email_send_rate_limit') setError(authErrorMessage(error));
    else setSent(true);
  };

  return (
    <AuthLayout title="重設密碼">
      {sent ? (
        <Notice>
          如果這個 Email 有註冊，你會收到一封重設密碼的信。請點擊信中的連結設定新密碼。
        </Notice>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="註冊時用的 Email">
            {(p) => (
              <input
                {...p}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={busy || !EMAIL_RE.test(email.trim())}>
            寄出重設連結
          </Button>
        </form>
      )}
      <p className="text-sm">
        <Link to="/login" className={linkClass}>
          返回登入
        </Link>
      </p>
    </AuthLayout>
  );
}

export function UpdatePassword() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (auth.status === 'loading') return <Loading />;
  if (auth.status === 'signedOut') {
    return (
      <AuthLayout title="連結已失效">
        <p className="text-sm">這個重設連結已經用過或過期。請重新申請。</p>
        <Link to="/reset-password" className={linkClass}>
          重新寄出重設連結
        </Link>
      </AuthLayout>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(authErrorMessage(error));
    clearRecovering();
    navigate('/', { replace: true });
  };

  return (
    <AuthLayout title={isRecovering() ? '設定新密碼' : '更改密碼'}>
      <form className="space-y-4" onSubmit={submit}>
        <Field
          label="新密碼"
          hint="至少 8 個字元"
          error={password && password.length < 8 ? '密碼至少要 8 個字元。' : null}
        >
          {(p) => (
            <input
              {...p}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy || password.length < 8}>
          儲存新密碼
        </Button>
      </form>
    </AuthLayout>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <p className="text-sm text-slate-600 dark:text-slate-300">載入你的資料中…</p>
    </div>
  );
}
