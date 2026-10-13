import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { getState, replaceState } from '../data/store';
import { emptyState, type Profile, type TargetVersion } from '../data/types';
import { Me } from './Me';

const profile: Profile = {
  formulaSex: 'male',
  birthDate: '1996-01-01',
  heightCm: 175,
  activityLevel: 'light',
  goal: 'fat_loss',
  ratePctPerWeek: 0.5,
  goalStartDate: '2026-10-01',
  lifestyleMode: 'nutrition_first',
  minutesPerDay: 0,
  experience: 'beginner',
  dietTags: [],
  screening: {
    pregnantOrLactating: false,
    eatingDisorderHistory: false,
    kidneyDisease: false,
    exerciseCaution: false,
  },
  hideNumbers: false,
  consentedAt: '2026-10-01T00:00:00Z',
};

const target: TargetVersion = {
  id: 't1',
  effectiveFrom: '2026-10-01',
  createdAt: '2026-10-01T00:00:00Z',
  reason: 'initial',
  formulaVersion: '1.0.0',
  weightKg: 75,
  bmrKcal: 1700,
  tdeeKcal: 2340,
  calorieFloorKcal: 1700,
  caloriesKcal: 1960,
  proteinG: 120,
  carbsG: 220,
  fatG: 55,
  clamps: [],
};

const meal = {
  id: 'm1',
  date: '2026-10-02',
  meal: 'lunch' as const,
  foodId: 'f',
  name: '鸡饭',
  grams: 300,
  nutrients: { kcal: 600, proteinG: 30, carbsG: 80, fatG: 15 },
  sourceRef: 'test',
  createdAt: '2026-10-02T12:00:00Z',
};

function renderProfile(withTarget = false, path = '/me/profile') {
  replaceState({
    ...emptyState,
    profile,
    targets: withTarget ? [target] : [],
    meals: [meal],
    weights: [{ id: 'w', date: '2026-10-01', measuredAt: 'x', weightKg: 75 }],
  });
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="/me/profile" element={<Me mode="profile" />} />
          <Route path="/me/plan" element={<Me mode="plan" />} />
          <Route path="/me/targets" element={<Me mode="targets" />} />
          <Route path="/me" element={<p>me page</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

afterEach(cleanup);

describe('edit profile', () => {
  it('saves nickname, avatar and target weight without creating a new calorie target', async () => {
    renderProfile();
    fireEvent.change(screen.getByLabelText('昵称（选填）'), { target: { value: ' 小明 ' } });
    fireEvent.click(screen.getByRole('button', { name: '头像 🥑' }));
    fireEvent.change(screen.getByLabelText('目标体重（kg，选填）'), { target: { value: '68' } });
    fireEvent.click(screen.getByRole('button', { name: '保存个人资料' }));
    await screen.findByText('me page');
    const s = getState();
    expect(s.profile).toMatchObject({ nickname: '小明', avatar: '🥑', targetWeightKg: 68 });
    expect(s.targets).toHaveLength(0);
  });

  it('rejects a fat-loss target weight above the current weight', () => {
    renderProfile();
    fireEvent.change(screen.getByLabelText('目标体重（kg，选填）'), { target: { value: '80' } });
    expect(screen.getByText('目标体重需低于现在的体重。')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: '保存个人资料' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('recalculates the target when height changes', async () => {
    renderProfile();
    fireEvent.change(screen.getByLabelText('身高（cm）'), { target: { value: '180' } });
    fireEvent.click(screen.getByRole('button', { name: '保存个人资料' }));
    await screen.findByText('me page');
    expect(getState().profile?.heightCm).toBe(180);
    expect(getState().targets).toHaveLength(1);
  });

  it('scenario E: shows old and new targets and keeps the plan when asked', async () => {
    renderProfile(true);
    fireEvent.change(screen.getByLabelText('身高（cm）'), { target: { value: '180' } });
    fireEvent.click(screen.getByRole('button', { name: '预览新的每日目标' }));
    const compare = screen.getByRole('region', { name: '新旧目标比较' });
    expect(compare.textContent).toContain('1,960 kcal');
    fireEvent.click(screen.getByRole('button', { name: '保留原计划' }));
    await screen.findByText('me page');
    expect(getState().profile?.heightCm).toBe(175);
    expect(getState().targets).toHaveLength(1);
  });

  it('scenario E: confirming a goal change adds a target and keeps history and food records', async () => {
    renderProfile(true, '/me/plan');
    fireEvent.click(screen.getByRole('radio', { name: '维持体重' }));
    fireEvent.click(screen.getByRole('radio', { name: /^中度/ }));
    fireEvent.click(screen.getByRole('button', { name: '预览新的每日目标' }));
    fireEvent.click(screen.getByRole('button', { name: '确认更新' }));
    await screen.findByText('me page');
    const s = getState();
    expect(s.profile?.goal).toBe('maintain');
    expect(s.targets.map((t) => t.reason)).toEqual(['initial', 'profile_change']);
    expect(s.targets[1]!.caloriesKcal).not.toBe(1960);
    expect(s.meals).toEqual([meal]);
  });

  it('explains the current target with the Mifflin–St Jeor steps', () => {
    renderProfile(true, '/me/targets');
    expect(screen.getByText(/基础代谢（BMR）：1,700 kcal/)).toBeTruthy();
    expect(screen.getByText(/每日总消耗（TDEE）：2,340 kcal/)).toBeTruthy();
    expect(screen.getByText(/安全下限：1,700 kcal/)).toBeTruthy();
  });
});
