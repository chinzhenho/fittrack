import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10 ${className}`}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary:
    'bg-emerald-strong text-white font-semibold shadow-sm hover:bg-emerald-800 dark:bg-emerald dark:text-slate-950 dark:hover:bg-emerald-400',
  secondary:
    'border border-slate-200 bg-white text-navy font-medium hover:border-emerald hover:bg-emerald-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600',
  ghost:
    'text-emerald-strong font-medium hover:bg-emerald-50 dark:text-emerald dark:hover:bg-emerald/10',
  danger:
    'border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm whitespace-nowrap transition focus-visible:outline-2 focus-visible:outline-emerald disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export const inputClass =
  'mt-1.5 block min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-navy focus:border-emerald focus:bg-white focus:outline-2 focus:outline-emerald/30 aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

export function Field({
  label,
  error,
  hint,
  labelAction,
  children,
}: {
  label: string;
  error?: string | null | undefined;
  hint?: string;
  /** Small link or button shown at the right end of the label row. */
  labelAction?: ReactNode;
  children: (props: {
    id: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean;
  }) => ReactNode;
}) {
  const id = useId();
  const msgId = `${id}-msg`;
  const describe = error || hint ? { 'aria-describedby': msgId } : {};
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {labelAction}
      </div>
      {children({ id, ...describe, ...(error ? { 'aria-invalid': true } : {}) })}
      {error ? (
        <p id={msgId} className="mt-1 text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="mt-1 text-xs text-slate-600 dark:text-slate-300">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: T;
  options: { value: T; label: string; sub?: string }[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      {hint && <p className="text-xs text-slate-600 dark:text-slate-300">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 cursor-pointer flex-col justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm transition hover:border-emerald has-checked:border-emerald-strong has-checked:bg-emerald-50 has-checked:font-semibold has-checked:text-emerald-900 has-focus-visible:outline-2 has-focus-visible:outline-emerald dark:border-slate-600 dark:bg-slate-700 dark:has-checked:border-emerald dark:has-checked:bg-emerald/20 dark:has-checked:text-emerald-100"
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span>{o.label}</span>
            {o.sub && (
              <span className="text-xs font-normal text-slate-600 dark:text-slate-300">
                {o.sub}
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 shrink-0 accent-emerald-strong"
      />
      <span>{children}</span>
    </label>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warn';
  title?: string;
  children: ReactNode;
}) {
  const cls =
    tone === 'warn'
      ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100'
      : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald/40 dark:bg-emerald/10 dark:text-slate-100';
  return (
    <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${cls}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-[1.7rem] font-bold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{sub}</p>}
    </div>
  );
}

export function Bar({
  value,
  max,
  color,
  track = 'bg-slate-100 dark:bg-slate-700',
}: {
  value: number;
  max: number;
  color: string;
  track?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`mt-1.5 h-2.5 rounded-full ${track}`} aria-hidden="true">
      <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export const backButtonClass =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white pr-4 pl-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-emerald hover:text-emerald-strong dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:text-emerald';

export function BackArrow() {
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
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** Back to the previous page, or `fallback` when the page was opened directly. */
export function BackButton({
  fallback = '/today',
  label = 'Back',
}: {
  fallback?: string;
  label?: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(fallback))}
      className={backButtonClass}
    >
      <BackArrow />
      {label}
    </button>
  );
}

/** Password field with a show/hide (eye) toggle. */
export function PasswordInput({
  value,
  onChange,
  autoComplete,
  ...field
}: {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        {...field}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pr-12 pl-11`}
      />
      <span className={inputIconClass} aria-hidden="true">
        <LockIcon />
      </span>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:text-emerald-strong dark:text-slate-300"
        style={{ marginTop: '0.1875rem' }}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {show && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}

/** Positions a decorative icon inside the left edge of an input (use with pl-11). */
export const inputIconClass =
  'pointer-events-none absolute top-1/2 left-4 mt-[0.1875rem] -translate-y-1/2 text-slate-400';

function StrokeIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

export const MailIcon = () => (
  <StrokeIcon d="M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zm-1 1l9 6 9-6" />
);
export const LockIcon = () => (
  <StrokeIcon d="M7 11V8a5 5 0 0110 0v3M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z" />
);

/** Email field with a mail icon. */
export function EmailInput({
  value,
  onChange,
  ...field
}: {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <input
        {...field}
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        placeholder="you@example.com"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pl-11`}
      />
      <span className={inputIconClass} aria-hidden="true">
        <MailIcon />
      </span>
    </div>
  );
}

/** Three-bar password strength: length 8+ is the minimum; mixing character kinds adds strength. */
export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length === 0) return 0;
  if (pw.length < 8) return 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  return pw.length >= 12 || kinds >= 3 ? 3 : 2;
}

export function PasswordStrength({ value }: { value: string }) {
  const level = passwordStrength(value);
  const meta = [
    { text: 'At least 8 characters', color: '' },
    { text: 'Too short', color: 'bg-rose-500 text-rose-600' },
    { text: 'OK', color: 'bg-amber-500 text-amber-600' },
    { text: 'Strong', color: 'bg-emerald-500 text-emerald-700' },
  ][level]!;
  const bar = meta.color.split(' ')[0] ?? '';
  return (
    <div className="mt-2 flex items-center gap-1.5" aria-live="polite">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-colors ${i <= level ? bar : 'bg-slate-200 dark:bg-slate-700'}`}
        />
      ))}
      <span
        className={`ml-1 w-20 shrink-0 text-right text-xs font-semibold ${level ? (meta.color.split(' ')[1] ?? '') : 'text-slate-500'}`}
      >
        {level ? `Password: ${meta.text.toLowerCase()}` : meta.text}
      </span>
    </div>
  );
}
