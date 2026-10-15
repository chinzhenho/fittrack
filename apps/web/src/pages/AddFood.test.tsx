import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { getState, replaceState } from '../data/store';
import { emptyState } from '../data/types';
import { AddFood } from './AddFood';
import { analyzeFoodPhoto } from '../data/aiPhoto';
import { setPendingPhoto } from '../data/pendingPhoto';
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
            name: 'Nasi lemak (fried fish)',
            grams: 335,
            matchId: 'sg-F05100089',
            nutrients: { kcal: 600, proteinG: 25, carbsG: 70, fatG: 25 },
          },
          {
            name: 'Iced Milo',
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

function renderAdd(path = '/diary/add?meal=lunch&date=2026-10-13') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <Routes>
          <Route path="/diary/add" element={<AddFood />} />
          <Route path="/diary" element={<p>diary</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('AI photo logging', () => {
  it('analyses a photo from the camera button as soon as consent is given', async () => {
    vi.mocked(analyzeFoodPhoto).mockClear();
    const photo = new File(['x'], 'snap.jpg', { type: 'image/jpeg' });
    setPendingPhoto(photo);
    renderAdd();
    expect(analyzeFoodPhoto).not.toHaveBeenCalled(); // waits for consent
    fireEvent.click(screen.getByLabelText('I understand, analyse my photo'));
    await screen.findByText('Iced Milo');
    expect(analyzeFoodPhoto).toHaveBeenCalledWith(photo, undefined);
  });

  it('asks what the food is for an album photo picked in the camera without a note', async () => {
    vi.mocked(analyzeFoodPhoto).mockClear();
    const photo = new File(['x'], 'album.jpg', { type: 'image/jpeg' });
    setPendingPhoto(photo, '', 'album');
    renderAdd();
    fireEvent.click(screen.getByLabelText('I understand, analyse my photo'));
    fireEvent.change(await screen.findByLabelText(/What is it\?/), {
      target: { value: 'chicken rice' },
    });
    expect(analyzeFoodPhoto).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Analyse photo' }));
    await screen.findByText('Iced Milo');
    expect(analyzeFoodPhoto).toHaveBeenCalledWith(photo, 'chicken rice');
  });

  it('offers Try again with the same photo when the AI is busy', async () => {
    vi.mocked(analyzeFoodPhoto).mockClear();
    vi.mocked(analyzeFoodPhoto).mockResolvedValueOnce({ ok: false, error: 'unavailable' });
    const photo = new File(['x'], 'snap.jpg', { type: 'image/jpeg' });
    setPendingPhoto(photo, 'kopi O');
    renderAdd();
    fireEvent.click(screen.getByLabelText('I understand, analyse my photo'));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await screen.findByText('Iced Milo');
    expect(analyzeFoodPhoto).toHaveBeenCalledTimes(2);
    expect(analyzeFoodPhoto).toHaveBeenLastCalledWith(photo, 'kopi O');
  });

  it('re-analyses the same photo with the user note', async () => {
    vi.mocked(analyzeFoodPhoto).mockClear();
    const photo = new File(['x'], 'snap.jpg', { type: 'image/jpeg' });
    setPendingPhoto(photo);
    renderAdd();
    fireEvent.click(screen.getByLabelText('I understand, analyse my photo'));
    await screen.findByText('Iced Milo');
    fireEvent.click(screen.getByText('Wrong food or amount? Add a note and re-analyse'));
    const again = screen.getByRole('button', { name: /Re-analyse/ }) as HTMLButtonElement;
    expect(again.disabled).toBe(true); // needs a note first
    fireEvent.change(screen.getByLabelText('Note for the AI'), {
      target: { value: 'only half the rice' },
    });
    fireEvent.click(again);
    await screen.findByText('Iced Milo');
    expect(analyzeFoodPhoto).toHaveBeenLastCalledWith(photo, 'only half the rice');
    expect(analyzeFoodPhoto).toHaveBeenCalledTimes(2);
  });

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
    expect(screen.queryByLabelText('Choose from album')).toBeNull();
    fireEvent.click(screen.getByLabelText('I understand, start using AI snaps'));
    const photo = new File(['x'], 'food.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Choose from album'), { target: { files: [photo] } });
    // Album photos wait for an optional note before they are sent.
    expect(vi.mocked(analyzeFoodPhoto).mock.calls.some((c) => c[0] === photo)).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '+ Ate half' }));
    fireEvent.change(screen.getByLabelText(/What is it\?/), {
      target: { value: 'nasi lemak, ate half' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyse photo' }));

    await screen.findByText('Iced Milo');
    expect(analyzeFoodPhoto).toHaveBeenLastCalledWith(photo, 'nasi lemak, ate half');
    // Drink: halve the amount. Nasi lemak stays at the database serving.
    fireEvent.change(screen.getAllByRole('spinbutton')[1]!, { target: { value: '150' } });
    // 693.45 (SG FoodID) + 90 (AI estimate, 180 kcal per 300 g, halved)
    fireEvent.click(screen.getByRole('button', { name: /Add to Lunch \(about 783 kcal\)/ }));

    const meals = getState().meals;
    expect(meals).toHaveLength(2);
    expect(meals[0]).toMatchObject({ foodId: 'sg-F05100089', grams: 335, date: '2026-10-13' });
    expect(meals[0]?.nutrients.kcal).toBeCloseTo(693.45, 10);
    expect(meals[1]).toMatchObject({ name: 'Iced Milo', grams: 150 });
    expect(meals[1]?.nutrients.kcal).toBeCloseTo(90, 10);
    expect(localStorage.getItem('fittrack:aiPhotoConsent')).toBe('1');
  });
});
