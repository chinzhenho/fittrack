import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useToast } from '../components/Toast';
import {
  BackButton,
  Button,
  Card,
  Check,
  Field,
  inputClass,
  PageTitle,
  Segmented,
} from '../components/ui';
import { addCustomFood, logFood } from '../data/actions';
import { AI_ERROR_TEXT, analyzeFoodPhoto, type AiPhotoError } from '../data/aiPhoto';
import { takePendingPhoto } from '../data/pendingPhoto';
import { useAuth } from '../data/auth';
import { BUILT_IN_FOODS } from '../data/foods';
import { newId, update, useAppState } from '../data/store';
import type { Food, MealItem, MealType } from '../data/types';
import { formatDateZh, localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import { aiItemNutrients, foodForAiItem, type AiFoodResult } from '../logic/aiFood';
import {
  MEAL_LABELS,
  MEAL_TYPES,
  nutrientsFor,
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

/**
 * Foods eaten recently, newest first. Built from the logged items themselves so AI
 * estimates can be re-logged too (their per-100 g values come from the snapshot).
 */
function recentFoods(meals: MealItem[], known: Food[], limit = 8): Food[] {
  const seen = new Set<string>();
  const out: Food[] = [];
  for (const m of [...meals].sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
    if (seen.has(m.foodId) || m.grams <= 0) continue;
    seen.add(m.foodId);
    const k = 100 / m.grams;
    out.push(
      known.find((f) => f.id === m.foodId) ?? {
        id: m.foodId,
        nameZh: m.name,
        nameEn: m.name,
        aliases: [],
        per100g: {
          kcal: m.nutrients.kcal * k,
          proteinG: m.nutrients.proteinG * k,
          carbsG: m.nutrients.carbsG * k,
          fatG: m.nutrients.fatG * k,
        },
        source: m.foodId.startsWith('ai-') ? 'ai' : 'user',
        sourceRef: m.sourceRef,
        servings: [{ label: '上次的份量', grams: m.grams }],
      },
    );
    if (out.length >= limit) break;
  }
  return out;
}

export function AddFood() {
  const s = useAppState();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const date = params.get('date') ?? localToday();
  const [meal, setMeal] = useState<MealType>(
    (params.get('meal') as MealType | null) ?? 'breakfast',
  );
  const [selected, setSelected] = useState<Food | null>(null);
  const [grams, setGrams] = useState('100');
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');

  const allFoods = useMemo(() => [...s.customFoods, ...BUILT_IN_FOODS], [s.customFoods]);
  const recent = recentFoods(s.meals, allFoods);
  const g = Number(grams);
  const gramsOk = g > 0 && g <= 5000;
  const where = meal === 'snack' && label.trim() ? label.trim() : MEAL_LABELS[meal];
  const backToDiary = () => navigate(date === localToday() ? '/diary' : `/diary?date=${date}`);

  const pick = (f: Food) => {
    setSelected(f);
    setGrams(String(Math.round(f.servings?.[0]?.grams ?? 100)));
  };

  const log = (food: Food, amount: number) =>
    update((x) =>
      logFood(x, {
        id: newId(),
        date,
        meal,
        food,
        grams: amount,
        now: new Date().toISOString(),
        ...(meal === 'snack' && { label }),
      }),
    );

  const add = () => {
    if (!selected || !gramsOk) return;
    log(selected, g);
    toast({ text: `已加入${where}：${selected.nameZh}` });
    backToDiary();
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
                  : selected.source === 'ai'
                    ? `来源：${selected.sourceRef}`
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
                {sv.label}：约 {fmtInt(sv.grams)} g
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
              加入{where}
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
          <PhotoCard
            where={where}
            onLog={(items) => {
              for (const it of items) log(it.food, it.grams);
              const kcal = items.reduce(
                (t, it) => t + nutrientsFor(it.food.per100g, it.grams).kcal,
                0,
              );
              toast({ text: `已加入${where}：${items.length} 项，约 ${fmtInt(kcal)} kcal` });
              backToDiary();
            }}
          />
          {recent.length > 0 && <FoodList title="最近吃过" foods={recent} onPick={pick} />}
          <Card className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">手动输入</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                包装食品可按营养标签输入，最准确。
              </p>
            </div>
            <Button variant="secondary" className="shrink-0" onClick={() => setCreating(true)}>
              ＋ 输入
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
  user: '自订',
  ai: 'AI 估算',
};

function servingText(f: Food): string {
  const sv = f.servings?.[0];
  if (!sv) return `每 100 g ${fmtInt(f.per100g.kcal)} kcal`;
  return `${sv.label}约 ${fmtInt(nutrientsFor(f.per100g, sv.grams).kcal)} kcal`;
}

const CONSENT_KEY = 'fittrack:aiPhotoConsent';
const readConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) === '1';
  } catch {
    return false;
  }
};

