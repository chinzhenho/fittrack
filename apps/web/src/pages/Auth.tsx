import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import {
  BackButton,
  Button,
  Check,
  Field,
  EmailInput,
  Notice,
  PasswordInput,
  PasswordStrength,
} from '../components/ui';
import { authErrorMessage, clearRecovering, isRecovering, useAuth } from '../data/auth';
import { supabase } from '../data/supabase';

function Brand() {
  return (
    <span className="flex items-center gap-2">
      <img
        src="/brand/icon-192.png"
        alt=""
        className="size-8 rounded-xl bg-[#fbfaf3] ring-1 ring-black/5"
      />
      <span className="text-lg font-extrabold tracking-tight">
        Eat<span className="text-emerald-600 dark:text-emerald-400">Healthee</span>
      </span>
    </span>
  );
}

/** Log in / Register switch shown at the top of both forms. */
function AuthTabs({ active }: { active: 'login' | 'signup' }) {
  const tab = (to: string, label: string, on: boolean) => (
    <Link
      to={to}
      replace
      aria-current={on ? 'page' : undefined}
      className={`flex min-h-10 items-center justify-center rounded-xl text-sm font-semibold transition ${on ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'}`}
    >
      {label}
    </Link>
  );
  return (
    <nav
      aria-label="登录或注册"
      className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900"
    >
      {tab('/login', '登录', active === 'login')}
      {tab('/signup', '注册', active === 'signup')}
    </nav>
  );
}

