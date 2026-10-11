import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900 ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{children}</h2>
      {action}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-emerald text-navy font-semibold hover:brightness-95',
  secondary:
    'border border-slate-300 bg-white text-navy hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700',
  ghost: 'text-emerald-strong hover:bg-emerald/10 dark:text-emerald',
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
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm transition focus-visible:outline-2 focus-visible:outline-emerald disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

export const inputClass =
  'mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-navy focus:border-emerald focus:outline-2 focus:outline-emerald/40 aria-invalid:border-red-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

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
        <p id={msgId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
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
      {hint && <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-11 cursor-pointer flex-col justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm has-checked:border-emerald has-checked:bg-emerald/15 has-checked:font-medium has-focus-visible:outline-2 has-focus-visible:outline-emerald dark:border-slate-600"
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
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
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
      : 'border-emerald/40 bg-emerald/10 text-navy dark:text-slate-100';
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
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{sub}</p>}
    </div>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
