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
const tap = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => replaceState(emptyState));
afterEach(cleanup);

describe('app flow', () => {
  it('sends new visitors to the welcome page with sign-up, log-in and guest options', async () => {
    renderAt('/today');
    expect(await screen.findByRole('heading', { name: '欢迎使用 FitTrack' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '注册账号' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '已有账号，登录' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '先不登录，直接试用' })).toBeTruthy();
  });

  it('validates the sign-up form before contacting the server', async () => {
    renderAt('/signup');
    const submit = (await screen.findByRole('button', { name: '注册' })) as HTMLButtonElement;
    change('Email', 'not-an-email');
    change('密码', 'short');
    expect(screen.getByText('请输入有效的 Email。')).toBeTruthy();
    expect(screen.getByText('密码至少要 8 个字元。')).toBeTruthy();
    expect(submit.disabled).toBe(true);
    change('Email', 'a@example.com');
    change('密码', 'longenough1');
    change('再输入一次密码', 'different1');
    expect(screen.getByText('两次输入的密码不一样。')).toBeTruthy();
    change('再输入一次密码', 'longenough1');
    expect(submit.disabled).toBe(true); // consent not given yet
    fireEvent.click(screen.getByLabelText(/我同意把我的身体/));
    expect(submit.disabled).toBe(false);
  });

  it('requires consent before continuing', () => {
    renderAt('/onboarding');
    const button = screen.getByRole('button', { name: '下一步' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('我年满 18 岁'));
    fireEvent.click(screen.getByLabelText(/我已阅读并接受/));
    fireEvent.click(screen.getByLabelText(/我同意 FitTrack 使用/));
    expect(button.disabled).toBe(false);
  });

  it('completes onboarding with spec case A and logs a food', async () => {
    renderAt('/onboarding');
    fireEvent.click(screen.getByLabelText('我年满 18 岁'));
    fireEvent.click(screen.getByLabelText(/我已阅读并接受/));
    fireEvent.click(screen.getByLabelText(/我同意 FitTrack 使用/));
    next();
    tap(/减脂/);
    tap(/在家运动/);
    tap('10–15 分钟');
    tap(/初学者/);
    tap('男性公式');
    change('出生日期', '1996-01-01');
    change('身高（cm）', '175');
    change('体重（kg）', '75');
    next();
    tap(/^轻度/);
    tap('以上都没有');
    tap(/每周 0.5% 体重/);
    tap('跳过'); // target weight
    tap('没有特别限制');
    expect(screen.getAllByText(/1,920/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: '开始使用' }));

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
    expect(screen.getByText('今天的小目标')).toBeTruthy();

    cleanup();
    renderAt('/diary/add?meal=lunch');
    // Manual entry from a nutrition label (tofu, per 100 g), then 150 g logged.
    fireEvent.click(screen.getByRole('button', { name: '＋ 输入' }));
    change('名称', '板豆腐');
    change('热量（kcal）', '144');
    change('蛋白质（g）', '17.3');
    change('碳水化合物（g）', '2.78');
    change('脂肪（g）', '8.72');
    fireEvent.click(screen.getByRole('button', { name: '保存并选择' }));
    change('份量（g）', '150');
    fireEvent.click(screen.getByRole('button', { name: '加入午餐' }));
    const meal = getState().meals[0];
    expect(meal).toMatchObject({ meal: 'lunch', grams: 150, name: '板豆腐' });
    expect(meal?.nutrients.kcal).toBeCloseTo(216, 10);

    // The food now appears under 最近吃过 and can be logged again in one tap.
    cleanup();
    renderAt('/diary/add?meal=dinner');
    fireEvent.click(screen.getByRole('button', { name: /板豆腐/ }));
    fireEvent.click(screen.getByRole('button', { name: '加入晚餐' }));
    expect(getState().meals.filter((m) => m.name === '板豆腐')).toHaveLength(2);
  });

  it('shows the safety refusal for an underweight fat-loss goal', () => {
    renderAt('/onboarding');
    fireEvent.click(screen.getByLabelText('我年满 18 岁'));
    fireEvent.click(screen.getByLabelText(/我已阅读并接受/));
    fireEvent.click(screen.getByLabelText(/我同意 FitTrack 使用/));
    next();
    tap(/减脂/);
    tap(/暂时不运动/);
    tap('不一定');
    tap(/初学者/);
    tap('女性公式');
    change('出生日期', '2000-05-05');
    change('身高（cm）', '169.6');
    change('体重（kg）', '51.5');
    next();
    tap(/^久坐/);
    tap('以上都没有');
    tap(/每周 0.5% 体重/);
    tap('跳过');
    tap('没有特别限制');
    expect(screen.getByText('目前不建议减脂')).toBeTruthy();
    expect((screen.getByRole('button', { name: '开始使用' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
