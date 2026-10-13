import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { replaceState } from '../data/store';
import { emptyState } from '../data/types';
import { Me } from './Me';
import type * as AuthModule from '../data/auth';
import type * as SyncModule from '../data/sync';

const signOut = vi.fn(() => Promise.resolve());

vi.mock('../data/auth', async (original) => ({
  ...(await original<typeof AuthModule>()),
  useAuth: () => ({ status: 'signedIn', user: { email: 'a@example.com' } }),
}));
vi.mock('../data/sync', async (original) => ({
  ...(await original<typeof SyncModule>()),
  useSync: () => ({ status: 'synced', ready: true }),
  signOut: () => signOut(),
}));

afterEach(cleanup);

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
