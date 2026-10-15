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

function renderMe(hideNumbers = false, path = '/me') {
  replaceState({
    ...emptyState,
    profile: { ...profile, hideNumbers, nickname: 'Alex' },
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
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="/me" element={<Me />} />
          <Route path="/me/profile" element={<Me mode="profile" />} />
          <Route path="/welcome" element={<p>welcome page</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('Me page sections', () => {
  it('shows the profile header with nickname, email, goal and calorie target', () => {
    renderMe();
    expect(screen.getByText('Alex')).toBeTruthy();
    expect(screen.getAllByText('a@example.com').length).toBeGreaterThan(0);
    expect(screen.getByText(/1,960 kcal a day/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit profile' }).getAttribute('href')).toBe(
      '/me/profile',
    );
  });

  it('scenario G: hiding numbers removes calories from the page', () => {
    renderMe(true);
    expect(screen.queryByText(/1,960/)).toBeNull();
  });

  it('is honest that there are no notifications (no fake toggles)', () => {
    renderMe();
    const section = screen.getByRole('region', { name: 'Reminders & notifications' });
    expect(section.textContent).toContain('not');
    expect(section.querySelector('input')).toBeNull();
  });

  it('scenario H: a failed account deletion shows the error and no success', async () => {
    deleteAccount.mockResolvedValueOnce(
      'Delete failed. Check your connection and try again. Your account and data were not deleted.',
    );
    renderMe(false, '/me/profile');
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    const confirm = screen.getByRole('button', {
      name: 'Delete account forever',
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(confirm);
    expect((await screen.findByRole('alert')).textContent).toContain('not deleted');
    expect(screen.queryByText('welcome page')).toBeNull();
  });

  it('scenario F: deleting the account leaves for the welcome page', async () => {
    deleteAccount.mockResolvedValueOnce(null);
    renderMe(false, '/me/profile');
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    fireEvent.change(screen.getByLabelText('Type DELETE to confirm'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Delete account forever' }));
    expect(await screen.findByText('welcome page')).toBeTruthy();
  });

  it('scenario H: a failed record deletion keeps the dialog open with the error', async () => {
    deleteHealthRecords.mockResolvedValueOnce(
      'Delete failed. Check your connection and try again. Your records were not deleted.',
    );
    renderMe();
    fireEvent.click(screen.getByRole('button', { name: 'Delete all health records' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect((await screen.findByRole('alert')).textContent).toContain('not deleted');
    expect(screen.queryByText('All health records deleted')).toBeNull();
  });
});

describe('Me page', () => {
  it('profile & account page has log out, which signs out and leaves', async () => {
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
      <MemoryRouter initialEntries={['/me/profile']}>
        <ToastProvider>
          <Routes>
            <Route path="/me/profile" element={<Me mode="profile" />} />
            <Route path="/welcome" element={<p>welcome page</p>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(await screen.findByText('welcome page')).toBeTruthy();
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
