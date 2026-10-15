import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useToast } from '../components/Toast';
import {
  BackButton,
  Button,
  Card,
  Check,
  InputRow,
  List,
  PageTitle,
  SelectRow,
} from '../components/ui';
import { addCustomFood, logFood } from '../data/actions';
import { AI_ERROR_TEXT, analyzeFoodPhoto, type AiPhotoError } from '../data/aiPhoto';
import { takePendingPhoto, type PendingPhoto } from '../data/pendingPhoto';
import { makeThumb, saveThumbs } from '../data/photoThumbs';
import { useAuth } from '../data/auth';
import { BUILT_IN_FOODS } from '../data/foods';
import { newId, update, useAppState } from '../data/store';
import type { Food, MealItem, MealType } from '../data/types';
import { formatDay, localToday } from '../lib/dates';
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
  name: 'Enter a food name.',
  kcal: 'Calories per 100 g must be 0 to 900 kcal.',
  macro: 'Protein, carbs and fat per 100 g must each be 0 to 100 g.',
  macroSum: 'Protein, carbs and fat per 100 g cannot add up to more than 100 g.',
  sodium: 'Sodium must be 0 to 40,000 mg.',
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
        name: m.name,
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
        servings: [{ label: 'Last time', grams: m.grams }],
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

  const log = (food: Food, amount: number) => {
    const id = newId();
    update((x) =>
      logFood(x, {
        id,
        date,
        meal,
        food,
        grams: amount,
        now: new Date().toISOString(),
        ...(meal === 'snack' && { label }),
      }),
    );
    return id;
  };

  const add = () => {
    if (!selected || !gramsOk) return;
    log(selected, g);
    toast({ text: `Added to ${where}: ${selected.name}` });
    backToDiary();
  };

  return (
    <div className="space-y-4">
      <BackButton fallback="/diary" />
      <PageTitle sub={`For ${formatDay(date, localToday())}`}>Add food</PageTitle>
      <List>
        <SelectRow
          label="Meal"
          value={meal}
          options={MEAL_TYPES.map((m) => ({ value: m, label: MEAL_LABELS[m] }))}
          onChange={setMeal}
        />
        {meal === 'snack' && (
          <InputRow
            label="Name"
            maxLength={20}
            placeholder="Optional"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        )}
      </List>
      {meal === 'snack' && (
        <div>
          <div className="flex flex-wrap gap-2">
            {['Tea time', 'Supper', 'Drink', 'Snack', 'Fruit'].map((x) => (
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
            <p className="font-semibold">{selected.name}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {selected.source === 'usda'
                ? `Source: ${selected.sourceRef} (verified)`
                : selected.source === 'sgfoodid'
                  ? `Source: Singapore Health Promotion Board ${selected.sourceRef}`
                  : selected.source === 'ai'
                    ? `Source: ${selected.sourceRef}`
                    : 'Source: your own entry from a food label'}
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
                {sv.label}: about {fmtInt(sv.grams)} g
              </p>
              <div className="flex flex-wrap gap-2">
                {[0.5, 1, 1.5, 2].map((m) => (
                  <Button
                    key={m}
                    variant="secondary"
                    onClick={() => setGrams(String(Math.round(sv.grams * m * 10) / 10))}
                  >
                    {m} ×
                  </Button>
                ))}
              </div>
            </div>
          ))}
          <List nested>
            <InputRow
              label="Amount"
              unit="g"
              type="number"
              inputMode="decimal"
              step="1"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              error={gramsOk ? null : 'Must be 1 to 5000 g'}
            />
          </List>
          {gramsOk && <NutrientLine food={selected} grams={g} />}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Back
            </Button>
            <Button className="flex-1" disabled={!gramsOk} onClick={add}>
              Add to {where}
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
            onLog={(items, photo) => {
              const ids = items.map((it) => log(it.food, it.grams));
              // Thumbnail for the food log, kept on this device only.
              void makeThumb(photo)
                .then((t) => saveThumbs(ids, t))
                .catch(() => undefined);
              const kcal = items.reduce(
                (t, it) => t + nutrientsFor(it.food.per100g, it.grams).kcal,
                0,
              );
              toast({
                text: `Added ${items.length} ${items.length === 1 ? 'item' : 'items'} to ${where}, about ${fmtInt(kcal)} kcal`,
              });
              backToDiary();
            }}
          />
          {recent.length > 0 && <FoodList title="Recently eaten" foods={recent} onPick={pick} />}
          <Card className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Enter manually</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                For packaged food, enter the label values. Most accurate.
              </p>
            </div>
            <Button variant="secondary" className="shrink-0" onClick={() => setCreating(true)}>
              + Enter
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
  user: 'Custom',
  ai: 'AI estimate',
};

function servingText(f: Food): string {
  const sv = f.servings?.[0];
  if (!sv) return `${fmtInt(f.per100g.kcal)} kcal per 100 g`;
  return `${sv.label}: about ${fmtInt(nutrientsFor(f.per100g, sv.grams).kcal)} kcal`;
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
  onLog: (items: { food: Food; grams: number }[], photo: File) => void;
}) {
  const signedIn = useAuth().status === 'signedIn';
  const [consent, setConsent] = useState(readConsent);
  const [state, setState] = useState<PhotoState>({ status: 'idle' });
  const [rows, setRows] = useState<Row[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [hint, setHint] = useState('');

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  // A photo taken with the camera button waits here until consent is given.
  const [waiting, setWaiting] = useState<PendingPhoto | null>(() =>
    signedIn ? takePendingPhoto() : null,
  );

  const onFile = async (file: File | undefined, note?: string) => {
    if (!file) return;
    setWaiting(null);
    if (file !== photo) {
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
      if (note === undefined) setHint('');
    }
    setState({ status: 'working' });
    const r = await analyzeFoodPhoto(file, note);
    if (!r.ok) return setState({ status: 'error', error: r.error });
    setRows(r.result.items.map((i) => ({ include: true, grams: String(i.grams) })));
    setState({ status: 'done', result: r.result, remaining: r.remaining });
  };

  useEffect(() => {
    if (waiting && consent) {
      // The note typed in the camera goes with the first analysis and stays editable.
      setHint(waiting.note);
      void onFile(waiting.file, waiting.note || undefined);
    }
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
          <h2 className="text-lg font-semibold">AI photo calories</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            Snap your whole meal. AI spots each food and estimates the portion and calories; you
            check before it is logged.
          </p>
        </div>
      </div>

      {!signedIn ? (
        <div className="rounded-2xl bg-white p-4 text-sm dark:bg-slate-700">
          <p>AI snaps are free but need an account (20 per account per day).</p>
          <div className="mt-3 flex gap-2">
            <Link
              to="/login"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl bg-emerald-strong px-4 font-semibold text-white dark:bg-emerald dark:text-slate-950"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 font-semibold text-emerald-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            >
              Sign up
            </Link>
          </div>
        </div>
      ) : !consent ? (
        <div className="space-y-3 rounded-2xl bg-white p-4 text-sm dark:bg-slate-700">
          <p>
            Photos are shrunk and sent to Google Gemini (or Cloudflare AI as a backup) for analysis.
            Our servers don't keep photos (a small thumbnail stays on this device for your food
            log), but Google's free service may use uploads to improve its products. Please keep
            faces and personal details out of the shot.
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
            {waiting ? 'I understand, analyse my photo' : 'I understand, start using AI snaps'}
          </Check>
        </div>
      ) : (
        <div className="flex gap-2">
          {fileButton('📸 Take photo', true)}
          {fileButton('Choose from album', false)}
        </div>
      )}

      {preview && state.status !== 'idle' && (
        <div className="relative overflow-hidden rounded-2xl">
          <img src={preview} alt="Your food photo" className="max-h-64 w-full object-cover" />
          {state.status === 'working' && (
            <>
              <span className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />
              <span
                aria-hidden="true"
                className="absolute inset-x-5 h-0.5 animate-scan rounded-full bg-emerald-400 shadow-[0_0_14px_3px_rgba(34,197,94,0.75)]"
              />
              <span className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-bold whitespace-nowrap text-white shadow-lg backdrop-blur">
                <span className="size-2 animate-ping rounded-full bg-white" />
                AI is identifying your food…
              </span>
            </>
          )}
        </div>
      )}
      {state.status === 'working' && (
        <p className="text-sm" role="status">
          AI is taking a careful look. About 10–30 seconds…
        </p>
      )}
      {state.status === 'error' && (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {AI_ERROR_TEXT[state.error]}
        </p>
      )}

      {done && photo && (
        <details className="rounded-2xl bg-white/70 p-3 text-sm dark:bg-slate-700/60">
          <summary className="cursor-pointer font-semibold">
            Wrong food or amount? Add a note and re-analyse
          </summary>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
            e.g. "nasi kandar, only half the rice, no curry" or "kopi O, no sugar". Telling the AI
            what the photo can't show makes it more accurate.
          </p>
          <textarea
            value={hint}
            maxLength={120}
            rows={2}
            aria-label="Note for the AI"
            onChange={(e) => setHint(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-600 dark:bg-slate-900"
          />
          <Button
            variant="secondary"
            className="mt-2 w-full"
            disabled={hint.trim() === '' || done.remaining <= 0}
            onClick={() => void onFile(photo, hint)}
          >
            {done.remaining > 0
              ? `Re-analyse (uses 1 snap, ${done.remaining} left today)`
              : 'No snaps left today'}
          </Button>
        </details>
      )}
      {done && !done.result.isFood && (
        <p className="text-sm text-amber-800 dark:text-amber-300" role="alert">
          This doesn't look like food. Please try another photo.
        </p>
      )}
      {done && done.result.isFood && (
        <div className="space-y-3">
          {done.result.confidence === 'low' && (
            <p className="text-sm text-amber-800 dark:text-amber-300">
              The AI isn't sure. Please check the names and amounts.
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
                      aria-label={`Include ${item.name}`}
                      checked={row.include}
                      onChange={(e) => set({ include: e.target.checked })}
                      className="mt-1 size-5 shrink-0 accent-emerald-strong"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {item.matchId
                          ? 'Calories from nutrition database'
                          : 'AI-estimated calories'}
                        {n &&
                          ` · protein ${fmt1(n.proteinG)} g · carbs ${fmt1(n.carbsG)} g · fat ${fmt1(n.fatG)} g`}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">{n ? fmtInt(n.kcal) : '—'} kcal</span>
                  </div>
                  <label className="mt-2 flex items-center gap-2 pl-8 text-sm">
                    <span className="shrink-0 text-slate-600 dark:text-slate-300">Amount</span>
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
            AI estimates can be off, mostly on portion size. {done.remaining} snaps left today.
          </p>
          <Button
            className="w-full"
            disabled={chosen.length === 0}
            onClick={() =>
              photo &&
              onLog(
                chosen.map((x) => ({
                  food: foodForAiItem(x.item, done.result.model),
                  grams: Number(x.row.grams),
                })),
                photo,
              )
            }
          >
            Add to {where} (about {fmtInt(total)} kcal)
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
        <p className="text-xs text-slate-600 dark:text-slate-300">Calories</p>
        <p className="font-semibold">{fmtInt(n.kcal)} kcal</p>
      </div>
      <div>
        <p className="text-xs text-slate-600 dark:text-slate-300">Protein</p>
        <p className="font-semibold">{fmt1(n.proteinG)} g</p>
      </div>
      <div>
        <p className="text-xs text-slate-600 dark:text-slate-300">Carbs</p>
        <p className="font-semibold">{fmt1(n.carbsG)} g</p>
      </div>
      <div>
        <p className="text-xs text-slate-600 dark:text-slate-300">Fat</p>
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
        <p className="text-sm text-slate-600 dark:text-slate-300">No matching foods.</p>
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
                  <span className="block truncate text-sm font-medium">{f.name}</span>
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
  const num = (k: keyof typeof v, label: string, unit: string, err?: string | null) => (
    <InputRow
      label={label}
      unit={unit}
      type="number"
      inputMode="decimal"
      step="0.1"
      placeholder={k === 'sodium' ? 'Optional' : '0'}
      value={v[k]}
      onChange={(e) => setV({ ...v, [k]: e.target.value })}
      error={err}
    />
  );

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">New custom food</h2>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Enter the "per 100 g" values from the nutrition label. Only you can see this food.
        </p>
      </div>
      <List nested>
        <InputRow
          label="Name"
          placeholder="e.g. Gardenia bread"
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
          error={show('name')}
        />
      </List>
      <List nested title="Per 100 g">
        {num('kcal', 'Calories', 'kcal', show('kcal'))}
        {num('protein', 'Protein', 'g')}
        {num('carbs', 'Carbs', 'g')}
        {num('fat', 'Fat', 'g')}
        {num('sodium', 'Sodium', 'mg', show('sodium'))}
      </List>
      {tried && (errors.includes('macro') || errors.includes('macroSum')) && (
        <p className="text-sm text-red-700 dark:text-red-400">
          {ERROR_TEXT[errors.includes('macro') ? 'macro' : 'macroSum']}
        </p>
      )}
      {tried && empty && (
        <p className="text-sm text-red-700 dark:text-red-400">
          Please fill in calories, protein, carbs and fat.
        </p>
      )}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={() => {
            setTried(true);
            if (empty || errors.length > 0) return;
            onSave({
              id: `user-${crypto.randomUUID()}`,
              name: v.name.trim(),
              nameEn: v.name.trim(),
              aliases: [],
              per100g,
              source: 'user',
              sourceRef: 'User entry (food label)',
            });
          }}
        >
          Save and choose
        </Button>
      </div>
    </Card>
  );
}
