import type { Food } from './types';
import { SG_FOODS } from './foodsSg';

// Values per 100 g fetched from USDA FoodData Central, SR Legacy (public domain, CC0)
// on 2026-10-11. Never edit a number by hand: re-fetch and update sourceRef instead.
// Local Malaysian dishes are added only from a verified, licensed source (spec 8.1).
export const SEED_FOODS: Food[] = [
  {
    id: 'usda-168878',
    nameZh: '白饭（熟，长粒米）',
    nameEn: 'Rice, white, long-grain, regular, enriched, cooked',
    aliases: ['白饭', '米饭', 'nasi putih', 'rice'],
    per100g: {
      kcal: 130,
      proteinG: 2.69,
      carbsG: 28.2,
      fatG: 0.28,
      fiberG: 0.4,
      sugarG: 0.05,
      sodiumMg: 1,
    },
    source: 'usda',
    sourceRef: 'USDA FDC 168878',
  },
  {
    id: 'usda-171477',
    nameZh: '鸡胸肉（烤，去皮）',
    nameEn: 'Chicken, broilers or fryers, breast, meat only, cooked, roasted',
    aliases: ['鸡胸肉', '鸡肉', 'ayam', 'dada ayam', 'chicken breast'],
    per100g: { kcal: 165, proteinG: 31, carbsG: 0, fatG: 3.57, fiberG: 0, sugarG: 0, sodiumMg: 74 },
    source: 'usda',
    sourceRef: 'USDA FDC 171477',
  },
  {
    id: 'usda-173424',
    nameZh: '水煮蛋（全蛋）',
    nameEn: 'Egg, whole, cooked, hard-boiled',
    aliases: ['鸡蛋', '鸡蛋', 'telur rebus', 'egg', 'boiled egg'],
    per100g: {
      kcal: 155,
      proteinG: 12.6,
      carbsG: 1.12,
      fatG: 10.6,
      fiberG: 0,
      sugarG: 1.12,
      sodiumMg: 124,
    },
    source: 'usda',
    sourceRef: 'USDA FDC 173424',
  },
  {
    id: 'usda-171287',
    nameZh: '鸡蛋（生，全蛋）',
    nameEn: 'Egg, whole, raw, fresh',
    aliases: ['鸡蛋', '生蛋', 'telur', 'egg'],
    per100g: {
      kcal: 143,
      proteinG: 12.6,
      carbsG: 0.72,
      fatG: 9.51,
      fiberG: 0,
      sugarG: 0.37,
      sodiumMg: 142,
    },
    source: 'usda',
    sourceRef: 'USDA FDC 171287',
  },
  {
    id: 'usda-172475',
    nameZh: '板豆腐（硬豆腐）',
    nameEn: 'Tofu, raw, firm, prepared with calcium sulfate',
    aliases: ['豆腐', 'tauhu', 'tofu'],
    per100g: { kcal: 144, proteinG: 17.3, carbsG: 2.78, fatG: 8.72, fiberG: 2.3, sodiumMg: 14 },
    source: 'usda',
    sourceRef: 'USDA FDC 172475',
  },
  {
    id: 'usda-175168',
    nameZh: '三文鱼（养殖大西洋鲑，烤）',
    nameEn: 'Fish, salmon, Atlantic, farmed, cooked, dry heat',
    aliases: ['三文鱼', '鲑鱼', 'ikan salmon', 'salmon'],
    per100g: {
      kcal: 206,
      proteinG: 22.1,
      carbsG: 0,
      fatG: 12.4,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 61,
    },
    source: 'usda',
    sourceRef: 'USDA FDC 175168',
  },
];

/** Every food shipped with the app: SG FoodID local dishes first, then USDA basics. */
export const BUILT_IN_FOODS: Food[] = [...SG_FOODS, ...SEED_FOODS];
