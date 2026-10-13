import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { getState, replaceState } from '../data/store';
import { emptyState, type Profile } from '../data/types';
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

function renderProfile() {
  replaceState({
    ...emptyState,
    profile,
    weights: [{ id: 'w', date: '2026-10-01', measuredAt: 'x', weightKg: 75 }],
  });
  render(
    <MemoryRouter initialEntries={['/me/profile']}>
      <ToastProvider>
        <Routes>
          <Route path="/me/profile" element={<Me mode="profile" />} />
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
});
