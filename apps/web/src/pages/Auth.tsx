import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
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

const FEATURES = [
  { icon: '📷', title: '拍照算热量', text: '拍下整份食物，AI 认出每样菜并估算份量和热量。' },
  {
    icon: '🍛',
    title: '认得本地菜',
    text: 'Nasi lemak、鸡饭、roti canai 都认得，常见菜式按化验数据算热量。',
  },
  { icon: '🎯', title: '安全的目标', text: '按你的身体和生活方式计算，不用去 Gym 也能开始。' },
  { icon: '📈', title: '看见进步', text: '体重趋势、连续记录和成就，让你更容易坚持。' },
];

const GOALS = ['减脂', '增重', '增肌', '维持体重'];

/** Cycles through the goals in the headline every 2.2 s. */
function RotatingGoal() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % GOALS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block overflow-hidden align-bottom">
      <span key={i} className="inline-block animate-word text-emerald-strong dark:text-emerald">
        {GOALS[i]}
      </span>
    </span>
  );
}

export function Welcome() {
  return (
    <div className="min-h-dvh bg-[#fbfaf3] text-navy dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-8 lg:min-h-dvh lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14 lg:py-12">
        <section className="text-center lg:text-left">
          <div className="relative mx-auto w-fit animate-float rounded-[2rem] bg-[#fbfaf3] p-2 lg:mx-0">
            <img src="/brand/icon-512.png" alt="" className="size-28 sm:size-36 lg:size-44" />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[18%] h-1 animate-scan rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_2px_rgba(16,185,129,0.6)]"
            />
          </div>
          <img
            src="/brand/wordmark.png"
            alt="EatHealthee：Snap · Track · Be Healthier"
            className="mx-auto mt-3 w-full max-w-sm animate-rise rounded-2xl bg-[#fbfaf3] lg:mx-0"
            style={{ animationDelay: '0.1s' }}
          />
          <h1 className="sr-only">欢迎使用 EatHealthee</h1>
          <p
            className="mx-auto mt-5 max-w-md animate-rise text-lg leading-relaxed text-slate-700 lg:mx-0 dark:text-slate-200"
            style={{ animationDelay: '0.2s' }}
          >
            拍一张照，就知道吃了多少。
            <br />
            按你的生活方式，安全地
            <RotatingGoal />。
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-3 text-left">
            {FEATURES.map((f, i) => (
              <li
                key={f.title}
                style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                className="flex animate-rise flex-col gap-2 rounded-2xl bg-white p-3 shadow-sm sm:flex-row sm:gap-3 sm:p-4 ring-1 ring-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-md dark:bg-slate-800 dark:ring-white/10"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl sm:size-11 dark:bg-emerald/15"
                >
                  {f.icon}
                </span>
                <span>
                  <span className="block font-semibold">{f.title}</span>
                  <span className="block text-xs text-slate-600 sm:text-sm dark:text-slate-300">
                    {f.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="animate-rise rounded-3xl bg-white p-6 shadow-lg ring-1 ring-slate-900/5 lg:p-8 dark:bg-slate-800 dark:ring-white/10"
          style={{ animationDelay: '0.5s' }}
        >
          <h2 className="text-2xl font-bold">开始使用</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            完全免费，1 分钟完成设置。
          </p>
          <div className="mt-6 grid gap-3">
            <Link
              to="/signup"
              className="flex min-h-12 items-center justify-center rounded-2xl bg-emerald-strong px-4 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-md dark:bg-emerald dark:text-slate-950"
            >
              注册账号
            </Link>
            <Link
              to="/login"
              className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 font-semibold hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700"
            >
              已有账号，登录
            </Link>
            <div className="my-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-600" />或
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-600" />
            </div>
            <Link
              to="/onboarding"
              className="flex min-h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium text-emerald-strong hover:bg-emerald-50 dark:text-emerald dark:hover:bg-emerald/10"
            >
              先不登录，直接试用 ›
            </Link>
          </div>
          <ul className="mt-6 space-y-2 border-t border-slate-100 pt-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <li>✓ 有账号：换手机或电脑登录，记录都还在</li>
            <li>✓ 不登录：资料只存在这部设备，之后可随时注册上传</li>
            <li>✓ 你的资料只属于你，可随时导出或删除</li>
          </ul>
          <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
            使用即表示你同意
            <Link to="/legal/disclaimer" className="mx-1 underline">
              健康免责声明
            </Link>
            和
            <Link to="/legal/privacy" className="ml-1 underline">
              隐私政策
            </Link>
            。
          </p>
        </section>
      </div>
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
