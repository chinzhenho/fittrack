import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useToast } from '../components/Toast';
import { Button, Card, Field, inputClass, PageTitle, Segmented } from '../components/ui';
import { addCustomFood, logFood } from '../data/actions';
import { BUILT_IN_FOODS } from '../data/foods';
import { DISH_LABELS } from '../data/foodsSg';
import { newId, update, useAppState } from '../data/store';
import type { Food, MealType } from '../data/types';
import { localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import type { Prediction } from '../ml/foodRecognizer';
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

  const allFoods = useMemo(() => [...s.customFoods, ...BUILT_IN_FOODS], [s.customFoods]);
  const recent = recentFoodIds(s.meals)
    .map((id) => allFoods.find((f) => f.id === id))
    .filter((f): f is Food => f !== undefined);
  const results = searchFoods(allFoods, query);
  const g = Number(grams);
  const gramsOk = g > 0 && g <= 5000;

  const pick = (f: Food) => {
    setSelected(f);
    setGrams(String(Math.round(f.servings?.[0]?.grams ?? 100)));
  };

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
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {selected.source === 'usda'
                ? `來源：${selected.sourceRef}（已驗證）`
                : selected.source === 'sgfoodid'
                  ? `來源：新加坡保健促進局 ${selected.sourceRef}`
                  : '來源：你自己輸入的包裝標籤'}
            </p>
            {selected.description && (
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                {selected.description}
              </p>
            )}
          </div>
          {selected.servings?.map((sv) => (
            <div key={sv.label}>
              <p className="mb-2 text-sm">
                標準份量：{sv.label}（可食用部分約 {fmtInt(sv.grams)} g）
              </p>
              <div className="flex flex-wrap gap-2">
                {[0.5, 1, 1.5, 2].map((m) => (
                  <Button
                    key={m}
                    variant="secondary"
                    onClick={() => setGrams(String(Math.round(sv.grams * m * 10) / 10))}
                  >
                    {m} 份
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                份量比標準多或少時，請按實際情況調整克數。
              </p>
            </div>
          ))}
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
            pick(food);
          }}
        />
      ) : (
        <>
          <PhotoCard foods={BUILT_IN_FOODS} onPick={pick} />
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
            <FoodList title="最近吃過" foods={recent} onPick={pick} />
          )}
          <FoodList
            title={query ? `搜尋結果（${results.length}）` : '所有食物'}
            foods={results}
            onPick={pick}
          />
          <Card>
            <p className="text-sm">找不到？可以按包裝上的營養標籤自己新增。</p>
            <Button variant="secondary" className="mt-3" onClick={() => setCreating(true)}>
              新增自訂食物
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}

const SOURCE_LABEL: Record<Food['source'], string> = {
  usda: 'USDA',
  sgfoodid: 'SG FoodID',
  user: '自訂',
};

function servingText(f: Food): string {
  const sv = f.servings?.[0];
  if (!sv) return `每 100 g ${fmtInt(f.per100g.kcal)} kcal`;
  return `${sv.label}約 ${fmtInt(nutrientsFor(f.per100g, sv.grams).kcal)} kcal`;
}

type PhotoState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'done'; predictions: Prediction[]; dish: string }
  | { status: 'error'; message: string };

/** Below this top-1 probability the photo is treated as "not sure". */
const CONFIDENT = 0.5;

