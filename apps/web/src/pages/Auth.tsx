import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Button, Check, Field, inputClass, Notice } from '../components/ui';
import { authErrorMessage, clearRecovering, isRecovering, useAuth } from '../data/auth';
import { supabase } from '../data/supabase';

function AuthLayout({
  title,
  back = true,
  children,
}: {
  title: string;
  back?: boolean;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-md items-center gap-2 px-2 py-3">
        {back ? (
          <Button
            variant="ghost"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
          >
            ‹ 返回
          </Button>
        ) : (
          <span className="flex min-h-11 items-center gap-2 px-2">
            <img src="/brand/icon-64.png" alt="" className="size-9 rounded-xl" />
            <span className="text-xl font-bold text-emerald-strong dark:text-emerald">
              EatHealthee
            </span>
          </span>
        )}
      </header>
      <main className="mx-auto max-w-md px-4 pt-2 pb-8">
        <h1 className="mb-6 text-2xl font-bold">{title}</h1>
        <div className="space-y-5 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10">
          {children}
        </div>
      </main>
    </div>
  );
}

const linkClass = 'text-emerald-strong underline dark:text-emerald';

export function Welcome() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-8">
      <div className="rounded-3xl bg-[#fbfaf3] px-6 pt-8 pb-6 text-center shadow-sm ring-1 ring-slate-900/5">
        <img src="/brand/icon-512.png" alt="" className="mx-auto size-40" />
        <img
          src="/brand/wordmark.png"
          alt="EatHealthee：Snap · Track · Be Healthier"
          className="mx-auto mt-2 w-full max-w-xs"
        />
        <h1 className="sr-only">欢迎使用 EatHealthee</h1>
        <ul className="mt-6 grid grid-cols-4 gap-2 text-xs text-slate-700">
          {[
            { icon: '📷', label: '拍照识别' },
            { icon: '🧮', label: '计算营养' },
            { icon: '📋', label: '记录饮食' },
            { icon: '💚', label: '健康管理' },
          ].map((f) => (
            <li key={f.label} className="flex flex-col items-center gap-1">
              <span
                aria-hidden="true"
                className="flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl"
              >
                {f.icon}
              </span>
              {f.label}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-6 text-center leading-relaxed">
        拍照算热量，按你的生活方式安全地减脂、增重、增肌或维持体重。不用去 Gym 也可以开始。
      </p>
      <div className="mt-6 grid gap-3">
        <Link
          to="/signup"
          className="flex min-h-12 items-center justify-center rounded-2xl bg-emerald-strong px-4 font-semibold text-white shadow-sm hover:bg-emerald-800 dark:bg-emerald dark:text-slate-950"
        >
          注册账号
        </Link>
        <Link
          to="/login"
          className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 font-medium dark:border-slate-600 dark:bg-slate-800"
        >
          已有账号，登录
        </Link>
        <Link
          to="/onboarding"
          className="flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm text-slate-600 dark:text-slate-300"
        >
          先不登录，直接试用
        </Link>
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        有账号：换手机或电脑登录，记录都还在。不登录：资料只存在这部设备，之后可以随时注册并上传。
      </p>
    </div>
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
    <AuthLayout title="登录">
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
        <Field label="密码">
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
          {f.busy ? '登录中…' : '登录'}
        </Button>
      </form>
      <div className="flex justify-between text-sm">
        <Link to="/reset-password" className={linkClass}>
          忘记密码？
        </Link>
        <Link to="/signup" className={linkClass}>
          注册账号
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
      <AuthLayout title="请确认你的 Email">
        <Notice title="确认信已寄出">
          我们寄了一封确认信到 <strong>{sentTo}</strong>。请打开信件并点击链接，就会自动登录。
        </Notice>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          没收到？看看垃圾邮件匣，或几分钟后再试一次。
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="注册账号">
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email" error={f.email && !emailOk ? '请输入有效的 Email。' : null}>
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
          label="密码"
          hint="至少 8 个字元"
          error={f.password && !passwordOk ? '密码至少要 8 个字元。' : null}
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
        <Field label="再输入一次密码" error={confirm && !matches ? '两次输入的密码不一样。' : null}>
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
          我同意把我的身体、饮食和训练记录保存到我的账号，并已阅读
          <Link to="/legal/privacy" target="_blank" className={`mx-1 ${linkClass}`}>
            隐私政策
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
          {f.busy ? '注册中…' : '注册'}
        </Button>
      </form>
      <p className="text-sm">
        已有账号？
        <Link to="/login" className={linkClass}>
          登录
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
    <AuthLayout title="重置密码">
      {sent ? (
        <Notice>
          如果这个 Email 有注册，你会收到一封重置密码的信。请点击信中的链接设置新密码。
        </Notice>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="注册时用的 Email">
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
            寄出重置链接
          </Button>
        </form>
      )}
      <p className="text-sm">
        <Link to="/login" className={linkClass}>
          返回登录
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
      <AuthLayout title="链接已失效">
        <p className="text-sm">这个重置链接已经用过或过期。请重新申请。</p>
        <Link to="/reset-password" className={linkClass}>
          重新寄出重置链接
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
    <AuthLayout title={isRecovering() ? '设置新密码' : '更改密码'}>
      <form className="space-y-4" onSubmit={submit}>
        <Field
          label="新密码"
          hint="至少 8 个字元"
          error={password && password.length < 8 ? '密码至少要 8 个字元。' : null}
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
          保存新密码
        </Button>
      </form>
    </AuthLayout>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <p className="text-sm text-slate-600 dark:text-slate-300">载入你的资料中…</p>
    </div>
  );
}
