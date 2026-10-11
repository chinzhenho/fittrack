import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CalculatorPage } from './CalculatorPage';

afterEach(cleanup);

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('CalculatorPage', () => {
  it('shows a placeholder, then the target once the form is complete', () => {
    render(<CalculatorPage />);
    expect(screen.getByText(/填寫出生日期、身高和體重後/)).toBeTruthy();

    fireEvent.click(screen.getByLabelText('減脂'));
    fireEvent.click(screen.getByLabelText('男性公式'));
    fill('出生日期', '1990-01-01');
    fill('身高（cm）', '175');
    fill('體重（kg）', '75');

    expect(screen.getByText(/每日熱量目標（估算）/)).toBeTruthy();
    expect(screen.getByText('蛋白質')).toBeTruthy();
  });

  it('explains an out-of-range height next to the field', () => {
    render(<CalculatorPage />);
    fill('出生日期', '1990-01-01');
    fill('身高（cm）', '300');
    fill('體重（kg）', '75');
    expect(screen.getAllByText('身高需介於 120 至 230 cm。').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('身高（cm）').getAttribute('aria-invalid')).toBe('true');
  });
});
