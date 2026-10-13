// Shared by the website and the Worker (apps/web/worker): the prompt sent to the vision
// model, the JSON shape it must answer with, and strict checks on that answer.
// The model is asked to name each food and estimate grams. When a food matches one of
// our database entries (SG FoodID lab data or USDA), calories come from the database
// and only the amount is the model's estimate.

import { BUILT_IN_FOODS } from '../data/foods';
import type { Food, Nutrients } from '../data/types';
import { nutrientsFor } from './nutrition';

export interface AiFoodItem {
  name: string;
  grams: number;
  /** Id of a BUILT_IN_FOODS entry when the model says it matches; otherwise absent. */
  matchId?: string;
  /** Model's own estimate for `grams`, used only when there is no database match. */
  nutrients: Nutrients;
}

export interface AiFoodResult {
  isFood: boolean;
  items: AiFoodItem[];
  confidence: 'high' | 'medium' | 'low';
  /** Which model answered, e.g. gemini-3.8-flash. */
  model: string;
}

const CANDIDATES = BUILT_IN_FOODS.map((f) => {
  const sv = f.servings?.[0];
  return `${f.id}: ${f.nameEn}${sv ? ` (1 serving = ${sv.grams} g edible)` : ''}`;
}).join('\n');

export const AI_PROMPT = `You are a nutrition assistant for a Malaysian food diary app.
Look at the photo and list each distinct food or drink that will be eaten.
For every item give:
- name_zh: short name in Simplified Chinese (keep common Malay/English dish names, e.g. "Nasi lemak（炸鸡）")
- grams: estimated edible weight in grams of what is on the plate (exclude bones, shells, inedible parts)
- match_id: the id from the list below ONLY if the item is clearly that same dish; otherwise ""
- kcal, protein_g, carbs_g, fat_g: your estimate for that amount
Use typical Malaysian hawker portions to judge size; use plates, cutlery and hands as scale.
If the photo is not food, set is_food to false and return no items.
Set confidence to "low" when the photo is unclear or the portion is hard to judge.
Known dishes (id: name):
${CANDIDATES}`;

/** Gemini responseSchema (OpenAPI subset). */
export const AI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_food: { type: 'BOOLEAN' },
    confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name_zh: { type: 'STRING' },
          grams: { type: 'NUMBER' },
          match_id: { type: 'STRING' },
          kcal: { type: 'NUMBER' },
          protein_g: { type: 'NUMBER' },
          carbs_g: { type: 'NUMBER' },
          fat_g: { type: 'NUMBER' },
        },
        required: ['name_zh', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g'],
      },
    },
  },
  required: ['is_food', 'confidence', 'items'],
} as const;

const KNOWN_IDS = new Set(BUILT_IN_FOODS.map((f) => f.id));
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN);

/**
 * Validates a model answer. Returns null when it is unusable. Items with impossible
 * numbers are dropped; energy that disagrees with its own macros by more than 35% is
 * replaced by the Atwater value (4/4/9), which is the more conservative reading.
 */
export function normalizeAiResult(raw: unknown, model: string): AiFoodResult | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const isFood = r.is_food === true;
  const confidence =
    r.confidence === 'high' || r.confidence === 'medium' || r.confidence === 'low'
      ? r.confidence
      : 'low';
  const list = Array.isArray(r.items) ? r.items.slice(0, 8) : [];
  const items: AiFoodItem[] = [];
  for (const it of list) {
    if (typeof it !== 'object' || it === null) continue;
    const o = it as Record<string, unknown>;
    const name = typeof o.name_zh === 'string' ? o.name_zh.trim().slice(0, 40) : '';
    const grams = Math.round(num(o.grams));
    const p = num(o.protein_g);
    const c = num(o.carbs_g);
    const f = num(o.fat_g);
    let kcal = num(o.kcal);
    if (!name || !(grams >= 1 && grams <= 3000)) continue;
    if (![p, c, f, kcal].every((v) => v >= 0 && v <= 5000)) continue;
    if (p + c + f > grams) continue; // more macros than food weight is impossible
    const atwater = 4 * p + 4 * c + 9 * f;
    if (atwater > 0 && Math.abs(kcal - atwater) / atwater > 0.35) kcal = atwater;
    const matchId = typeof o.match_id === 'string' && KNOWN_IDS.has(o.match_id) ? o.match_id : '';
    items.push({
      name,
      grams,
      ...(matchId && { matchId }),
      nutrients: { kcal, proteinG: p, carbsG: c, fatG: f },
    });
  }
  if (isFood && items.length === 0) return null;
  return { isFood, items, confidence, model };
}

/**
 * A Food for logging an AI item. Database matches keep the lab values per 100 g;
 * otherwise the model's estimate is turned into per-100 g values.
 */
export function foodForAiItem(item: AiFoodItem, model: string): Food {
  const db = item.matchId ? BUILT_IN_FOODS.find((f) => f.id === item.matchId) : undefined;
  if (db) return db;
  const k = 100 / item.grams;
  const n = item.nutrients;
  return {
    id: `ai-${item.name}`,
    nameZh: item.name,
    nameEn: item.name,
    aliases: [],
    per100g: { kcal: n.kcal * k, proteinG: n.proteinG * k, carbsG: n.carbsG * k, fatG: n.fatG * k },
    source: 'ai',
    sourceRef: `AI 照片估算（${model}）`,
  };
}

/** Nutrients for an item at a (possibly user-adjusted) amount. */
export function aiItemNutrients(item: AiFoodItem, grams: number, model: string): Nutrients {
  return nutrientsFor(foodForAiItem(item, model).per100g, grams);
}
