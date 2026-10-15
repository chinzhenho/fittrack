import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AppRoutes } from './App';
import { ToastProvider } from './components/Toast';
import { getState, replaceState } from './data/store';
import { emptyState } from './data/types';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
const tap = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

beforeEach(() => replaceState(emptyState));
afterEach(cleanup);

describe('app flow', () => {
  it('sends new visitors to the welcome page with sign-up, log-in and guest options', async () => {
    renderAt('/today');
    expect(await screen.findByRole('heading', { name: 'Welcome to EatHealthee' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Start for free/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'I already have an account' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Try it without an account/ })).toBeTruthy();
  });

  it('validates the sign-up form before contacting the server', async () => {
    renderAt('/signup');
    const submit = (await screen.findByRole('button', {
      name: /Sign up and start/,
    })) as HTMLButtonElement;
    change('Email', 'not-an-email');
    change('Create a password', 'short');
    expect(screen.getByText('Enter a valid email.')).toBeTruthy();
    expect(screen.getByText('Use at least 8 characters.')).toBeTruthy();
    expect(screen.getByText('Password: too short')).toBeTruthy();
    expect(submit.disabled).toBe(true);
    change('Email', 'a@example.com');
    change('Create a password', 'longenough1');
    change('Enter it again', 'different1');
    expect(screen.getByText("The passwords don't match.")).toBeTruthy();
    change('Enter it again', 'longenough1');
    expect(submit.disabled).toBe(true); // consent not given yet
    fireEvent.click(screen.getByLabelText(/I agree to store my body/));
    expect(submit.disabled).toBe(false);
  });

  it('requires consent before continuing', () => {
    renderAt('/onboarding');
    const button = screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/I'm 18 or older/));
    fireEvent.click(screen.getByLabelText(/I agree that EatHealthee may use/));
    expect(button.disabled).toBe(false);
  });

  it('completes onboarding with spec case A and logs a food', async () => {
    renderAt('/onboarding');
    fireEvent.click(screen.getByLabelText(/I'm 18 or older/));
    fireEvent.click(screen.getByLabelText(/I agree that EatHealthee may use/));
    next();
    tap(/Lose fat/);
    tap('Male formula');
    change('Date of birth', '1996-01-01');
    change('Height (cm)', '175');
    change('Weight (kg)', '75');
    next();
    tap(/^Light/);
    tap('None of these');
    tap(/0.5% of body weight a week/);
    tap('Skip'); // target weight
    tap('No restrictions');
    expect(screen.getAllByText(/1,920/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }));

    const s = getState();
    expect(s.profile?.goal).toBe('fat_loss');
    expect(s.targets[0]).toMatchObject({
      caloriesKcal: 1920,
      proteinG: 120,
      fatG: 53,
      carbsG: 241,
      reason: 'initial',
    });
    expect(s.weights[0]?.weightKg).toBe(75);
    expect(screen.getByText('Calories today')).toBeTruthy();

    cleanup();
    renderAt('/diary/add?meal=lunch');
    // Manual entry from a nutrition label (tofu, per 100 g), then 150 g logged.
    fireEvent.click(screen.getByRole('button', { name: '+ Enter' }));
    change('Name', 'Firm tofu');
    change('Calories (kcal)', '144');
    change('Protein (g)', '17.3');
    change('Carbs (g)', '2.78');
    change('Fat (g)', '8.72');
    fireEvent.click(screen.getByRole('button', { name: 'Save and choose' }));
    change('Amount (g)', '150');
    fireEvent.click(screen.getByRole('button', { name: 'Add to Lunch' }));
    const meal = getState().meals[0];
    expect(meal).toMatchObject({ meal: 'lunch', grams: 150, name: 'Firm tofu' });
    expect(meal?.nutrients.kcal).toBeCloseTo(216, 10);

    // The food now appears under Recently eaten and can be logged again in one tap.
    cleanup();
    renderAt('/diary/add?meal=dinner');
    fireEvent.click(screen.getByRole('button', { name: /Firm tofu/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to Dinner' }));
    expect(getState().meals.filter((m) => m.name === 'Firm tofu')).toHaveLength(2);
  });

  it('shows the safety refusal for an underweight fat-loss goal', () => {
    renderAt('/onboarding');
    fireEvent.click(screen.getByLabelText(/I'm 18 or older/));
    fireEvent.click(screen.getByLabelText(/I agree that EatHealthee may use/));
    next();
    tap(/Lose fat/);
    tap('Female formula');
    change('Date of birth', '2000-05-05');
    change('Height (cm)', '169.6');
    change('Weight (kg)', '51.5');
    next();
    tap(/^Sedentary/);
    tap('None of these');
    tap(/0.5% of body weight a week/);
    tap('Skip');
    tap('No restrictions');
    expect(screen.getByText('Fat loss is not recommended right now')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Get started' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
