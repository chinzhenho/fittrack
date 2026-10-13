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
            <SnapButton meal="lunch" label="记录午餐" className="">
              记录食物
            </SnapButton>
          }
        />
        <Route path="/diary/add" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: '记录午餐' }));
}

describe('记录食物 camera screen', () => {
  it('opens the camera screen; without a live camera it offers the system camera', async () => {
    setup(); // jsdom has no camera, so the fallback shows
    expect(screen.getByRole('dialog', { name: '拍照记录食物' })).toBeTruthy();
    expect(await screen.findByText(/无法直接打开相机/)).toBeTruthy();
    const sys = screen.getByLabelText(/用系统相机拍照/) as HTMLInputElement;
    expect(sys.getAttribute('capture')).toBe('environment');
  });

  it('album photo (bottom left) goes to AI analysis for the chosen meal', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /晚餐/ }));
    const album = screen.getByLabelText(/相册/) as HTMLInputElement;
    expect(album.hasAttribute('capture')).toBe(false);
    const photo = new File(['x'], 'dinner.jpg', { type: 'image/jpeg' });
    fireEvent.change(album, { target: { files: [photo] } });
    expect(await screen.findByText('at /diary/add?meal=dinner')).toBeTruthy();
    expect(takePendingPhoto()).toBe(photo);
  });

  it('manual entry (bottom right) opens the add page without a photo', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /手动/ }));
    expect(await screen.findByText('at /diary/add?meal=lunch')).toBeTruthy();
    expect(takePendingPhoto()).toBeNull();
  });
});
