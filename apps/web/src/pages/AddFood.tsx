import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useToast } from '../components/Toast';
import { Button, Card, Field, inputClass, PageTitle, Segmented } from '../components/ui';
import { addCustomFood, logFood } from '../data/actions';
import { SEED_FOODS } from '../data/foods';
import { newId, update, useAppState } from '../data/store';
import type { Food, MealType } from '../data/types';
import { localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import {
  MEAL_LABELS,
  MEAL_TYPES,
  nutrientsFor,
  recentFoodIds,
  searchFoods,
  validateCustomFood,
  type CustomFoodError,
} from '../logic/nutrition';

const ERROR_TEXT: Record<CustomFoodError, string> = {
  name: '請輸入食物名稱。',
  kcal: '每 100 g 熱量需介於 0 至 900 kcal。',
  macro: '每 100 g 的蛋白質、碳水、脂肪需介於 0 至 100 g。',
  macroSum: '每 100 g 的蛋白質、碳水、脂肪加起來不能超過 100 g。',
  sodium: '鈉需介於 0 至 40,000 mg。',
};

export function AddFood() {
  const s = useAppState();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const date = params.get('date') ?? localToday();
  const [meal, setMeal] = useState<MealType>(
    (params.get('meal') as MealType | null) ?? 'breakfast',
  );
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [creating, setCreating] = useState(false);

  const allFoods = useMemo(() => [...s.customFoods, ...SEED_FOODS], [s.customFoods]);
  const recent = recentFoodIds(s.meals)
    .map((id) => allFoods.find((f) => f.id === id))
    .filter((f): f is Food => f !== undefined);
  const results = searchFoods(allFoods, query);
  const g = Number(grams);
  const gramsOk = g > 0 && g <= 5000;

  const add = () => {
    if (!selected || !gramsOk) return;
    update((x) =>
      logFood(x, {
        id: newId(),
        date,
        meal,
        food: selected,
        grams: g,
        now: new Date().toISOString(),
      }),
    );
    toast({ text: `已加入${MEAL_LABELS[meal]}：${selected.nameZh}` });
    navigate(date === localToday() ? '/diary' : `/diary?date=${date}`);
  };

  return (
    <div className="space-y-4">
      <PageTitle sub={`加入到 ${date}`}>加入食物</PageTitle>
      <Segmented
        label="餐次"
        value={meal}
        options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] }))}
        onChange={setMeal}
      />

      {selected ? (
        <Card className="space-y-4">
          <div>
            <p className="font-semibold">{selected.nameZh}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selected.source === 'usda'
                ? `來源：${selected.sourceRef}（已驗證）`
                : '來源：你自己輸入的包裝標籤'}
            </p>
          </div>
          <Field label="份量（g）" error={gramsOk ? null : '份量需介於 1 至 5000 g。'}>
            {(p) => (
              <input
                {...p}
                type="number"
                inputMode="decimal"
                step="1"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          {gramsOk && <NutrientLine food={selected} grams={g} />}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setSelected(null)}>
              返回
            </Button>
            <Button className="flex-1" disabled={!gramsOk} onClick={add}>
              加入{MEAL_LABELS[meal]}
            </Button>
          </div>
        </Card>
      ) : creating ? (
        <CustomFoodForm
          onCancel={() => setCreating(false)}
          onSave={(food) => {
            update((x) => addCustomFood(x, food));
            setCreating(false);
            setSelected(food);
          }}
        />
      ) : (
        <>
          <Field label="搜尋食物" hint="可輸入中文、英文或馬來文，例如：雞蛋、tauhu、rice">
            {(p) => (
              <input
                {...p}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={inputClass}
                autoFocus
              />
            )}
          </Field>
          {!query && recent.length > 0 && (
            <FoodList title="最近吃過" foods={recent} onPick={setSelected} />
          )}
          <FoodList
            title={query ? `搜尋結果（${results.length}）` : '所有食物'}
            foods={results}
            onPick={setSelected}
          />
          <Card>
            <p className="text-sm">找不到？可以按包裝上的營養標籤自己新增。</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              馬來西亞本地菜式（如 nasi lemak、roti
              canai）會在取得可靠的營養資料來源後加入，不會使用估計數字。
            </p>
            <Button variant="secondary" className="mt-3" onClick={() => setCreating(true)}>
              新增自訂食物
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}

function NutrientLine({ food, grams }: { food: Food; grams: number }) {
  const n = nutrientsFor(food.per100g, grams);
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl bg-mist p-3 text-center text-sm dark:bg-slate-800">
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">熱量</p>
        <p className="font-semibold">{fmtInt(n.kcal)} kcal</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">蛋白質</p>
        <p className="font-semibold">{fmt1(n.proteinG)} g</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">碳水</p>
        <p className="font-semibold">{fmt1(n.carbsG)} g</p>
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">脂肪</p>
        <p className="font-semibold">{fmt1(n.fatG)} g</p>
      </div>
    </div>
  );
}

