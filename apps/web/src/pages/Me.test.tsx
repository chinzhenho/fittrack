import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { replaceState } from '../data/store';
import { emptyState, type Profile } from '../data/types';
import { Me } from './Me';
import type * as AuthModule from '../data/auth';
import type * as SyncModule from '../data/sync';

const signOut = vi.fn(() => Promise.resolve());
const deleteAccount = vi.fn<() => Promise<string | null>>();
const deleteHealthRecords = vi.fn<() => Promise<string | null>>();

vi.mock('../data/auth', async (original) => ({
  ...(await original<typeof AuthModule>()),
  useAuth: () => ({ status: 'signedIn', user: { email: 'a@example.com' } }),
}));
vi.mock('../data/sync', async (original) => ({
  ...(await original<typeof SyncModule>()),
  useSync: () => ({ status: 'synced', ready: true }),
  signOut: () => signOut(),
  deleteAccount: () => deleteAccount(),
  deleteHealthRecords: () => deleteHealthRecords(),
}));

afterEach(cleanup);

const profile: Profile = {
  formulaSex: 'male',
  birthDate: '1996-01-01',
  heightCm: 175,
  activityLevel: 'light',
  goal: 'fat_loss',
  ratePctPerWeek: 0.5,
  goalStartDate: '2026-10-01',
  lifestyleMode: 'home',
  minutesPerDay: 15,
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

function renderMe(hideNumbers = false) {
  replaceState({
    ...emptyState,
    profile: { ...profile, hideNumbers, nickname: '小明' },
    targets: [
      {
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
      },
    ],
  });
  render(
    <MemoryRouter initialEntries={['/me']}>
      <ToastProvider>
        <Routes>
          <Route path="/me" element={<Me />} />
          <Route path="/welcome" element={<p>welcome page</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Me page sections', () => {
  it('shows the profile header with nickname, email, goal and calorie target', () => {
    renderMe();
    expect(screen.getByText('小明')).toBeTruthy();
    expect(screen.getAllByText('a@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText(/每日 1,960 kcal/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '编辑资料' }).getAttribute('href')).toBe('/me/profile');
  });

  it('scenario G: hiding numbers removes calories from the page', () => {
    renderMe(true);
    expect(screen.queryByText(/1,960/)).toBeNull();
  });

  it('is honest that there are no notifications (no fake toggles)', () => {
    renderMe();
    const section = screen.getByRole('region', { name: '提醒与通知' });
    expect(section.textContent).toContain('没有');
    expect(section.querySelector('input')).toBeNull();
  });

  it('scenario H: a failed account deletion shows the error and no success', async () => {
    deleteAccount.mockResolvedValueOnce('删除失败，请检查网络后再试。你的账号和资料都没有被删除。');
    renderMe();
    fireEvent.click(screen.getByRole('button', { name: '删除账号' }));
    const confirm = screen.getByRole('button', { name: '永久删除账号' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('请输入「删除」两个字确认'), {
      target: { value: '删除' },
    });
    fireEvent.click(confirm);
    expect((await screen.findByRole('alert')).textContent).toContain('没有被删除');
    expect(screen.queryByText('welcome page')).toBeNull();
  });

  it('scenario F: deleting the account leaves for the welcome page', async () => {
    deleteAccount.mockResolvedValueOnce(null);
    renderMe();
    fireEvent.click(screen.getByRole('button', { name: '删除账号' }));
    fireEvent.change(screen.getByLabelText('请输入「删除」两个字确认'), {
      target: { value: '删除' },
    });
    fireEvent.click(screen.getByRole('button', { name: '永久删除账号' }));
    expect(await screen.findByText('welcome page')).toBeTruthy();
  });

  it('scenario H: a failed record deletion keeps the dialog open with the error', async () => {
    deleteHealthRecords.mockResolvedValueOnce('删除失败，请检查网络后再试。你的记录没有被删除。');
    renderMe();
    fireEvent.click(screen.getByRole('button', { name: '删除所有健康记录' }));
    fireEvent.click(screen.getByRole('button', { name: '确定删除' }));
    expect((await screen.findByRole('alert')).textContent).toContain('没有被删除');
    expect(screen.queryByText('已删除所有健康记录')).toBeNull();
  });
});

describe('Me page', () => {
  it('shows a log-out button for signed-in users that signs out and leaves', async () => {
    replaceState({
      ...emptyState,
      profile: {
        formulaSex: 'male',
        birthDate: '1996-01-01',
        heightCm: 175,
        activityLevel: 'light',
        goal: 'fat_loss',
        ratePctPerWeek: 0.5,
        goalStartDate: '2026-10-01',
        lifestyleMode: 'home',
        minutesPerDay: 15,
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
      },
    });
    render(
      <MemoryRouter initialEntries={['/me']}>
        <ToastProvider>
          <Routes>
            <Route path="/me" element={<Me />} />
            <Route path="/welcome" element={<p>welcome page</p>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: '退出登录' }));
    expect(await screen.findByText('welcome page')).toBeTruthy();
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