type PhotoState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'done'; result: AiFoodResult; remaining: number }
  | { status: 'error'; error: AiPhotoError };

interface Row {
  include: boolean;
  grams: string;
}

/** Photo -> AI estimate -> user checks items and amounts -> logged to the meal. */
function PhotoCard({
  where,
  onLog,
}: {
  where: string;
  onLog: (items: { food: Food; grams: number }[]) => void;
}) {
  const signedIn = useAuth().status === 'signedIn';
  const [consent, setConsent] = useState(readConsent);
  const [state, setState] = useState<PhotoState>({ status: 'idle' });
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  // A photo taken with the camera button waits here until consent is given.
  const [waiting, setWaiting] = useState<File | null>(() => (signedIn ? takePendingPhoto() : null));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setWaiting(null);
    setPreview(URL.createObjectURL(file));
    setState({ status: 'working' });
    const r = await analyzeFoodPhoto(file);
    if (!r.ok) return setState({ status: 'error', error: r.error });
    setRows(r.result.items.map((i) => ({ include: true, grams: String(i.grams) })));
    setState({ status: 'done', result: r.result, remaining: r.remaining });
  };

  useEffect(() => {
    if (waiting && consent) void onFile(waiting);
    // Runs once a waiting photo can be sent; onFile only depends on stable setters.
  }, [waiting, consent]);

  const fileButton = (text: string, capture: boolean) => (
    <label
      className={`inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold whitespace-nowrap has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-emerald ${capture ? 'bg-emerald-strong text-white shadow-sm hover:bg-emerald-800 dark:bg-emerald dark:text-slate-950' : 'border border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100'} ${state.status === 'working' ? 'pointer-events-none opacity-50' : ''}`}
    >
      {text}
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

  const done = state.status === 'done' ? state : null;
  const chosen = done
    ? done.result.items
        .map((item, i) => ({ item, row: rows[i] }))
        .filter((x): x is { item: (typeof done.result.items)[number]; row: Row } =>
          Boolean(x.row?.include && Number(x.row.grams) > 0 && Number(x.row.grams) <= 5000),
        )
    : [];
  const total = done
    ? chosen.reduce(
        (t, x) => t + aiItemNutrients(x.item, Number(x.row.grams), done.result.model).kcal,
        0,
      )
    : 0;

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
          <h2 className="text-lg font-semibold">AI 拍照算热量</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            拍下整份食物，AI 会认出每样食物并估算份量和热量，你确认后就会记录。
          </p>
        </div>
      </div>

      {!signedIn ? (
        <div className="rounded-2xl bg-white p-4 text-sm dark:bg-slate-700">
          <p>AI 拍照免费，但需要先登录账号（每个账号每天 8 次）。</p>
          <div className="mt-3 flex gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-emerald-strong px-4 font-semibold text-white dark:bg-emerald dark:text-slate-950"
            >
              登录
            </Link>
            <Link
              to="/signup"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 font-semibold text-emerald-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              注册账号
            </Link>
          </div>
        </div>
      ) : !consent ? (
        <div className="space-y-3 rounded-2xl bg-white p-4 text-sm dark:bg-slate-700">
          <p>
            照片会缩小后发送给 Google Gemini（或备用的 Cloudflare AI）分析。我们不保存照片；但
            Google 的免费服务可能会用上传内容来改进它的产品。请不要拍到人脸或个人资料。
          </p>
          <Check
            checked={false}
            onChange={(v) => {
              if (!v) return;
              try {
                localStorage.setItem(CONSENT_KEY, '1');
              } catch {
                // private mode: ask again next time
              }
              setConsent(true);
            }}
          >
            {waiting ? '我明白，开始分析刚才的照片' : '我明白，开始使用 AI 拍照'}
          </Check>
        </div>
      ) : (
        <div className="flex gap-2">
          {fileButton('📸 拍照', true)}
          {fileButton('从相册选择', false)}
        </div>
      )}

      {preview && state.status !== 'idle' && (
        <div className="relative overflow-hidden rounded-2xl">
          <img src={preview} alt="你选择的食物照片" className="max-h-64 w-full object-cover" />
          {state.status === 'working' && (
            <>
              <span className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />
              <span
                aria-hidden="true"
                className="absolute inset-x-5 h-0.5 animate-scan rounded-full bg-emerald-400 shadow-[0_0_14px_3px_rgba(34,197,94,0.75)]"
              />
              <span className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-bold whitespace-nowrap text-white shadow-lg backdrop-blur">
                <span className="size-2 animate-ping rounded-full bg-white" />
                AI 正在辨识食物与营养…
              </span>
            </>
          )}
        </div>
      )}
      {state.status === 'working' && (
        <p className="text-sm" role="status">
          AI 分析中，大约需要 5–15 秒…
        </p>
      )}
      {state.status === 'error' && (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {AI_ERROR_TEXT[state.error]}
        </p>
      )}

      {done && !done.result.isFood && (
        <p className="text-sm text-amber-800 dark:text-amber-300" role="alert">
          这张照片看起来不是食物，请再拍一次。
        </p>
      )}
      {done && done.result.isFood && (
        <div className="space-y-3">
          {done.result.confidence === 'low' && (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              AI 不太确定，请仔细检查名称和份量。
            </p>
          )}
          <ul className="space-y-2">
            {done.result.items.map((item, i) => {
              const row = rows[i] ?? { include: false, grams: '0' };
              const g = Number(row.grams);
              const n = g > 0 ? aiItemNutrients(item, g, done.result.model) : null;
              const set = (r: Partial<Row>) =>
                setRows(rows.map((x, j) => (j === i ? { ...x, ...r } : x)));
              return (
                <li
                  key={`${item.name}-${i}`}
                  className={`rounded-2xl bg-white p-3 dark:bg-slate-700 ${row.include ? '' : 'opacity-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      aria-label={`包括 ${item.name}`}
                      checked={row.include}
                      onChange={(e) => set({ include: e.target.checked })}
                      className="mt-1 size-5 shrink-0 accent-emerald-strong"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {item.matchId ? '热量来自营养数据库' : 'AI 估算的热量'}
                        {n &&
                          ` · 蛋白质 ${fmt1(n.proteinG)} g · 碳水 ${fmt1(n.carbsG)} g · 脂肪 ${fmt1(n.fatG)} g`}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">{n ? fmtInt(n.kcal) : '—'} kcal</span>
                  </div>
                  <label className="mt-2 flex items-center gap-2 pl-8 text-sm">
                    <span className="shrink-0 text-slate-600 dark:text-slate-300">份量</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={row.grams}
                      onChange={(e) => set({ grams: e.target.value })}
                      className="min-h-10 w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-600 dark:bg-slate-900"
                    />
                    <span>g</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            AI 估算可能有误差，份量差别最大。今天还可以用 {done.remaining} 次。
          </p>
          <Button
            className="w-full"
            disabled={chosen.length === 0}
            onClick={() =>
              onLog(
                chosen.map((x) => ({
                  food: foodForAiItem(x.item, done.result.model),
                  grams: Number(x.row.grams),
                })),
              )
            }
          >
            加入{where}（约 {fmtInt(total)} kcal）
          </Button>
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
