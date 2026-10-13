import { describe, expect, it } from 'vitest';
import { aiItemNutrients, foodForAiItem, normalizeAiResult } from './aiFood';

const item = (o: Record<string, unknown>) => ({
  name_zh: '炒饭',
  grams: 300,
  match_id: '',
  kcal: 500,
  protein_g: 15,
  carbs_g: 70,
  fat_g: 18,
  ...o,
});

describe('AI answer validation', () => {
  it('keeps sane items and resolves database matches', () => {
    const r = normalizeAiResult(
      {
        is_food: true,
        confidence: 'high',
        items: [item({}), item({ name_zh: 'Nasi lemak', match_id: 'sg-F05100089', grams: 335 })],
      },
      'gemini-test',
    );
    expect(r?.items).toHaveLength(2);
    expect(r?.items[0]).not.toHaveProperty('matchId');
    expect(r?.items[1]?.matchId).toBe('sg-F05100089');
    // Matched dish uses SG FoodID lab values (207 kcal / 100 g), not the AI's number.
    expect(aiItemNutrients(r!.items[1]!, 335, 'gemini-test').kcal).toBeCloseTo(693.45, 10);
    // Unmatched dish uses the AI estimate, scaled when the user changes the amount.
    expect(aiItemNutrients(r!.items[0]!, 150, 'gemini-test').kcal).toBeCloseTo(250, 10);
    expect(foodForAiItem(r!.items[0]!, 'gemini-test')).toMatchObject({ source: 'ai' });
  });

  it('drops impossible items and unknown database ids', () => {
    const r = normalizeAiResult(
      {
        is_food: true,
        confidence: 'medium',
        items: [
          item({ grams: 0 }),
          item({ grams: 50, protein_g: 40, carbs_g: 40 }), // macros heavier than the food
          item({ kcal: -5 }),
          item({ name_zh: '' }),
          item({ match_id: 'not-a-real-id' }),
        ],
      },
      'm',
    );
    expect(r?.items).toHaveLength(1);
    expect(r?.items[0]).not.toHaveProperty('matchId');
  });

  it('replaces energy that contradicts its own macros with the Atwater value', () => {
    const r = normalizeAiResult(
      { is_food: true, confidence: 'low', items: [item({ kcal: 2000 })] },
      'm',
    );
    expect(r?.items[0]?.nutrients.kcal).toBe(4 * 15 + 4 * 70 + 9 * 18);
  });

  it('handles non-food photos and garbage', () => {
    expect(normalizeAiResult({ is_food: false, confidence: 'high', items: [] }, 'm')).toMatchObject(
      {
        isFood: false,
        items: [],
      },
    );
    expect(normalizeAiResult({ is_food: true, items: [] }, 'm')).toBeNull();
    expect(normalizeAiResult('nope', 'm')).toBeNull();
    expect(normalizeAiResult(null, 'm')).toBeNull();
  });
});
