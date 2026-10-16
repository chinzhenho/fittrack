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
import { IconTile, type IconName } from '../components/Icons';
import { setLang, t, tr, useLang } from '../lib/i18n';

function Brand() {
  return (
    <span className="flex items-center gap-2">
      <img
        src="/brand/icon-192.png"
        alt=""
        className="size-8 rounded-xl bg-[#fbfaf3] ring-1 ring-black/5"
      />
      <span className="text-lg font-extrabold tracking-tight">
        {t('Eat')}
        <span className="text-emerald-600 dark:text-emerald-400">{t('Healthee')}</span>
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
      aria-label={t('Log in or sign up')}
      className="grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900"
    >
      {tab('/login', t('Log in'), active === 'login')}
      {tab('/signup', t('Sign up'), active === 'signup')}
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
          <span className="text-2xl font-bold">{t('EatHealthee')}</span>
        </span>
        <div>
          <img
            src="/brand/icon-512.png"
            alt=""
            className="size-48 animate-float rounded-[2.5rem] shadow-2xl ring-4 ring-white/25"
          />
          <p className="mt-8 text-3xl leading-snug font-bold">
            {t('Snap a photo,')}
            <br />
            {t('know what you ate.')}
          </p>
          <ul className="mt-6 space-y-3 text-emerald-50">
            <li>{t('📷 AI photo calories that know local food')}</li>
            <li>{t('🎯 Safe targets worked out for your body')}</li>
            <li>{t('📈 Weight trends and badges to keep you going')}</li>
          </ul>
        </div>
        <p className="text-sm text-emerald-100">{t('Snap · Track · Be Healthier')}</p>
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

const FEATURES: { icon: IconName; title: string; text: string }[] = tr([
  {
    icon: 'camera',
    title: 'Snap to count',
    text: 'Take a photo of your meal. AI spots each dish and estimates the calories; you check before it is saved.',
  },
  {
    icon: 'fork',
    title: 'Made for local food',
    text: 'Nasi lemak, roti canai, chicken rice, kopi and other Malaysian favourites.',
  },
  {
    icon: 'trend',
    title: 'Safe targets, real progress',
    text: 'A daily target worked out for your body, plus your weight trend, streaks and medals.',
  },
]);

const GOALS = tr(['lose fat', 'gain weight', 'build muscle', 'stay in shape']);

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

/** Switches between English and Chinese; shows the other language's own name. */
function LanguageToggle() {
  const lang = useLang();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      className="order-last ml-auto min-h-10 rounded-full bg-white px-4 text-sm font-medium ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:ring-white/10"
      lang={lang === 'zh' ? 'en' : 'zh-Hans'}
    >
      {lang === 'zh' ? 'English' : '中文'}
    </button>
  );
}

export function Welcome() {
  return (
    <div className="min-h-dvh bg-mist text-navy dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-6 pt-12 pb-8 lg:grid lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:py-12">
        <section className="flex flex-1 flex-col">
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <div className="relative">
              <img
                src="/brand/icon-192.png"
                alt=""
                className="size-14 rounded-[1rem] bg-[#fbfaf3] shadow-md shadow-emerald-900/10"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-[18%] h-0.5 animate-scan rounded-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
              />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight">{t('EatHealthee')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('Snap · Track · Be healthier')}
              </p>
            </div>
          </div>

          <h1
            className="mt-10 animate-rise text-[2.25rem] leading-[1.15] font-bold tracking-tight sm:text-[2.75rem]"
            style={{ animationDelay: '0.1s' }}
          >
            {t('Snap your meal.')}
            <br />
            <span className="text-emerald-strong dark:text-emerald">{t('Know what you ate.')}</span>
          </h1>
          <p
            className="mt-4 max-w-md animate-rise text-[1.0625rem] leading-relaxed text-slate-500 dark:text-slate-400"
            style={{ animationDelay: '0.2s' }}
          >
            {t('A free calorie tracker that helps you safely')} <RotatingGoal />
            {t(', one meal at a time.')}
          </p>

          <ul className="mt-10 max-w-md space-y-6">
            {FEATURES.map((f, i) => (
              <li
                key={f.title}
                style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                className="flex animate-rise gap-4"
              >
                <IconTile name={f.icon} tint="" />
                <div>
                  <p className="font-semibold">{f.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    {f.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="mx-auto mt-12 w-full max-w-md animate-rise space-y-3 lg:mt-0 lg:rounded-[20px] lg:bg-white lg:p-8 lg:shadow-sm lg:ring-1 lg:ring-slate-200 dark:lg:bg-slate-800 dark:lg:ring-white/10"
          style={{ animationDelay: '0.5s' }}
        >
          <h2 className="hidden text-2xl font-bold tracking-tight lg:block">{t('Get started')}</h2>
          <p className="hidden pb-2 text-sm text-slate-500 lg:block dark:text-slate-400">
            {t('Free. Set up in about a minute.')}
          </p>
          <Link
            to="/signup"
            className="flex min-h-13 items-center justify-center gap-2 rounded-[14px] bg-emerald-strong px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-800 active:scale-[0.98] dark:bg-emerald dark:text-slate-950"
          >
            {t('Start for free')}
            <ArrowRight />
          </Link>
          <Link
            to="/login"
            className="flex min-h-12 items-center justify-center rounded-[14px] bg-white px-4 font-medium ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:ring-white/10 dark:hover:bg-slate-700"
          >
            {t('I already have an account')}
          </Link>
          <Link
            to="/onboarding"
            className="flex min-h-11 items-center justify-center text-sm font-medium text-emerald-strong hover:underline dark:text-emerald"
          >
            {t('Try it without an account ›')}
          </Link>
          <p className="pt-1 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {t('By continuing you agree to the')}
            <Link to="/legal/disclaimer" className="mx-1 underline">
              {t('health disclaimer')}
            </Link>
            {t('and')}
            <Link to="/legal/privacy" className="ml-1 underline">
              {t('privacy policy')}
            </Link>
            {t('. Without an account, your data stays on this device.')}
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
      title={t('Welcome back')}
      subtitle={t('Log in to sync your logs across all your devices.')}
      tabs="login"
      footer={
        <>
          {t("Don't have an account?")}{' '}
          <Link to="/signup" replace className={linkClass}>
            {t('Sign up free')}
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label={t('Email')}>
          {(p) => <EmailInput {...p} value={f.email} onChange={f.setEmail} />}
        </Field>
        <Field
          label={t('Password')}
          labelAction={
            <Link to="/reset-password" className={`text-sm ${linkClass}`}>
              {t('Forgot password?')}
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
          {f.busy ? t('Logging in…') : t('Log in')}
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
      <AuthLayout title={t('Confirm your email')} back={false}>
        <Notice title={t('Confirmation email sent')}>
          {t('We sent a confirmation email to')} <strong>{sentTo}</strong>
          {t(". Open it and click the link, and you'll be logged in.")}
        </Notice>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t("Didn't get it? Check your spam folder, or try again in a few minutes.")}
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('Create a free account')}
      subtitle={t('See all your logs on any phone.')}
      tabs="signup"
      footer={
        <>
          {t('Have an account?')}{' '}
          <Link to="/login" replace className={linkClass}>
            {t('Log in')}
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <Field label={t('Email')} error={f.email && !emailOk ? t('Enter a valid email.') : null}>
          {(p) => <EmailInput {...p} value={f.email} onChange={f.setEmail} />}
        </Field>
        <Field
          label={t('Create a password')}
          error={f.password && !passwordOk ? t('Use at least 8 characters.') : null}
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
          label={t('Enter it again')}
          error={confirm && !matches ? t("The passwords don't match.") : null}
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
          {t('I agree to store my body, food and weight records in my account, and have read the')}
          <Link to="/legal/privacy" target="_blank" className={`mx-1 ${linkClass}`}>
            {t('privacy policy')}
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
          {f.busy ? t('Signing up…') : t('Sign up and start')}
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
      title={t('Reset password')}
      subtitle={t("Enter the email you signed up with and we'll send you a reset link.")}
    >
      {sent ? (
        <Notice>
          {t(
            "If this email is registered, you'll get a reset email. Click the link in it to set a new password.",
          )}
        </Notice>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Field label={t('Your account email')}>
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
            {t('Send reset link')}
          </Button>
        </form>
      )}
      <p className="text-center text-sm">
        <Link to="/login" className={linkClass}>
          {t('Back to log in')}
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
      <AuthLayout title={t('Link expired')}>
        <p className="text-sm">
          {t('This reset link has been used or has expired. Please request a new one.')}
        </p>
        <Link to="/reset-password" className={linkClass}>
          {t('Send a new reset link')}
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
    <AuthLayout title={isRecovering() ? t('Set a new password') : t('Change password')}>
      <form className="space-y-4" onSubmit={submit}>
        <Field
          label={t('New password')}
          error={password && password.length < 8 ? t('Use at least 8 characters.') : null}
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
          {t('Save new password')}
        </Button>
      </form>
    </AuthLayout>
  );
}

export function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status">
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('Loading your data…')}</p>
    </div>
  );
}
