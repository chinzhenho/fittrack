import { CalculatorPage } from './calculator/CalculatorPage';

export function App() {
  return (
    <div className="min-h-dvh">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
          <img src="/favicon.svg" alt="" className="size-8" />
          <span className="text-lg font-semibold tracking-tight">FitTrack</span>
          <span className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
            示範版
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
        <CalculatorPage />
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        以上為根據公開公式的估算，不是醫療建議；如有疾病、懷孕或服用藥物，請先諮詢醫生或註冊營養師。
      </footer>
    </div>
  );
}
