import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastMessage {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

const ToastContext = createContext<(t: ToastMessage) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((t: ToastMessage) => {
    clearTimeout(timer.current);
    setToast(t);
    timer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 lg:bottom-6"
      >
        {toast && (
          <div className="pointer-events-auto flex items-center gap-4 rounded-xl bg-navy px-4 py-3 text-sm text-white shadow-lg dark:bg-slate-700">
            <span>{toast.text}</span>
            {toast.actionLabel && (
              <button
                type="button"
                className="min-h-11 font-semibold text-emerald"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