function PhotoCard({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  const [state, setState] = useState<PhotoState>({ status: 'idle' });
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setState({ status: 'working' });
    try {
      const { recognizeFood } = await import('../ml/foodRecognizer');
      const predictions = await recognizeFood(file);
      setState({ status: 'done', predictions, dish: predictions[0]?.label ?? '' });
    } catch (e) {
      setState({
        status: 'error',
        message: e instanceof Error ? e.message : '辨識失敗，請檢查網絡後再試。',
      });
    }
  };

  const fileButton = (label: string, capture: boolean) => (
    <label
      className={`inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald ${capture ? 'bg-emerald-strong text-white shadow-sm hover:bg-emerald-800 dark:bg-emerald dark:text-slate-950' : 'border border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'}`}
    >
      {label}
      <input
        type="file"
        accept="image/*"
        {...(capture && { capture: 'environment' as const })}
        className="sr-only"
        disabled={state.status === 'working'}
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </label>
  );

  const variants = state.status === 'done' ? foods.filter((f) => f.dishClass === state.dish) : [];
  const top = state.status === 'done' ? state.predictions[0] : undefined;

  return (
    <section className="space-y-3 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 ring-1 ring-emerald-200 dark:from-emerald-950 dark:to-slate-800 dark:ring-emerald/30">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-slate-700"
        >
          📷
        </span>
        <div>
          <h2 className="text-lg font-semibold">
            拍照算熱量
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
              測試版
            </span>
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            拍一張食物照片，自動認出菜式，再選份量就會算進今天的熱量。
          </p>
        </div>
      </div>
      <details className="text-xs text-slate-600 dark:text-slate-300">
        <summary className="cursor-pointer py-1">目前支援 10 種本地菜式・照片不會上傳</summary>
        <p className="mt-1">
          {Object.values(DISH_LABELS).join('、')}
          。照片只在你的裝置上分析，不會上傳或保存。第一次使用需下載約 30 MB。
        </p>
      </details>
      <div className="flex gap-2">
        {fileButton('📸 拍照', true)}
        {fileButton('從相簿選擇', false)}
      </div>

      {preview && (
        <img
          src={preview}
          alt="你選擇的食物照片"
          className="max-h-48 w-full rounded-xl object-cover"
        />
      )}
      {state.status === 'working' && (
        <p className="text-sm" role="status">
          辨識中…（第一次需要下載模型，請稍候）
        </p>
      )}
      {state.status === 'error' && (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'done' && (
        <div className="space-y-3">
          {top && top.probability < CONFIDENT && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              不太確定是哪一道菜。如果下面都不對，請用搜尋或自訂食物。
            </p>
          )}
          <div>
            <p className="mb-2 text-sm">最可能是（點選切換）：</p>
            <div className="flex flex-wrap gap-2">
              {state.predictions.map((p) => (
                <Button
                  key={p.label}
                  variant={p.label === state.dish ? 'primary' : 'secondary'}
                  onClick={() => setState({ ...state, dish: p.label })}
                >
                  {DISH_LABELS[p.label] ?? p.label} {Math.round(p.probability * 100)}%
                </Button>
              ))}
            </div>
          </div>
          <FoodList title="選擇最接近的一種（之後可調整份量）" foods={variants} onPick={onPick} />
        </div>
      )}
    </section>
  );
}

function NutrientLine({ food, grams }: { food: Food; grams: number }) {
  const n = nutrientsFor(food.per100g, grams);
  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl bg-mist p-3 text-center text-sm dark:bg-slate-700">
      <div>
        <p className="text-xs text-slate-600 dark:text-slate-300">熱量</p>
        <p className="font-semibold">{fmtInt(n.kcal)} kcal</p>
      </div>
      <div>
        <p className="text-xs text-slate-600 dark:text-slate-300">蛋白質</p>
        <p className="font-semibold">{fmt1(n.proteinG)} g</p>
      </div>
      <div>
        <p className="text-xs text-slate-600 dark:text-slate-300">碳水</p>
        <p className="font-semibold">{fmt1(n.carbsG)} g</p>
      </div>
      <div>
        <p className="text-xs text-slate-600 dark:text-slate-300">脂肪</p>
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
        <p className="text-sm text-slate-600 dark:text-slate-300">沒有符合的食物。</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {foods.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => onPick(f)}
                className="flex min-h-12 w-full items-center justify-between gap-3 py-2 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{f.nameZh}</span>
                  <span className="block text-xs text-slate-600 dark:text-slate-300">
                    {servingText(f)} · {SOURCE_LABEL[f.source]}
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
        <p className="text-xs text-slate-600 dark:text-slate-300">
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