function FoodList({
  title,
  foods,
  onPick,
}: {
  title: string;
  foods: Food[];
  onPick: (f: Food) => void;
}) {
  return (
    <Card>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {foods.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">沒有符合的食物。</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {foods.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onPick(f)}
                className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{f.nameZh}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    每 100 g · {fmtInt(f.per100g.kcal)} kcal ·{' '}
                    {f.source === 'usda' ? 'USDA' : '自訂'}
                  </span>
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CustomFoodForm({ onSave, onCancel }: { onSave: (f: Food) => void; onCancel: () => void }) {
  const [v, setV] = useState({ name: '', kcal: '', protein: '', carbs: '', fat: '', sodium: '' });
  const [tried, setTried] = useState(false);
  const per100g = {
    kcal: Number(v.kcal),
    proteinG: Number(v.protein),
    carbsG: Number(v.carbs),
    fatG: Number(v.fat),
    ...(v.sodium.trim() !== '' && { sodiumMg: Number(v.sodium) }),
  };
  const empty = [v.kcal, v.protein, v.carbs, v.fat].some((x) => x.trim() === '');
  const errors = validateCustomFood(v.name, per100g);
  const show = (e: CustomFoodError) => (tried && errors.includes(e) ? ERROR_TEXT[e] : null);
  const num = (k: keyof typeof v, label: string, err?: string | null) => (
    <Field label={label} error={err}>
      {(p) => (
        <input
          {...p}
          type="number"
          inputMode="decimal"
          step="0.1"
          value={v[k]}
          onChange={(e) => setV({ ...v, [k]: e.target.value })}
          className={inputClass}
        />
      )}
    </Field>
  );

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">新增自訂食物</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          請按包裝營養標籤上「每 100 g」的數值輸入。這個食物只有你看得到。
        </p>
      </div>
      <Field label="名稱" error={show('name')}>
        {(p) => (
          <input
            {...p}
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            className={inputClass}
          />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {num('kcal', '熱量（kcal）', show('kcal'))}
        {num('protein', '蛋白質（g）')}
        {num('carbs', '碳水化合物（g）')}
        {num('fat', '脂肪（g）')}
        {num('sodium', '鈉（mg，選填）', show('sodium'))}
      </div>
      {tried && (errors.includes('macro') || errors.includes('macroSum')) && (
        <p className="text-sm text-red-700 dark:text-red-400">
          {ERROR_TEXT[errors.includes('macro') ? 'macro' : 'macroSum']}
        </p>
      )}
      {tried && empty && (
        <p className="text-sm text-red-700 dark:text-red-400">請填寫熱量、蛋白質、碳水和脂肪。</p>
      )}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            setTried(true);
            if (empty || errors.length > 0) return;
            onSave({
              id: `user-${crypto.randomUUID()}`,
              nameZh: v.name.trim(),
              nameEn: v.name.trim(),
              aliases: [],
              per100g,
              source: 'user',
              sourceRef: '用戶輸入（包裝標籤）',
            });
          }}
        >
          儲存並選擇
        </Button>
      </div>
    </Card>
  );
}
