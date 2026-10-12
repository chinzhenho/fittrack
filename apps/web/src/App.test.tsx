import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppRoutes } from './App';
import { ToastProvider } from './components/Toast';
import { getState, replaceState } from './data/store';
import { emptyState } from './data/types';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const next = () => fireEvent.click(screen.getByRole('button', { name: '下一步' }));
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => replaceState(emptyState));
afterEach(cleanup);

describe('app flow', () => {
  it('sends new visitors to the welcome page with sign-up, log-in and guest options', async () => {
    renderAt('/today');
    expect(await screen.findByRole('heading', { name: '歡迎使用 FitTrack' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '註冊帳號' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '已有帳號，登入' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '先不登入，直接試用' })).toBeTruthy();
  });

  it('validates the sign-up form before contacting the server', async () => {
    renderAt('/signup');
    const submit = (await screen.findByRole('button', { name: '註冊' })) as HTMLButtonElement;
    change('Email', 'not-an-email');
    change('密碼', 'short');
    expect(screen.getByText('請輸入有效的 Email。')).toBeTruthy();
    expect(screen.getByText('密碼至少要 8 個字元。')).toBeTruthy();
    expect(submit.disabled).toBe(true);
    change('Email', 'a@example.com');
    change('密碼', 'longenough1');
    change('再輸入一次密碼', 'different1');
    expect(screen.getByText('兩次輸入的密碼不一樣。')).toBeTruthy();
    change('再輸入一次密碼', 'longenough1');
    expect(submit.disabled).toBe(true); // consent not given yet
    fireEvent.click(screen.getByLabelText(/我同意把我的身體/));
    expect(submit.disabled).toBe(false);
  });

  it('requires consent before continuing', () => {
    renderAt('/onboarding');
    const button = screen.getByRole('button', { name: '下一步' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('我年滿 18 歲'));
    fireEvent.click(screen.getByLabelText(/我已閱讀並接受/));
    fireEvent.click(screen.getByLabelText(/我同意 FitTrack 使用/));
    expect(button.disabled).toBe(false);
  });

  it('completes onboarding with spec case A and logs a food', () => {
    renderAt('/onboarding');
    fireEvent.click(screen.getByLabelText('我年滿 18 歲'));
    fireEvent.click(screen.getByLabelText(/我已閱讀並接受/));
    fireEvent.click(screen.getByLabelText(/我同意 FitTrack 使用/));
    next();
    fireEvent.click(screen.getByLabelText('減脂'));
    next();
    fireEvent.click(screen.getByLabelText(/在家運動/));
    next();
    fireEvent.click(screen.getByLabelText('男性公式'));
    change('出生日期', '1996-01-01');
    change('身高（cm）', '175');
    change('體重（kg）', '75');
    fireEvent.click(screen.getByLabelText(/^輕度/));
    next(); // -> health
    next(); // -> rate (default 0.5%)
    next(); // -> diet
    next(); // -> plan
    expect(screen.getAllByText(/1,920/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '開始使用' }));

    const s = getState();
    expect(s.profile?.goal).toBe('fat_loss');
    expect(s.targets[0]).toMatchObject({
      caloriesKcal: 1920,
      proteinG: 120,
      fatG: 53,
      carbsG: 241,
      reason: 'initial',
    });
    expect(s.weights[0]?.weightKg).toBe(75);
    expect(screen.getByText('今天的小目標')).toBeTruthy();

    cleanup();
    renderAt('/diary/add?meal=lunch');
    change('搜尋食物', 'tauhu');
    fireEvent.click(screen.getByRole('button', { name: /板豆腐/ }));
    change('份量（g）', '150');
    fireEvent.click(screen.getByRole('button', { name: '加入午餐' }));
    const meal = getState().meals[0];
    expect(meal).toMatchObject({ meal: 'lunch', grams: 150, foodId: 'usda-172475' });
    expect(meal?.nutrients.kcal).toBeCloseTo(216, 10);
  });

  it('shows the safety refusal for an underweight fat-loss goal', () => {
    renderAt('/onboarding');
    fireEvent.click(screen.getByLabelText('我年滿 18 歲'));
    fireEvent.click(screen.getByLabelText(/我已閱讀並接受/));
    fireEvent.click(screen.getByLabelText(/我同意 FitTrack 使用/));
    next();
    fireEvent.click(screen.getByLabelText('減脂'));
    next();
    next();
    change('出生日期', '2000-05-05');
    change('身高（cm）', '169.6');
    change('體重（kg）', '51.5');
    next(); // -> health
    next(); // -> rate
    next(); // -> diet
    next(); // -> plan
    expect(screen.getByText('目前不建議減脂')).toBeTruthy();
    expect((screen.getByRole('button', { name: '開始使用' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