function AuthLayout({
  title,
  subtitle,
  back = true,
  tabs,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  tabs?: 'login' | 'signup';
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-white sm:bg-gradient-to-b sm:from-emerald-50 sm:via-white sm:to-[#e8f8f0] lg:grid lg:grid-cols-2 dark:bg-slate-900 dark:sm:from-slate-900 dark:sm:via-slate-900 dark:sm:to-slate-900">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-700 to-teal-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <span className="flex items-center gap-3">
          <img
            src="/brand/icon-192.png"
            alt=""
            className="size-10 rounded-xl bg-[#fbfaf3] ring-1 ring-black/5"
          />
          <span className="text-2xl font-bold">EatHealthee</span>
        </span>
        <div>
          <img
            src="/brand/icon-512.png"
            alt=""
            className="size-48 animate-float rounded-[2.5rem] shadow-2xl ring-4 ring-white/25"
          />
          <p className="mt-8 text-3xl leading-snug font-bold">
            拍一张照，
            <br />
            就知道吃了多少。
          </p>
          <ul className="mt-6 space-y-3 text-emerald-50">
            <li>📷 AI 拍照算热量，认得本地菜</li>
            <li>🎯 按你的身体计算安全的目标</li>
            <li>📈 体重趋势和成就，让你坚持下去</li>
          </ul>
        </div>
        <p className="text-sm text-emerald-100">Snap · Track · Be Healthier</p>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -bottom-24 size-80 rounded-full bg-white/10"
        />
      </aside>

      <div className="flex min-h-dvh flex-col px-5 pt-4 pb-8 sm:justify-center lg:px-12">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col sm:flex-none">
          <div className="flex min-h-11 items-center justify-between">
            {back ? <BackButton fallback="/" /> : <span />}
            <span className="lg:hidden">
              <Brand />
            </span>
          </div>
          <div className="mt-6 flex flex-1 animate-rise flex-col sm:mt-4 sm:flex-none sm:rounded-3xl sm:bg-white sm:p-8 sm:shadow-xl sm:ring-1 sm:shadow-emerald-900/5 sm:ring-slate-900/5 dark:sm:bg-slate-800 dark:sm:ring-white/10">
            <h1 className="text-[1.75rem] font-black tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
            )}
            {tabs && (
              <div className="mt-5">
                <AuthTabs active={tabs} />
              </div>
            )}
            <div className="mt-6 space-y-5">{children}</div>
            {footer && (
              <div className="mt-auto pt-8 text-center text-sm text-slate-600 sm:mt-6 sm:pt-0 dark:text-slate-300">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const submitClass = 'min-h-12 w-full text-base shadow-lg shadow-emerald-600/25 active:scale-[0.98]';

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const linkClass = 'font-semibold text-emerald-strong hover:underline dark:text-emerald';

const FEATURES = [
  { icon: '📷', title: '拍照算热量', text: '拍下整份食物，AI 认出每样菜并估算份量和热量。' },
  {
    icon: '🍛',
    title: 'AI 认得本地菜',
    text: 'Nasi lemak、鸡饭、roti canai 等马来西亚菜，AI 都认得并计算热量。',
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
    <div className="min-h-dvh bg-gradient-to-b from-emerald-50 via-white to-[#e8f8f0] text-navy dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 dark:text-slate-100">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 pt-10 pb-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14 lg:py-12">
        <section className="flex flex-1 flex-col items-center justify-center text-center lg:items-start lg:text-left">
          <div className="relative animate-float">
            <img
              src="/brand/icon-512.png"
              alt=""
              className="size-32 rounded-[2rem] bg-[#fbfaf3] shadow-xl shadow-emerald-700/15 sm:size-40"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-[18%] h-1 animate-scan rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_2px_rgba(16,185,129,0.6)]"
            />
          </div>
          <img
            src="/brand/wordmark.png"
            alt="EatHealthee：Snap · Track · Be Healthier"
            className="mt-6 w-full max-w-xs animate-rise rounded-2xl mix-blend-multiply dark:rounded-2xl dark:bg-[#fbfaf3] dark:mix-blend-normal"
            style={{ animationDelay: '0.1s' }}
          />
          <h1 className="sr-only">欢迎使用 EatHealthee</h1>
          <p
            className="mt-4 max-w-sm animate-rise leading-relaxed text-slate-600 dark:text-slate-300"
            style={{ animationDelay: '0.2s' }}
          >
            拍一张照，就知道吃了多少。
            <br />
            按你的生活方式，安全地
            <RotatingGoal />。
          </p>
          <ul className="mt-7 grid w-full max-w-md grid-cols-2 gap-2.5 text-left">
            {FEATURES.map((f, i) => (
              <li
                key={f.title}
                style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                className="animate-rise rounded-2xl border border-emerald-200/70 bg-white/80 p-3 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/80"
              >
                <span
                  aria-hidden="true"
                  className="mb-1.5 flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-lg dark:bg-emerald/20"
                >
                  {f.icon}
                </span>
                <span className="block text-sm font-bold">{f.title}</span>
                <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mx-auto mt-8 w-full max-w-md animate-rise space-y-3 lg:mt-0 lg:rounded-3xl lg:bg-white lg:p-8 lg:shadow-xl lg:ring-1 lg:ring-slate-900/5 dark:lg:bg-slate-800"
          style={{ animationDelay: '0.6s' }}
        >
          <h2 className="hidden text-2xl font-black lg:block">开始使用</h2>
          <p className="hidden pb-2 text-sm text-slate-600 lg:block dark:text-slate-300">
            完全免费，1 分钟完成设置。
          </p>
          <Link
            to="/signup"
            className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-strong px-4 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-800 active:scale-[0.98] dark:bg-emerald dark:text-slate-950"
          >
            免费开始使用
            <ArrowRight />
          </Link>
          <Link
            to="/login"
            className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            我已经有账号
          </Link>
          <Link
            to="/onboarding"
            className="flex min-h-11 items-center justify-center text-sm font-medium text-emerald-strong hover:underline dark:text-emerald"
          >
            先不登录，直接试用 ›
          </Link>
          <p className="pt-1 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            使用即表示你同意
            <Link to="/legal/disclaimer" className="mx-1 underline">
              健康免责声明
            </Link>
            和
            <Link to="/legal/privacy" className="ml-1 underline">
              隐私政策
            </Link>
            。不登录时，资料只存在这部设备。
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
    <AuthLayout
      title="欢迎回来"
      subtitle="登录后，记录会在你的所有设备同步。"
      tabs="login"
      footer={
        <>
          还没有账号？
          <Link to="/signup" replace className={linkClass}>
            免费注册
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email">
          {(p) => <EmailInput {...p} value={f.email} onChange={f.setEmail} />}
        </Field>
        <Field
          label="密码"
          labelAction={
            <Link to="/reset-password" className={`text-sm ${linkClass}`}>
              忘记密码？
            </Link>
          }
        >
          {(p) => (
            <PasswordInput
              {...p}
              autoComplete="current-password"
              value={f.password}
              onChange={f.setPassword}
            />
          )}
        </Field>
        {f.error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {f.error}
          </p>
        )}
        <Button type="submit" className={submitClass} disabled={f.busy}>
          {f.busy ? '登录中…' : '登录'}
          {!f.busy && <ArrowRight />}
        </Button>
      </form>
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
      <AuthLayout title="请确认你的 Email" back={false}>
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
    <AuthLayout
      title="创建免费账号"
      subtitle="换手机也能看到你的所有记录。"
      tabs="signup"
      footer={
        <>
          已有账号？
          <Link to="/login" replace className={linkClass}>
            登录
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email" error={f.email && !emailOk ? '请输入有效的 Email。' : null}>
          {(p) => <EmailInput {...p} value={f.email} onChange={f.setEmail} />}
        </Field>
        <Field label="设置密码" error={f.password && !passwordOk ? '密码至少要 8 个字元。' : null}>
          {(p) => (
            <>
              <PasswordInput
                {...p}
                autoComplete="new-password"
                value={f.password}
                onChange={f.setPassword}
              />
              <PasswordStrength value={f.password} />
            </>
          )}
        </Field>
        <Field label="再输入一次密码" error={confirm && !matches ? '两次输入的密码不一样。' : null}>
          {(p) => (
            <PasswordInput
              {...p}
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
            />
          )}
        </Field>
        <Check checked={agree} onChange={setAgree}>
          我同意把我的身体、饮食和体重记录保存到我的账号，并已阅读
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
          className={submitClass}
          disabled={f.busy || !emailOk || !passwordOk || !matches || !agree}
        >
          {f.busy ? '注册中…' : '注册，开始记录'}
          {!f.busy && <ArrowRight />}
        </Button>
      </form>
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
    <AuthLayout title="重置密码" subtitle="输入注册时的 Email，我们会寄重置链接给你。">
      {sent ? (
        <Notice>
          如果这个 Email 有注册，你会收到一封重置密码的信。请点击信中的链接设置新密码。
        </Notice>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="注册时用的 Email">
            {(p) => <EmailInput {...p} value={email} onChange={setEmail} />}
          </Field>
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className={submitClass}
            disabled={busy || !EMAIL_RE.test(email.trim())}
          >
            寄出重置链接
          </Button>
        </form>
      )}
      <p className="text-center text-sm">
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
          error={password && password.length < 8 ? '密码至少要 8 个字元。' : null}
        >
          {(p) => (
            <>
              <PasswordInput
                {...p}
                autoComplete="new-password"
                value={password}
                onChange={setPassword}
              />
              <PasswordStrength value={password} />
            </>
          )}
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {error}
          </p>
        )}
        <Button type="submit" className={submitClass} disabled={busy || password.length < 8}>
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
