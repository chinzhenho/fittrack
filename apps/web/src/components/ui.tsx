import { useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useNavigate } from 'react-router';

/**
 * A page section. Plain sections sit on the page with a thin line above them (no box);
 * `hero` is the one soft green panel for the main summary of a page.
 */
export function Card({
  children,
  className = '',
  tone = 'plain',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'plain' | 'hero';
}) {
  const look =
    tone === 'hero'
      ? 'rounded-[20px] bg-emerald-50 p-5 dark:bg-emerald/10'
      : 'border-t border-slate-200 pt-6 dark:border-white/10';
  return <section className={`${look} ${className}`}>{children}</section>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary:
    'bg-emerald-strong text-white font-semibold hover:brightness-110 active:brightness-95 dark:bg-emerald dark:text-black',
  secondary:
    'bg-slate-100 text-emerald-strong font-semibold hover:bg-slate-200 dark:bg-slate-700 dark:text-emerald dark:hover:bg-[#3a3a3c]',
  ghost:
    'text-emerald-strong font-medium hover:bg-emerald-50 dark:text-emerald dark:hover:bg-emerald/10',
  danger:
    'bg-red-50 font-semibold text-[#ff3b30] hover:bg-red-100 dark:bg-[#ff453a]/15 dark:text-[#ff453a]',
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-4 text-[0.9375rem] whitespace-nowrap transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-emerald disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export const inputClass =
  'mt-1.5 block min-h-12 w-full rounded-xl border border-transparent bg-[#767680]/[0.12] px-4 text-[1.0625rem] text-navy placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald/50 aria-invalid:border-[#ff3b30] dark:bg-[#767680]/[0.24] dark:text-slate-100 dark:focus:bg-slate-700';

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
            className="flex min-h-11 cursor-pointer flex-col justify-center rounded-[14px] bg-[#767680]/[0.12] px-4 py-2 text-[0.9375rem] transition hover:bg-[#767680]/20 has-checked:bg-emerald-strong has-checked:font-semibold has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-emerald dark:bg-[#767680]/[0.24] dark:has-checked:bg-emerald dark:has-checked:text-black"
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
            {o.sub && <span className="text-xs font-normal opacity-75">{o.sub}</span>}
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
        className="size-[22px] shrink-0 accent-emerald-strong"
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
      ? 'bg-[#fff4e5] text-[#5c3a00] dark:bg-[#ff9f0a]/15 dark:text-[#ffd60a]'
      : 'bg-emerald-50 text-emerald-950 dark:bg-emerald/15 dark:text-slate-100';
  return (
    <div className={`rounded-[18px] p-4 text-sm leading-relaxed ${cls}`}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6 pt-3">
      <h1 className="text-[2rem] leading-tight font-bold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-[0.9375rem] text-slate-500 dark:text-slate-400">{sub}</p>}
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
  '-ml-1.5 inline-flex min-h-11 items-center gap-0.5 pr-3 text-[1.0625rem] text-emerald-strong transition hover:opacity-70 dark:text-emerald';

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

// iOS-style grouped lists: a label on the left, the value on the right, native pickers
// on tap and switches for on/off. Used for settings and edit screens instead of stacked
// boxed form fields.

/** A titled group of rows on a white rounded card, with an optional footer note. */
export function List({
  title,
  footer,
  nested = false,
  children,
}: {
  title?: string;
  footer?: ReactNode;
  /** Inside a white card: use a light grey group instead. */
  nested?: boolean;
  children: ReactNode;
}) {
  return (
    <section aria-label={title}>
      {title && (
        <h2 className="mb-1 text-xs font-semibold tracking-[0.08em] text-emerald-strong uppercase dark:text-emerald">
          {title}
        </h2>
      )}
      <div
        className={`divide-y ${nested ? 'divide-slate-200 rounded-[14px] bg-slate-50 px-3 dark:divide-slate-600 dark:bg-slate-700/50' : 'divide-slate-200 border-y border-slate-200 dark:divide-white/10 dark:border-white/10'}`}
      >
        {children}
      </div>
      {footer && (
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {footer}
        </p>
      )}
    </section>
  );
}

const rowClass = 'relative flex min-h-12 items-center justify-between gap-3 py-2';
const rowLabelClass = 'shrink-0 text-[1.0625rem] text-navy dark:text-slate-100';
const rowValueClass = 'min-w-0 text-right text-[1.0625rem] text-slate-500 dark:text-slate-400';

/** A row showing a value; tapping opens the phone's own picker (a wheel on iPhone). */
export function SelectRow<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  const current = options.find((o) => o.value === value)?.label ?? '';
  return (
    <div className={rowClass}>
      <label htmlFor={id} className={rowLabelClass}>
        {label}
      </label>
      <span className={`flex items-center gap-1 ${rowValueClass}`}>
        <span className="truncate">{current}</span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="size-4 shrink-0 text-slate-400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 9.5l4-4 4 4M8 14.5l4 4 4-4" />
        </svg>
      </span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** A row with a borderless, right-aligned input and an optional unit. */
export function InputRow({
  label,
  unit,
  error,
  ...input
}: {
  label: string;
  unit?: string;
  error?: string | null | undefined;
  ref?: React.Ref<HTMLInputElement>;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div>
      <div className={rowClass}>
        <label htmlFor={id} className={rowLabelClass}>
          {label}
        </label>
        <span className="flex min-w-0 items-center justify-end gap-1">
          <input
            id={id}
            {...input}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-err` : undefined}
            className={`w-full min-w-0 bg-transparent text-right text-[1.0625rem] text-slate-600 placeholder:text-slate-400 focus:text-navy focus:outline-none dark:text-slate-300 dark:focus:text-white ${error ? 'text-[#ff3b30]' : ''} ${input.className ?? ''}`}
          />
          {unit && <span className="shrink-0 text-[1.0625rem] text-slate-500">{unit}</span>}
        </span>
      </div>
      {error && (
        <p id={`${id}-err`} className="-mt-1 pb-2 text-right text-xs text-[#ff3b30]">
          {error}
        </p>
      )}
    </div>
  );
}

const switchTrack =
  'relative h-[31px] w-[51px] shrink-0 rounded-full bg-[#787880]/[0.16] transition-colors peer-checked:bg-emerald-strong peer-focus-visible:outline-2 peer-focus-visible:outline-emerald after:absolute after:top-[2px] after:left-[2px] after:size-[27px] after:rounded-full after:bg-white after:shadow-[0_3px_8px_rgba(0,0,0,0.15)] after:transition-transform peer-checked:after:translate-x-5 dark:bg-[#787880]/[0.32]';

/** A standalone iOS-style switch. */
export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="relative inline-flex cursor-pointer">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span aria-hidden="true" className={switchTrack} />
    </label>
  );
}

/** An on/off row with an iOS-style switch. */
export function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: ReactNode;
  sub?: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className={`${rowClass} cursor-pointer`}>
      <span className="min-w-0">
        <span className="block text-[1.0625rem] text-navy dark:text-slate-100">{label}</span>
        {sub && <span className="block text-xs text-slate-500 dark:text-slate-400">{sub}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span aria-hidden="true" className={switchTrack} />
    </label>
  );
}

/** A tappable row that navigates or acts, with a value and chevron on the right. */
export function LinkRowContent({ label, value }: { label: ReactNode; value?: ReactNode }) {
  return (
    <>
      <span className={rowLabelClass}>{label}</span>
      <span className={`flex items-center gap-1.5 ${rowValueClass}`}>
        {value}
        <span aria-hidden="true" className="text-slate-300 dark:text-slate-500">
          ›
        </span>
      </span>
    </>
  );
}
export const linkRowClass = `${rowClass} hover:opacity-80`;

// Card-style choices and number steppers for edit screens (friendlier than lists of
// rows): each option is a tappable card with an icon and a short description.

export interface Choice<T extends string> {
  value: T;
  label: string;
  sub?: string;
  icon?: ReactNode;
}

/** Single choice as a grid of cards (radio buttons underneath for accessibility). */
export function ChoiceCards<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
  columns = 2,
}: {
  label: string;
  hint?: ReactNode;
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
  columns?: 1 | 2 | 3 | 4;
}) {
  const name = useId();
  const cols = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }[columns];
  return (
    <fieldset>
      <legend className="text-[1.0625rem] font-semibold">{label}</legend>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className={`mt-2 grid gap-2 ${cols}`}>
        {options.map((o) => (
          <label
            key={o.value}
            className={`relative flex min-h-14 cursor-pointer rounded-[16px] bg-white p-3 ring-1 ring-slate-200 transition has-checked:bg-emerald-50 has-checked:ring-2 has-checked:ring-emerald-strong has-focus-visible:outline-2 has-focus-visible:outline-emerald dark:bg-slate-800 dark:ring-slate-600 dark:has-checked:bg-emerald/15 dark:has-checked:ring-emerald ${columns === 1 ? 'items-center gap-3' : 'flex-col justify-center gap-0.5'}`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            {o.icon && (
              <span aria-hidden="true" className="text-xl leading-none">
                {o.icon}
              </span>
            )}
            <span className="min-w-0 pr-5">
              <span className="block text-[0.9375rem] leading-snug font-semibold">{o.label}</span>
              {o.sub && (
                <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">
                  {o.sub}
                </span>
              )}
            </span>
            <span
              aria-hidden="true"
              className="absolute top-2.5 right-2.5 hidden size-5 items-center justify-center rounded-full bg-emerald-strong text-xs font-bold text-white peer-checked:flex dark:bg-emerald dark:text-black"
            >
              ✓
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Several on/off choices as cards with a tick. */
export function CheckCards({
  label,
  hint,
  options,
  onToggle,
  columns,
}: {
  label: string;
  hint?: ReactNode;
  columns?: 1 | 2;
  options: { key: string; label: string; sub?: string; icon?: ReactNode; checked: boolean }[];
  onToggle: (key: string, checked: boolean) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[1.0625rem] font-semibold">{label}</legend>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div
        className={`mt-2 grid gap-2 ${(columns ?? (options.length === 1 ? 1 : 2)) === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
      >
        {options.map((o) => (
          <label
            key={o.key}
            className="relative flex min-h-14 cursor-pointer items-center gap-2.5 rounded-[16px] bg-white p-3 ring-1 ring-slate-200 transition has-checked:bg-emerald-50 has-checked:ring-2 has-checked:ring-emerald-strong has-focus-visible:outline-2 has-focus-visible:outline-emerald dark:bg-slate-800 dark:ring-slate-600 dark:has-checked:bg-emerald/15 dark:has-checked:ring-emerald"
          >
            <input
              type="checkbox"
              checked={o.checked}
              onChange={(e) => onToggle(o.key, e.target.checked)}
              className="peer sr-only"
            />
            {o.icon && (
              <span aria-hidden="true" className="text-xl leading-none">
                {o.icon}
              </span>
            )}
            <span className="min-w-0 pr-5">
              <span className="block text-sm leading-snug font-semibold">{o.label}</span>
              {o.sub && (
                <span className="block text-xs leading-snug text-slate-500 dark:text-slate-400">
                  {o.sub}
                </span>
              )}
            </span>
            <span
              aria-hidden="true"
              className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full ring-2 ring-slate-300 peer-checked:bg-emerald-strong peer-checked:ring-emerald-strong peer-checked:after:content-['✓'] after:text-xs after:font-bold after:text-white dark:ring-slate-500 dark:peer-checked:bg-emerald dark:peer-checked:ring-emerald"
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A big number with − / + buttons; the number can also be typed. */
export function Stepper({
  label,
  hint,
  unit,
  value,
  onChange,
  step = 0.1,
  fallback,
  placeholder,
  error,
}: {
  label: string;
  hint?: ReactNode;
  unit: string;
  /** Text so the field can be empty or mid-typing. */
  value: string;
  onChange: (value: string) => void;
  step?: number;
  /** Starting point for − / + when the field is empty. */
  fallback: number;
  placeholder?: string;
  error?: string | null | undefined;
}) {
  const id = useId();
  const n = Number(value);
  const bump = (d: number) => {
    const base = value.trim() === '' || Number.isNaN(n) ? fallback : n;
    const next = Math.round((base + d) / step) * step;
    onChange(String(Math.round(next * 10) / 10));
  };
  const btn =
    'flex size-11 shrink-0 items-center justify-center rounded-full bg-[#767680]/[0.12] text-xl font-semibold text-emerald-strong active:scale-95 dark:bg-[#767680]/[0.24] dark:text-emerald';
  return (
    <div>
      <label htmlFor={id} className="text-[1.0625rem] font-semibold">
        {label}
      </label>
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-2 flex items-center justify-between gap-3 rounded-[16px] bg-white p-2 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-600">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className={btn}
          onClick={() => bump(-step)}
        >
          −
        </button>
        <span className="flex items-baseline gap-1">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            step={step}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            className="w-24 bg-transparent text-center text-[1.75rem] font-bold placeholder:text-base placeholder:font-normal placeholder:text-slate-400 focus:outline-none"
          />
          <span className="text-base font-semibold text-slate-500">{unit}</span>
        </span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className={btn}
          onClick={() => bump(step)}
        >
          +
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-[#ff3b30]">{error}</p>}
    </div>
  );
}
