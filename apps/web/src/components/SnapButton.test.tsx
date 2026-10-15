import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as AuthModule from '../data/auth';
import { takePendingPhoto } from '../data/pendingPhoto';
import { SnapButton } from './SnapButton';

vi.mock('../data/auth', async (original) => ({
  ...(await original<typeof AuthModule>()),
  useAuth: () => ({ status: 'signedIn', user: { email: 'a@example.com' } }),
}));

afterEach(cleanup);

function Where() {
  const l = useLocation();
  return <p>at {l.pathname + l.search}</p>;
}

function setup() {
  render(
    <MemoryRouter initialEntries={['/today']}>
      <Routes>
        <Route
          path="/today"
          element={
            <SnapButton meal="lunch" label="Log lunch" className="">
              Log food
            </SnapButton>
          }
        />
        <Route path="/diary/add" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Log lunch' }));
}

describe('Log food camera screen', () => {
  it('opens the camera screen; without a live camera it offers the system camera', async () => {
    setup(); // jsdom has no camera, so the fallback shows
    expect(screen.getByRole('dialog', { name: 'Snap your food' })).toBeTruthy();
    expect(await screen.findByText(/Can't open the camera here/)).toBeTruthy();
    const sys = screen.getByLabelText(/Use the phone camera/) as HTMLInputElement;
    expect(sys.getAttribute('capture')).toBe('environment');
  });

  it('album photo (bottom left) goes to AI analysis for the chosen meal', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Dinner/ }));
    const album = screen.getByLabelText(/Album/) as HTMLInputElement;
    expect(album.hasAttribute('capture')).toBe(false);
    const photo = new File(['x'], 'dinner.jpg', { type: 'image/jpeg' });
    fireEvent.change(album, { target: { files: [photo] } });
    expect(await screen.findByText('at /diary/add?meal=dinner')).toBeTruthy();
    expect(takePendingPhoto()).toEqual({ file: photo, note: '' });
  });

  it('sends the optional note and quick chips with the photo', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('What is it? (optional)'), {
      target: { value: 'kopi O' },
    });
    fireEvent.click(screen.getByRole('button', { name: '+ No sugar' }));
    fireEvent.click(screen.getByRole('button', { name: '+ No sugar' })); // not added twice
    const photo = new File(['x'], 'kopi.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText(/Album/), { target: { files: [photo] } });
    expect(await screen.findByText('at /diary/add?meal=lunch')).toBeTruthy();
    expect(takePendingPhoto()).toEqual({ file: photo, note: 'kopi O, no sugar' });
  });

  it('manual entry (bottom right) opens the add page without a photo', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Manual/ }));
    expect(await screen.findByText('at /diary/add?meal=lunch')).toBeTruthy();
    expect(takePendingPhoto()).toBeNull();
  });
});
