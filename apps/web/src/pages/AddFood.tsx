import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useToast } from '../components/Toast';
import {
  BackButton,
  Button,
  Card,
  Field,
  inputClass,
  PageTitle,
  Segmented,
} from '../components/ui';
import { addCustomFood, logFood } from '../data/actions';
import { BUILT_IN_FOODS } from '../data/foods';
import { DISH_LABELS } from '../data/foodsSg';
import { newId, update, useAppState } from '../data/store';
import type { Food, MealType } from '../data/types';
import { formatDateZh, localToday } from '../lib/dates';
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
  name: '请输入食物名称。',
  kcal: '每 100 g 热量需介于 0 至 900 kcal。',
  macro: '每 100 g 的蛋白质、碳水、脂肪需介于 0 至 100 g。',
  macroSum: '每 100 g 的蛋白质、碳水、脂肪加起来不能超过 100 g。',
  sodium: '钠需介于 0 至 40,000 mg。',
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
  const [label, setLabel] = useState('');

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
        ...(meal === 'snack' && { label }),
      }),
    );
    const where = meal === 'snack' && label.trim() ? label.trim() : MEAL_LABELS[meal];
    toast({ text: `已加入${where}：${selected.nameZh}` });
    navigate(date === localToday() ? '/diary' : `/diary?date=${date}`);
  };

  return (
    <div className="space-y-4">
      <BackButton fallback="/diary" />
      <PageTitle sub={`加入到${formatDateZh(date, localToday())}`}>加入食物</PageTitle>
      <Segmented
        label="餐次"
        value={meal}
        options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] }))}
        onChange={setMeal}
      />
      {meal === 'snack' && (
        <div>
          <Field label="这是什么？（选填）" hint="例如：下午茶、宵夜、饮料">
            {(p) => (
              <input
                {...p}
                maxLength={20}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <div className="mt-2 flex flex-wrap gap-2">
            {['下午茶', '宵夜', '饮料', '零食', '水果'].map((x) => (
              <Button
                key={x}
                variant={label === x ? 'primary' : 'secondary'}
                className="min-h-9 rounded-full px-3"
                onClick={() => setLabel(label === x ? '' : x)}
              >
                {x}
              </Button>
            ))}
          </div>
        </div>
      )}

      {selected ? (
        <Card className="space-y-4">
          <div>
            <p className="font-semibold">{selected.nameZh}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {selected.source === 'usda'
                ? `来源：${selected.sourceRef}（已验证）`
                : selected.source === 'sgfoodid'
                  ? `来源：新加坡保健促进局 ${selected.sourceRef}`
                  : '来源：你自己输入的包装标签'}
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
                标准份量：{sv.label}（可食用部分约 {fmtInt(sv.grams)} g）
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
                份量比标准多或少时，请按实际情况调整克数。
              </p>
            </div>
          ))}
          <Field label="份量（g）" error={gramsOk ? null : '份量需介于 1 至 5000 g。'}>
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
          <input
            type="search"
            aria-label="搜索食物"
            placeholder="🔍 搜索食物，例如：鸡蛋、tauhu、rice"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${inputClass} mt-0 bg-white dark:bg-slate-800`}
          />
          {!query && recent.length > 0 && (
            <FoodList title="最近吃过" foods={recent} onPick={pick} />
          )}
          {query.trim() !== '' && (
            <>
              <FoodList title={`搜索结果（${results.length}）`} foods={results} onPick={pick} />
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  找不到？可按包装营养标签新增。
                </p>
                <Button variant="ghost" className="shrink-0" onClick={() => setCreating(true)}>
                  ＋ 自订食物
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

const SOURCE_LABEL: Record<Food['source'], string> = {
  usda: 'USDA',
  sgfoodid: 'SG FoodID',
  user: '自订',
};

function servingText(f: Food): string {
  const sv = f.servings?.[0];
  if (!sv) return `每 100 g ${fmtInt(f.per100g.kcal)} kcal`;
  return `${sv.label}约 ${fmtInt(nutrientsFor(f.per100g, sv.grams).kcal)} kcal`;
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
        message: e instanceof Error ? e.message : '辨识失败，请检查网络后再试。',
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
            拍照算热量
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 align-middle text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
              测试版
            </span>
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            拍一张食物照片，自动认出菜式，再选份量就会算进今天的热量。
          </p>
        </div>
      </div>
      <details className="text-xs text-slate-600 dark:text-slate-300">
        <summary className="cursor-pointer py-1">目前支持 10 种本地菜式・照片不会上传</summary>
        <p className="mt-1">
          {Object.values(DISH_LABELS).join('、')}
          。照片只在你的设备上分析，不会上传或保存。第一次使用需下载约 30 MB。
        </p>
      </details>
      <div className="flex gap-2">
        {fileButton('📸 拍照', true)}
        {fileButton('从相簿选择', false)}
      </div>

      {preview && (
        <img
          src={preview}
          alt="你选择的食物照片"
          className="max-h-48 w-full rounded-xl object-cover"
        />
      )}
      {state.status === 'working' && (
        <p className="text-sm" role="status">
          辨识中…（第一次需要下载模型，请稍候）
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
              不太确定是哪一道菜。如果下面都不对，请用搜索或自订食物。
            </p>
          )}
          <div>
            <p className="mb-2 text-sm">最可能是（点击切换）：</p>
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
          <FoodList title="选择最接近的一种（之后可调整份量）" foods={variants} onPick={onPick} />
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
        <p className="text-xs text-slate-600 dark:text-slate-300">热量</p>
        <p className="font-semibold">{fmtInt(n.kcal)} kcal</p>
      </div>
      <div>
        <p className="text-xs text-slate-600 dark:text-slate-300">蛋白质</p>
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
        <p className="text-sm text-slate-600 dark:text-slate-300">没有符合的食物。</p>
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
        <h2 className="font-semibold">新增自订食物</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          请按包装营养标签上“每 100 g”的数值输入。这个食物只有你看得到。
        </p>
      </div>
      <Field label="名称" error={show('name')}>
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
        {num('kcal', '热量（kcal）', show('kcal'))}
        {num('protein', '蛋白质（g）')}
        {num('carbs', '碳水化合物（g）')}
        {num('fat', '脂肪（g）')}
        {num('sodium', '钠（mg，选填）', show('sodium'))}
      </div>
      {tried && (errors.includes('macro') || errors.includes('macroSum')) && (
        <p className="text-sm text-red-700 dark:text-red-400">
          {ERROR_TEXT[errors.includes('macro') ? 'macro' : 'macroSum']}
        </p>
      )}
      {tried && empty && (
        <p className="text-sm text-red-700 dark:text-red-400">请填写热量、蛋白质、碳水和脂肪。</p>
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
              sourceRef: '用户输入（包装标签）',
            });
          }}
        >
          保存并选择
        </Button>
      </div>
    </Card>
  );
}
