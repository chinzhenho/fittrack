import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { getState, replaceState } from '../data/store';
import { emptyState } from '../data/types';
import { AddFood } from './AddFood';
import type * as AiPhotoModule from '../data/aiPhoto';
import type * as AuthModule from '../data/auth';

vi.mock('../data/auth', async (original) => ({
  ...(await original<typeof AuthModule>()),
  useAuth: () => ({ status: 'signedIn', user: { email: 'a@example.com' } }),
}));

vi.mock('../data/aiPhoto', async (original) => ({
  ...(await original<typeof AiPhotoModule>()),
  analyzeFoodPhoto: vi.fn(() =>
    Promise.resolve({
      ok: true,
      remaining: 7,
      result: {
        isFood: true,
        confidence: 'high',
        model: 'gemini-test',
        items: [
          {
            name: 'Nasi lemak（炸鱼）',
            grams: 335,
            matchId: 'sg-F05100089',
            nutrients: { kcal: 600, proteinG: 25, carbsG: 70, fatG: 25 },
          },
          {
            name: '冰美禄',
            grams: 300,
            nutrients: { kcal: 180, proteinG: 5, carbsG: 30, fatG: 4 },
          },
        ],
      },
    }),
  ),
}));

URL.createObjectURL = () => 'blob:test';
URL.revokeObjectURL = () => undefined;

beforeEach(() => {
  replaceState(emptyState);
  localStorage.clear();
});
afterEach(cleanup);

describe('AI photo logging', () => {
  it('asks once for consent, then logs the checked items with edited amounts', async () => {
    render(
      <MemoryRouter initialEntries={['/diary/add?meal=lunch&date=2026-10-13']}>
        <ToastProvider>
          <Routes>
            <Route path="/diary/add" element={<AddFood />} />
            <Route path="/diary" element={<p>diary</p>} />
          </Routes>
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByLabelText('从相册选择')).toBeNull();
    fireEvent.click(screen.getByLabelText('我明白，开始使用 AI 拍照'));
    const photo = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('从相册选择'), { target: { files: [photo] } });

    await screen.findByText('冰美禄');
    // Drink: halve the amount. Nasi lemak stays at the database serving.
    fireEvent.change(screen.getAllByRole('spinbutton')[1]!, { target: { value: '150' } });
    // 693.45 (SG FoodID) + 90 (AI estimate, 180 kcal per 300 g, halved)
    fireEvent.click(screen.getByRole('button', { name: /加入午餐（约 783 kcal）/ }));

    const meals = getState().meals;
    expect(meals).toHaveLength(2);
    expect(meals[0]).toMatchObject({ foodId: 'sg-F05100089', grams: 335, date: '2026-10-13' });
    expect(meals[0]?.nutrients.kcal).toBeCloseTo(693.45, 10);
    expect(meals[1]).toMatchObject({ name: '冰美禄', grams: 150 });
    expect(meals[1]?.nutrients.kcal).toBeCloseTo(90, 10);
    expect(localStorage.getItem('fittrack:aiPhotoConsent')).toBe('1');
  });
});
