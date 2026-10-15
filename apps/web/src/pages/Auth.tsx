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
      aria-label="Log in or sign up"
      className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900"
    >
      {tab('/login', 'Log in', active === 'login')}
      {tab('/signup', 'Sign up', active === 'signup')}
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
            Snap a photo,
            <br />
            know what you ate.
          </p>
          <ul className="mt-6 space-y-3 text-emerald-50">
            <li>📷 AI photo calories that know local food</li>
            <li>🎯 Safe targets worked out for your body</li>
            <li>📈 Weight trends and badges to keep you going</li>
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
  {
    icon: '📷',
    title: 'Snap to count',
    text: 'Photograph your meal; AI spots each dish and estimates the portion and calories.',
  },
  {
    icon: '🍛',
    title: 'Knows local food',
    text: 'Nasi lemak, chicken rice, roti canai and other Malaysian favourites are recognised and counted.',
  },
  {
    icon: '🎯',
    title: 'Safe targets',
    text: "Worked out for your body and lifestyle. You don't need a gym to start.",
  },
  {
    icon: '📈',
    title: 'See progress',
    text: 'Weight trends, streaks and badges make it easier to keep going.',
  },
];

const GOALS = ['lose fat', 'gain weight', 'build muscle', 'stay in shape'];

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
            alt="EatHealthee: Snap · Track · Be Healthier"
            className="mt-6 w-full max-w-xs animate-rise rounded-2xl mix-blend-multiply dark:rounded-2xl dark:bg-[#fbfaf3] dark:mix-blend-normal"
            style={{ animationDelay: '0.1s' }}
          />
          <h1 className="sr-only">Welcome to EatHealthee</h1>
          <p
            className="mt-4 max-w-sm animate-rise leading-relaxed text-slate-600 dark:text-slate-300"
            style={{ animationDelay: '0.2s' }}
          >
            Snap a photo, know what you ate.
            <br />
            Safely <RotatingGoal />, your way.
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
          <h2 className="hidden text-2xl font-black lg:block">Get started</h2>
          <p className="hidden pb-2 text-sm text-slate-600 lg:block dark:text-slate-300">
            Completely free. Set up in 1 minute.
          </p>
          <Link
            to="/signup"
            className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-strong px-4 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-800 active:scale-[0.98] dark:bg-emerald dark:text-slate-950"
          >
            Start for free
            <ArrowRight />
          </Link>
          <Link
            to="/login"
            className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          >
            I already have an account
          </Link>
          <Link
            to="/onboarding"
            className="flex min-h-11 items-center justify-center text-sm font-medium text-emerald-strong hover:underline dark:text-emerald"
          >
            Try it without an account ›
          </Link>
          <p className="pt-1 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            By continuing you agree to the
            <Link to="/legal/disclaimer" className="mx-1 underline">
              health disclaimer
            </Link>
            and
            <Link to="/legal/privacy" className="ml-1 underline">
              privacy policy
            </Link>
            . Without an account, your data stays on this device.
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
      title="Welcome back"
      subtitle="Log in to sync your logs across all your devices."
      tabs="login"
      footer={
        <>
          Don't have an account?{' '}
          <Link to="/signup" replace className={linkClass}>
            Sign up free
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email">
          {(p) => <EmailInput {...p} value={f.email} onChange={f.setEmail} />}
        </Field>
        <Field
          label="Password"
          labelAction={
            <Link to="/reset-password" className={`text-sm ${linkClass}`}>
              Forgot password?
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
          {f.busy ? 'Logging in…' : 'Log in'}
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
      <AuthLayout title="Confirm your email" back={false}>
        <Notice title="Confirmation email sent">
          We sent a confirmation email to <strong>{sentTo}</strong>. Open it and click the link, and
          you'll be logged in.
        </Notice>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Didn't get it? Check your spam folder, or try again in a few minutes.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create a free account"
      subtitle="See all your logs on any phone."
      tabs="signup"
      footer={
        <>
          Have an account?{' '}
          <Link to="/login" replace className={linkClass}>
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label="Email" error={f.email && !emailOk ? 'Enter a valid email.' : null}>
          {(p) => <EmailInput {...p} value={f.email} onChange={f.setEmail} />}
        </Field>
        <Field
          label="Create a password"
          error={f.password && !passwordOk ? 'Use at least 8 characters.' : null}
        >
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
        <Field
          label="Enter it again"
          error={confirm && !matches ? "The passwords don't match." : null}
        >
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
          I agree to store my body, food and weight records in my account, and have read the
          <Link to="/legal/privacy" target="_blank" className={`mx-1 ${linkClass}`}>
            privacy policy
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
          {f.busy ? 'Signing up…' : 'Sign up and start'}
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
    <AuthLayout
      title="Reset password"
      subtitle="Enter the email you signed up with and we'll send you a reset link."
    >
      {sent ? (
        <Notice>
          If this email is registered, you'll get a reset email. Click the link in it to set a new
          password.
        </Notice>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Your account email">
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
            Send reset link
          </Button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link to="/login" className={linkClass}>
          Back to log in
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
      <AuthLayout title="Link expired">
        <p className="text-sm">
          This reset link has been used or has expired. Please request a new one.
        </p>
        <Link to="/reset-password" className={linkClass}>
          Send a new reset link
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
    <AuthLayout title={isRecovering() ? 'Set a new password' : 'Change password'}>
      <form className="space-y-4" onSubmit={submit}>
        <Field
          label="New password"
          error={password && password.length < 8 ? 'Use at least 8 characters.' : null}
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
          Save new password
        </Button>
      </form>
    </AuthLayout>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <p className="text-sm text-slate-600 dark:text-slate-300">Loading your data…</p>
    </div>
  );
}
