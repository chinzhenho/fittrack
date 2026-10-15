import { describe, expect, it } from 'vitest';
import { foodEmoji } from '../components/Icons';

describe('food icons', () => {
  it('picks an icon from the food name, English or Chinese', () => {
    expect(foodEmoji('Coca-Cola (medium)')).toBe('🥤');
    expect(foodEmoji('Kopi O, no sugar')).toBe('☕');
    expect(foodEmoji('Char kway teow')).toBe('🍜');
    expect(foodEmoji('Roti canai (plain)')).toBe('🫓');
    expect(foodEmoji('Sirloin steak')).toBe('🥩'); // not tea
    expect(foodEmoji('Mi goreng')).toBe('🍜');
    expect(foodEmoji('Milk')).toBe('🥛'); // not "mi"
    expect(foodEmoji('虾饺')).toBe('🥟');
    expect(foodEmoji('麦香鸡汉堡')).toBe('🍔');
    expect(foodEmoji('Something new')).toBe('🍽️');
  });
});
