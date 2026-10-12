import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm transition focus-visible:outline-2 focus-visible:outline-emerald disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export const inputClass =
  'mt-1.5 block min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base text-navy focus:border-emerald focus:bg-white focus:outline-2 focus:outline-emerald/30 aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100';

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | null | undefined;
  hint?: string;
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
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
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
