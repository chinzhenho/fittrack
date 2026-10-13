import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type * as AuthModule from '../data/auth';
import { takePendingPhoto } from '../data/pendingPhoto';
import { SnapButton } from './SnapButton';

vi.mock('../data/auth', async (original) => ({
  ...(await original<typeof AuthModule>()),
  useAuth: () => ({ status: 'signedIn', user: { email: 'a@example.com' } }),
}));

afterEach(cleanup);

describe('记录食物 sheet', () => {
  it('offers camera, album and manual entry; an album photo goes to AI analysis', async () => {
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
          <Route path="/diary/add" element={<p>add page</p>} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: '记录午餐' }));
    expect(screen.getByText('手动输入 / 最近吃过')).toBeTruthy();
    const camera = screen.getByLabelText(/拍照用相机/) as HTMLInputElement;
    expect(camera.getAttribute('capture')).toBe('environment');
    const album = screen.getByLabelText(/从相册选择/) as HTMLInputElement;
    expect(album.hasAttribute('capture')).toBe(false);

    const photo = new File(['x'], 'lunch.jpg', { type: 'image/jpeg' });
    fireEvent.change(album, { target: { files: [photo] } });
    await screen.findByText('add page');
    expect(takePendingPhoto()).toBe(photo);
  });
});
