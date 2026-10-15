import {
  ACTIVITY_FACTORS,
  ageOn,
  EngineInputError,
  RATE_PCT_PER_WEEK,
  SEX_CONSTANT,
  type ActivityLevel,
  type FormulaSex,
  type Goal,
} from '@fittrack/engine';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { IconTile, type IconName } from '../components/Icons';
import { clearThumbs } from '../data/photoThumbs';
import { useToast } from '../components/Toast';
import {
  BackArrow,
  backButtonClass,
  Button,
  Card,
  CardTitle,
  Check,
  Field,
  inputClass,
  Notice,
  PageTitle,
  Segmented,
} from '../components/ui';
import { addTarget, saveProfile, setHideNumbers, updateProfileDetails } from '../data/actions';
import { useAuth } from '../data/auth';
import {
  deleteAccount,
  deleteHealthRecords,
  signOut,
  useSync,
  type SyncStatus,
} from '../data/sync';
import { getState, isPersistent, newId, replaceState, update, useAppState } from '../data/store';
import { emptyState, type DietTag, type Profile, type TargetVersion } from '../data/types';
import { localToday } from '../lib/dates';
import { fmt1, fmtInt } from '../lib/format';
import {
  ACTIVITY_LABELS,
  clampMessage,
  DIET_LABELS,
  fieldMessage,
  GOAL_LABELS,
  rejectMessage,
  SEX_LABELS,
} from '../lib/messages';
import { setTheme, useTheme, type Theme } from '../lib/theme';
import { latestWeight, planFor, targetFromPlan, targetOn } from '../logic/targets';

const RATE_OPTIONS: Record<Goal, number[]> = {
  fat_loss: [0.25, 0.5, 0.75, 1],
  maintain: [0],
  muscle_gain: [0.1, 0.25, 0.5],
  weight_gain: [0.25, 0.5],
};

const SYNC_TEXT: Record<SyncStatus, string> = {
  off: '',
  syncing: 'Syncing…',
  synced: '✓ Your logs are synced to your account',
  offline: "You're offline: logs are saved on this device and sync when you reconnect.",
  error: 'Sync failed. It will retry automatically.',
};

const REASON_LABELS: Record<TargetVersion['reason'], string> = {
  initial: 'Initial',
  profile_change: 'Profile update',
  adaptive: 'Adjusted',
};

const AVATARS = ['🥗', '🍎', '🥑', '🍳', '🍜', '🍛', '🥦', '🍓', '💪', '🏃', '🧘', '😊'];

type Mode = 'home' | 'plan' | 'profile' | 'targets';

type Macros = Pick<TargetVersion, 'caloriesKcal' | 'proteinG' | 'carbsG' | 'fatG'>;

/** Old and new daily targets side by side, before the user confirms a change. */
function TargetCompare({
  before,
  after,
  onConfirm,
  onKeep,
}: {
  before: Macros;
  after: Macros;
  onConfirm: () => void;
  onKeep: () => void;
}) {
  const rows: { k: string; a: number; b: number; u: string }[] = [
    { k: 'Daily calories', a: before.caloriesKcal, b: after.caloriesKcal, u: 'kcal' },
    { k: 'Protein', a: before.proteinG, b: after.proteinG, u: 'g' },
    { k: 'Carbs', a: before.carbsG, b: after.carbsG, u: 'g' },
    { k: 'Fat', a: before.fatG, b: after.fatG, u: 'g' },
  ];
  return (
    <div
      role="region"
      aria-label="Old and new targets"
      className="space-y-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald/40 dark:bg-emerald/10"
    >
      <p className="font-bold">Update your daily target?</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 dark:text-slate-400">
            <th scope="col" className="text-left font-semibold">
              Item
            </th>
            <th scope="col" className="text-right font-semibold">
              Now
            </th>
            <th scope="col" className="text-right font-semibold">
              New
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k} className="border-t border-emerald-100 dark:border-emerald/20">
              <th scope="row" className="py-1.5 text-left font-medium">
                {r.k}
              </th>
              <td className="text-right text-slate-500 dark:text-slate-400">
                {fmtInt(r.a)} {r.u}
              </td>
              <td className="text-right font-bold">
                {fmtInt(r.b)} {r.u}
                {r.b !== r.a && (
                  <span className="ml-1 text-xs font-semibold text-emerald-strong dark:text-emerald">
                    ({r.b > r.a ? '+' : '−'}
                    {fmtInt(Math.abs(r.b - r.a))})
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-600 dark:text-slate-300">
        The new target starts today. Past food logs and target history are kept unchanged.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onKeep}>
          Keep current plan
        </Button>
        <Button onClick={onConfirm}>Confirm update</Button>
      </div>
    </div>
  );
}

function Row({
  to,
  icon,
  tint,
  title,
  sub,
}: {
  to: string;
  icon: IconName;
  tint: string;
  title: string;
  sub?: ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        <IconTile name={icon} tint={tint} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          {sub && (
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{sub}</span>
          )}
        </span>
        <span aria-hidden="true" className="text-slate-400">
          ›
        </span>
      </Link>
    </li>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-1.5 px-4 text-[0.8125rem] text-slate-500 uppercase dark:text-slate-400">
        {title}
      </h2>
      <Card className="p-3">{children}</Card>
    </section>
  );
}

function BackToMe() {
  return (
    <Link to="/me" className={backButtonClass}>
      <BackArrow />
      Me
    </Link>
  );
}

export function Me({ mode = 'home' }: { mode?: Mode }) {
  const s = useAppState();
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const today = useMemo(() => localToday(), []);
  const profile = s.profile;
  const [draft, setDraft] = useState<Profile | null>(profile);
  const [heightText, setHeightText] = useState(String(profile?.heightCm ?? ''));
  const [targetText, setTargetText] = useState(
    profile?.targetWeightKg !== undefined ? String(profile.targetWeightKg) : '',
  );
  const [confirming, setConfirming] = useState(false);
  const [danger, setDanger] = useState<'records' | 'account' | 'device' | null>(null);
  const [deleteWord, setDeleteWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();
  const sync = useSync();
  if (!profile || !draft) return null;
  const signedIn = auth.status === 'signedIn';
  const email = signedIn ? (auth.user.email ?? '') : '';

  const weight = latestWeight(s.weights)?.weightKg ?? 0;
  const target = targetOn(s.targets, today);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setDraft({ ...draft, [k]: v });
  // The profile as it would be saved: typed height and target weight applied, empty
  // optional texts removed (exactOptionalPropertyTypes: no undefined values).
  const candidate: Profile = (() => {
    const rest: Profile = { ...draft };
    delete rest.targetWeightKg;
    delete rest.nickname;
    const nickname = draft.nickname?.trim().slice(0, 20);
    return {
      ...rest,
      heightCm: Number(heightText),
      ...(targetText.trim() !== '' &&
        draft.goal !== 'maintain' && {
          targetWeightKg: Number(targetText),
        }),
      ...(nickname && { nickname }),
    };
  })();
  // Fields managed elsewhere (display toggle, dates) do not count as an edit.
  const comparable = (p: Profile) =>
    JSON.stringify({ ...p, hideNumbers: false, goalStartDate: '', consentedAt: '' });
  const changed = comparable(candidate) !== comparable(profile);
  // Name, avatar and target weight do not change the calorie target.
  const forTarget = (p: Profile) => {
    const rest: Profile = { ...p };
    delete rest.nickname;
    delete rest.avatar;
    delete rest.targetWeightKg;
    delete rest.waterActivity;
    return comparable(rest);
  };
  const targetChanges = forTarget(candidate) !== forTarget(profile);

  let preview: ReturnType<typeof planFor> | null = null;
  let invalid: string | null = null;
  try {
    preview = planFor(candidate, weight, today);
  } catch (e) {
    if (e instanceof EngineInputError) invalid = e.field;
    else throw e;
  }

  const save = () => {
    if (!preview?.ok) return;
    if (!targetChanges) {
      update((x) =>
        updateProfileDetails(x, { ...candidate, goalStartDate: profile.goalStartDate }),
      );
      toast({ text: 'Saved' });
      navigate('/me');
      return;
    }
    const next: Profile = {
      ...candidate,
      goalStartDate:
        draft.goal !== profile.goal || draft.ratePctPerWeek !== profile.ratePctPerWeek
          ? today
          : profile.goalStartDate,
    };
    const now = new Date().toISOString();
    update((x) =>
      saveProfile(
        x,
        next,
        targetFromPlan(
          preview.plan,
          { id: newId(), effectiveFrom: today, createdAt: now, reason: 'profile_change' },
          weight,
        ),
      ),
    );
    toast({ text: `Updated. Your new daily target is ${fmtInt(preview.plan.caloriesKcal)} kcal` });
    navigate('/me');
  };

  const keepPlan = () => {
    setDraft(profile);
    setHeightText(String(profile.heightCm));
    setTargetText(profile.targetWeightKg !== undefined ? String(profile.targetWeightKg) : '');
    setConfirming(false);
    toast({ text: 'Kept your current plan. Nothing changed.' });
    navigate('/me');
  };

  const saveBar = (label: string) => (
    <>
      {changed && preview && !preview.ok && (
        <Notice tone="warn" title={rejectMessage(preview.reason).title}>
          {rejectMessage(preview.reason).body}
        </Notice>
      )}
      {confirming && changed && targetChanges && preview?.ok && target ? (
        <TargetCompare
          before={target}
          after={{ caloriesKcal: preview.plan.caloriesKcal, ...preview.plan.macros }}
          onConfirm={save}
          onKeep={keepPlan}
        />
      ) : (
        <Button
          className="min-h-12 w-full text-base"
          disabled={!changed || !preview?.ok}
          onClick={() => (targetChanges && target ? setConfirming(true) : save())}
        >
          {changed && targetChanges && target ? 'Preview new daily target' : label}
        </Button>
      )}
    </>
  );

  if (mode === 'profile') {
    const avatarNow = draft.avatar ?? (signedIn ? (email[0] ?? '🙂').toUpperCase() : '🙂');
    return (
      <div className="space-y-4">
        <BackToMe />
        <PageTitle sub="Nickname and avatar are just for display; body details set your daily target.">
          Profile
        </PageTitle>

        <Card className="space-y-5">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-emerald-500 bg-emerald-50 text-4xl font-bold text-emerald-800 dark:bg-emerald/15 dark:text-emerald-100"
            >
              {avatarNow}
            </span>
            <div className="min-w-0 flex-1">
              <Field label="Nickname (optional)">
                {(p) => (
                  <input
                    {...p}
                    maxLength={20}
                    placeholder="e.g. Alex"
                    value={draft.nickname ?? ''}
                    onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
                    className={inputClass}
                  />
                )}
              </Field>
            </div>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Avatar</legend>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-label={`Avatar ${a}`}
                  aria-pressed={draft.avatar === a}
                  onClick={() => setDraft({ ...draft, avatar: a })}
                  className={`flex aspect-square items-center justify-center rounded-2xl text-2xl transition ${draft.avatar === a ? 'bg-emerald-100 ring-2 ring-emerald-strong dark:bg-emerald/20 dark:ring-emerald' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card className="space-y-5">
          <CardTitle>Body details</CardTitle>
          <Segmented
            label="Formula"
            hint="The Mifflin–St Jeor formula has male and female versions; neutral is the average"
            value={draft.formulaSex}
            options={(Object.keys(SEX_LABELS) as FormulaSex[]).map((x) => ({
              value: x,
              label: SEX_LABELS[x],
            }))}
            onChange={(v) => set('formulaSex', v)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Date of birth"
              error={invalid === 'birthDate' ? fieldMessage('birthDate') : null}
            >
              {(p) => (
                <input
                  {...p}
                  type="date"
                  max={today}
                  value={draft.birthDate}
                  onChange={(e) => set('birthDate', e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
            <Field
              label="Height (cm)"
              error={invalid === 'heightCm' ? fieldMessage('heightCm') : null}
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={heightText}
                  onChange={(e) => setHeightText(e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
          </div>
          {draft.goal !== 'maintain' && (
            <Field
              label="Target weight (kg, optional)"
              hint="Only used to show progress; doesn't change daily calories"
              error={
                invalid === 'targetWeightKg'
                  ? draft.goal === 'fat_loss'
                    ? 'Target weight must be below your current weight.'
                    : 'Target weight must be above your current weight.'
                  : null
              }
            >
              {(p) => (
                <input
                  {...p}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={targetText}
                  onChange={(e) => setTargetText(e.target.value)}
                  className={inputClass}
                />
              )}
            </Field>
          )}
          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-slate-700">
            <span>
              Current weight{' '}
              <strong>{profile.hideNumbers ? 'hidden' : `${fmt1(weight)} kg`}</strong>
            </span>
            <Link
              to="/progress#weights"
              className="font-semibold text-emerald-strong dark:text-emerald"
            >
              Log weight ›
            </Link>
          </div>
          {saveBar('Save profile')}
        </Card>
      </div>
    );
  }

  if (mode === 'plan') {
    return (
      <div className="space-y-4">
        <BackToMe />
        <PageTitle sub="You'll see old and new targets side by side before anything changes.">
          Goal & lifestyle
        </PageTitle>
        <Card className="space-y-5">
          <CardTitle>Goal</CardTitle>
          <Segmented
            label="Goal"
            value={draft.goal}
            options={(Object.keys(GOAL_LABELS) as Goal[]).map((g) => ({
              value: g,
              label: GOAL_LABELS[g],
            }))}
            onChange={(g) =>
              setDraft({ ...draft, goal: g, ratePctPerWeek: RATE_PCT_PER_WEEK[g].default })
            }
          />
          {draft.goal !== 'maintain' && (
            <Segmented
              label="Weekly weight change (% of body weight)"
              value={String(draft.ratePctPerWeek)}
              options={RATE_OPTIONS[draft.goal].map((r) => ({ value: String(r), label: `${r}%` }))}
              onChange={(v) => set('ratePctPerWeek', Number(v))}
            />
          )}
        </Card>

        <Card className="space-y-5">
          <CardTitle>Lifestyle & health</CardTitle>
          <Segmented
            label="Daily activity level"
            value={draft.activityLevel}
            options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => ({
              value: a,
              label: ACTIVITY_LABELS[a].name,
              sub: ACTIVITY_LABELS[a].hint,
            }))}
            onChange={(v) => set('activityLevel', v)}
          />
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Health</legend>
            <Check
              checked={draft.screening.pregnantOrLactating}
              onChange={(v) => set('screening', { ...draft.screening, pregnantOrLactating: v })}
            >
              Pregnant or breastfeeding
            </Check>
            <Check
              checked={draft.screening.eatingDisorderHistory}
              onChange={(v) => set('screening', { ...draft.screening, eatingDisorderHistory: v })}
            >
              Diagnosed with, or being treated for, an eating disorder
            </Check>
            <Check
              checked={draft.screening.kidneyDisease}
              onChange={(v) => set('screening', { ...draft.screening, kidneyDisease: v })}
            >
              Kidney disease
            </Check>
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Diet preferences</legend>
            {(Object.keys(DIET_LABELS) as DietTag[]).map((t) => (
              <Check
                key={t}
                checked={draft.dietTags.includes(t)}
                onChange={(on) =>
                  set(
                    'dietTags',
                    on ? [...draft.dietTags, t] : draft.dietTags.filter((x) => x !== t),
                  )
                }
              >
                {DIET_LABELS[t]}
              </Check>
            ))}
          </fieldset>

          {saveBar('Save')}
        </Card>
      </div>
    );
  }

  if (mode === 'targets') {
    return (
      <TargetsPage
        profile={profile}
        target={target}
        targets={s.targets}
        weight={weight}
        today={today}
      />
    );
  }

  const initial = profile.avatar ?? (signedIn ? (email[0] ?? '?').toUpperCase() : '🙂');
  const hide = profile.hideNumbers;

  const exportData = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eathealthee-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ text: 'Backup download started' });
  };

  const run = async (job: () => Promise<string | null>, onDone: () => void) => {
    setBusy(true);
    setError(null);
    const err = await job();
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    onDone();
  };

  const closeDanger = () => {
    setDanger(null);
    setDeleteWord('');
    setError(null);
  };

  return (
    <div className="space-y-5">
      <PageTitle sub="Manage your health plan and app settings.">Me</PageTitle>

      <section className="overflow-hidden rounded-[22px] bg-white dark:bg-slate-800">
        <Link
          to="/me/profile"
          aria-label="Edit profile"
          className="flex items-center gap-4 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-slate-100 to-slate-200 text-3xl font-semibold text-slate-600 dark:from-slate-600 dark:to-slate-700 dark:text-slate-100"
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.375rem] leading-tight font-semibold">
              {profile.nickname ?? (signedIn ? 'No nickname yet' : 'Guest')}
            </span>
            <span className="block truncate text-sm text-slate-500 dark:text-slate-400">
              {signedIn ? email : 'Not logged in'}
            </span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              {GOAL_LABELS[profile.goal]}
              {target && !hide && ` · ${fmtInt(target.caloriesKcal)} kcal a day`}
            </span>
          </span>
          <span aria-hidden="true" className="text-xl text-slate-300 dark:text-slate-500">
            ›
          </span>
        </Link>
        {signedIn && SYNC_TEXT[sync.status] && (
          <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {SYNC_TEXT[sync.status]}
          </p>
        )}
        {!signedIn && (
          <div className="flex gap-2 border-t border-slate-100 p-4 dark:border-slate-700">
            <Link
              to="/signup"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-emerald-strong px-4 text-[0.9375rem] font-semibold text-white dark:bg-emerald dark:text-black"
            >
              Sign up
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-[#767680]/[0.12] px-4 text-[0.9375rem] font-semibold text-emerald-strong dark:bg-[#767680]/[0.24] dark:text-emerald"
            >
              Log in
            </Link>
          </div>
        )}
      </section>

      <Group title="My health plan">
        <ul>
          <Row
            to="/me/plan"
            icon="target"
            tint="bg-[#ff9500]"
            title="Goal & lifestyle"
            sub={`${GOAL_LABELS[profile.goal]}${profile.goal !== 'maintain' ? ` · ${profile.ratePctPerWeek}% a week` : ''} · ${ACTIVITY_LABELS[profile.activityLevel].name}`}
          />
          <Row
            to="/me/profile"
            icon="person"
            tint="bg-[#007aff]"
            title="Body details"
            sub={`Height ${profile.heightCm} cm · born ${profile.birthDate}${profile.targetWeightKg !== undefined && !hide ? ` · target ${fmt1(profile.targetWeightKg)} kg` : ''}`}
          />
          <Row
            to="/me/targets"
            icon="fork"
            tint="bg-emerald-500"
            title="Daily nutrition targets"
            sub={
              target && !hide
                ? `${fmtInt(target.caloriesKcal)} kcal · protein ${target.proteinG} g · how it's worked out`
                : "How it's worked out, and history"
            }
          />
          <Row
            to="/progress#weights"
            icon="scale"
            tint="bg-[#5856d6]"
            title="Weight log"
            sub={
              hide
                ? 'Add, edit or delete weigh-ins'
                : weight
                  ? `Latest ${fmt1(weight)} kg`
                  : 'No weigh-ins yet'
            }
          />
        </ul>
      </Group>

      <Group title="Appearance">
        <div className="space-y-4 p-2">
          <Segmented<Theme>
            label="Theme"
            value={theme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'system', label: 'Match phone' },
            ]}
            onChange={setTheme}
          />
          <div>
            <Check checked={hide} onChange={(v) => update((x) => setHideNumbers(x, v))}>
              Hide calorie and weight numbers
            </Check>
            <p className="mt-1 pl-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              When on, Today, Diary and Progress show habits and logging instead of calorie and
              weight numbers. Useful if numbers affect your mood, or when others can see your
              screen. This is screen privacy only: your data is still saved and synced, and exports
              include the numbers.
            </p>
          </div>
          <p className="rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
            Units: metric (kg, cm, kcal). Only metric is supported for now.
          </p>
        </div>
      </Group>

      <Group title="Reminders & notifications">
        <div className="space-y-2 p-2 text-sm leading-relaxed">
          <p>
            EatHealthee does <strong>not</strong> have push notifications or reminders yet, and
            never sends anything in the background.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            To build the habit, set your phone's alarm or reminders app for breakfast, lunch and
            dinner.
          </p>
        </div>
      </Group>

      <Group title="Privacy & data">
        <div className="space-y-4 p-2 text-sm">
          <p className="text-slate-600 dark:text-slate-300">
            {signedIn
              ? 'Your data is stored in your account (Supabase, servers in Singapore), and each account can only access its own data. This device keeps a copy for offline use.'
              : isPersistent()
                ? "Your data is only stored in this device's browser. Clearing browser data or changing phones will lose it, so sign up or export a backup regularly."
                : "This browser can't save data right now (maybe private browsing)."}
          </p>

          <div className="rounded-2xl bg-slate-50 p-3 dark:bg-slate-700/60">
            <p className="font-semibold">Export my data</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Downloads a JSON file with your profile, plan, target history, food and weight logs.
              It is saved only on your device and contains health data, so keep it safe.
            </p>
            <Button variant="secondary" className="mt-2" onClick={exportData}>
              Export backup (JSON)
            </Button>
          </div>

          <div className="space-y-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-600">
            <p className="font-semibold">Delete data</p>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li>
                <strong>Delete one entry:</strong> tap ✕ in the Diary or in Progress → Weight log.
                You can undo it.
              </li>
              <li>
                <strong>Delete all health records:</strong> clears all food, weight and habit logs,
                keeping your {signedIn ? 'account, ' : ''}profile and plan.
              </li>
              {signedIn && (
                <li>
                  <strong>Delete account:</strong> under "Account & security" below; permanently
                  deletes your login email and all data.
                </li>
              )}
            </ul>
            {danger === 'records' ? (
              <Notice tone="warn" title="Delete all health records?">
                All food, weight, water and habit logs will be permanently deleted from{' '}
                {signedIn ? 'the cloud and this device' : 'this device'}. This can't be undone. Your
                profile, plan and target history are kept. Export a backup first.
                {error && (
                  <p role="alert" className="mt-2 font-semibold text-red-700 dark:text-red-400">
                    {error}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() =>
                      void run(deleteHealthRecords, () => {
                        closeDanger();
                        toast({ text: 'All health records deleted' });
                      })
                    }
                  >
                    {busy ? 'Deleting…' : 'Delete'}
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={closeDanger}>
                    Cancel
                  </Button>
                </div>
              </Notice>
            ) : (
              <Button
                variant="danger"
                className="w-full"
                onClick={() => {
                  closeDanger();
                  setDanger('records');
                }}
              >
                Delete all health records
              </Button>
            )}
            {!signedIn &&
              (danger === 'device' ? (
                <Notice tone="warn" title="Delete all data on this device?">
                  Your profile, plan and all logs will be permanently deleted. This can't be undone,
                  and you'll start again from the welcome page.
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="danger"
                      onClick={() => {
                        replaceState(emptyState);
                        void clearThumbs();
                        navigate('/welcome', { replace: true });
                      }}
                    >
                      Delete
                    </Button>
                    <Button variant="secondary" onClick={closeDanger}>
                      Cancel
                    </Button>
                  </div>
                </Notice>
              ) : (
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => {
                    closeDanger();
                    setDanger('device');
                  }}
                >
                  Delete all data on this device
                </Button>
              ))}
          </div>
        </div>
      </Group>

      {signedIn && (
        <Group title="Account & security">
          <ul>
            <li className="flex min-h-14 items-center gap-3 px-2">
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg dark:bg-slate-700"
              >
                ✉️
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">Login email</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {email}
                </span>
              </span>
            </li>
            <Row to="/update-password" icon="key" tint="bg-slate-400" title="Change password" />
          </ul>
          <div className="mt-2 border-t border-slate-100 px-2 pt-3 dark:border-slate-700">
            {danger === 'account' ? (
              <Notice tone="warn" title="Permanently delete your account?">
                Your login email, password, all food and weight logs in the cloud, plan and settings
                will be permanently deleted and can't be recovered. Export a backup above first.
                <Field label="Type DELETE to confirm">
                  {(p) => (
                    <input
                      {...p}
                      value={deleteWord}
                      onChange={(e) => setDeleteWord(e.target.value)}
                      className={inputClass}
                      autoComplete="off"
                    />
                  )}
                </Field>
                {error && (
                  <p role="alert" className="mt-2 font-semibold text-red-700 dark:text-red-400">
                    {error}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="danger"
                    disabled={busy || deleteWord.trim() !== 'DELETE'}
                    onClick={() =>
                      void run(deleteAccount, () => navigate('/welcome', { replace: true }))
                    }
                  >
                    {busy ? 'Deleting…' : 'Delete account forever'}
                  </Button>
                  <Button variant="secondary" disabled={busy} onClick={closeDanger}>
                    Cancel
                  </Button>
                </div>
              </Notice>
            ) : (
              <button
                type="button"
                className="min-h-11 w-full rounded-2xl text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                onClick={() => {
                  closeDanger();
                  setDanger('account');
                }}
              >
                Delete account
              </button>
            )}
          </div>
        </Group>
      )}

      <Group title="Help & info">
        <ul>
          <Row to="/how-we-calculate" icon="calc" tint="bg-[#ff9500]" title="How we calculate" />
          <Row to="/help/faq" icon="question" tint="bg-[#007aff]" title="FAQ" />
          <Row to="/legal/disclaimer" icon="heart" tint="bg-[#ff2d55]" title="Health disclaimer" />
          <Row to="/legal/privacy" icon="lock" tint="bg-slate-400" title="Privacy policy" />
          <Row to="/legal/credits" icon="book" tint="bg-[#af52de]" title="Data sources" />
        </ul>
        <p className="mt-2 border-t border-slate-100 px-2 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          App version {__APP_VERSION__} ({__BUILD_DATE__})
        </p>
      </Group>

      {signedIn && (
        <div className="pb-4">
          <Button
            variant="danger"
            className="w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await signOut();
              navigate('/welcome', { replace: true });
            }}
          >
            {busy ? 'Logging out…' : 'Log out'}
          </Button>
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            Your logs are synced before logging out, so you can get them back on any device.
          </p>
        </div>
      )}
    </div>
  );
}

function TargetsPage({
  profile,
  target,
  targets,
  weight,
  today,
}: {
  profile: Profile;
  target: TargetVersion | null;
  targets: TargetVersion[];
  weight: number;
  today: string;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const [recalc, setRecalc] = useState(false);
  if (!target) {
    return (
      <div className="space-y-4">
        <BackToMe />
        <PageTitle>Daily nutrition targets</PageTitle>
        <Notice>No daily target yet. Please finish setting up your profile first.</Notice>
      </div>
    );
  }

  const age = ageOn(profile.birthDate, target.effectiveFrom);
  const bmrCalc =
    10 * target.weightKg + 6.25 * profile.heightCm - 5 * age + SEX_CONSTANT[profile.formulaSex];
  // Show the worked formula only if today's profile still reproduces the stored value.
  const formulaMatches = Math.abs(bmrCalc - target.bmrKcal) < 1;
  const factor = ACTIVITY_FACTORS[profile.activityLevel];
  const adjust = target.caloriesKcal - target.tdeeKcal;
  const kcalOf = { p: target.proteinG * 4, c: target.carbsG * 4, f: target.fatG * 9 };
  const total = kcalOf.p + kcalOf.c + kcalOf.f || 1;
  let fresh: ReturnType<typeof planFor> | null = null;
  try {
    if (weight > 0) fresh = planFor(profile, weight, today);
  } catch {
    fresh = null;
  }
  const hide = profile.hideNumbers;

  return (
    <div className="space-y-4">
      <BackToMe />
      <PageTitle sub="How your daily target is worked out.">Daily nutrition targets</PageTitle>

      {hide && (
        <Notice>
          You've chosen to hide numbers. This page still shows them because it explains the
          calculation; go back if you'd rather not see them.
        </Notice>
      )}

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: 'Daily calories', v: `${fmtInt(target.caloriesKcal)}`, u: 'kcal' },
            {
              k: 'Protein',
              v: `${target.proteinG}`,
              u: `g · ${Math.round((kcalOf.p / total) * 100)}%`,
            },
            {
              k: 'Carbs',
              v: `${target.carbsG}`,
              u: `g · ${Math.round((kcalOf.c / total) * 100)}%`,
            },
            { k: 'Fat', v: `${target.fatG}`, u: `g · ${Math.round((kcalOf.f / total) * 100)}%` },
          ].map((x) => (
            <div key={x.k} className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-700/60">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{x.k}</p>
              <p className="text-xl font-black">{x.v}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{x.u}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          In effect from {target.effectiveFrom} ({REASON_LABELS[target.reason]}), based on a weight
          of {fmt1(target.weightKg)} kg at the time.
        </p>
      </Card>

      <Card className="space-y-4 text-sm leading-relaxed">
        <CardTitle>Step by step</CardTitle>
        <div>
          <p className="font-bold">① Basal metabolic rate (BMR): {fmtInt(target.bmrKcal)} kcal</p>
          <p className="text-slate-600 dark:text-slate-300">
            What your body burns in a day at complete rest, using the Mifflin–St Jeor equation:
          </p>
          <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs dark:bg-slate-700/60">
            10 × weight + 6.25 × height − 5 × age{' '}
            {profile.formulaSex === 'male'
              ? '+ 5'
              : profile.formulaSex === 'female'
                ? '− 161'
                : '− 78'}
            {formulaMatches && (
              <>
                <br />= 10 × {fmt1(target.weightKg)} + 6.25 × {profile.heightCm} − 5 × {age}{' '}
                {SEX_CONSTANT[profile.formulaSex] >= 0 ? '+' : '−'}{' '}
                {Math.abs(SEX_CONSTANT[profile.formulaSex])} ≈ {fmtInt(target.bmrKcal)}
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Formula: {SEX_LABELS[profile.formulaSex]}
            {profile.formulaSex === 'neutral' && ' (average of the male and female constants)'}
          </p>
        </div>
        <div>
          <p className="font-bold">
            ② Total daily energy expenditure (TDEE): {fmtInt(target.tdeeKcal)} kcal
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            {target.reason === 'adaptive'
              ? 'Adjusted from your real intake and weight trend, so it fits you better than the formula alone.'
              : `BMR × activity factor ${factor} (${ACTIVITY_LABELS[profile.activityLevel].name}).`}
          </p>
        </div>
        <div>
          <p className="font-bold">
            ③ Goal adjustment:{' '}
            {adjust === 0 ? 'none' : `${adjust > 0 ? '+' : '−'}${fmtInt(Math.abs(adjust))} kcal`}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            {GOAL_LABELS[profile.goal]}
            {profile.goal !== 'maintain' &&
              `, about ${profile.ratePctPerWeek}% of body weight a week`}
            .{' '}
            {profile.goal === 'fat_loss'
              ? 'The deficit is at most 25% of TDEE.'
              : profile.goal === 'maintain'
                ? ''
                : 'The surplus is at most 500 kcal a day.'}
          </p>
        </div>
        <div>
          <p className="font-bold">④ Safety floor: {fmtInt(target.calorieFloorKcal)} kcal</p>
          <p className="text-slate-600 dark:text-slate-300">
            Your daily target never goes below your BMR, or below 1,200 (female) / 1,500 (male,
            neutral) kcal.
          </p>
        </div>
        {target.clamps.length > 0 && (
          <Notice title="Adjustments made in this calculation">
            <ul className="list-disc space-y-1 pl-5">
              {target.clamps.map((c) => (
                <li key={c}>
                  {clampMessage(c as Parameters<typeof clampMessage>[0], target.calorieFloorKcal)}
                </li>
              ))}
            </ul>
          </Notice>
        )}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          The formula is only a starting point; everyone burns a little differently. Once you have
          enough logs, Progress → Target suggestion fine-tunes it from your real data.
          <Link
            to="/how-we-calculate"
            className="ml-1 font-semibold text-emerald-strong dark:text-emerald"
          >
            Full method ›
          </Link>
        </p>
      </Card>

      <Card className="space-y-3">
        <CardTitle>Recalculate with your latest weight</CardTitle>
        {!fresh ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Log a weigh-in first to recalculate.
          </p>
        ) : !fresh.ok ? (
          <Notice tone="warn" title={rejectMessage(fresh.reason).title}>
            {rejectMessage(fresh.reason).body}
          </Notice>
        ) : fresh.plan.caloriesKcal === target.caloriesKcal &&
          fresh.plan.macros.proteinG === target.proteinG ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ✓ Your latest weight of {fmt1(weight)} kg gives the same target. No update needed.
          </p>
        ) : recalc ? (
          <TargetCompare
            before={target}
            after={{ caloriesKcal: fresh.plan.caloriesKcal, ...fresh.plan.macros }}
            onKeep={() => {
              setRecalc(false);
              toast({ text: 'Kept your current plan. Nothing changed.' });
            }}
            onConfirm={() => {
              const plan = fresh.plan;
              update((x) =>
                addTarget(
                  x,
                  targetFromPlan(
                    plan,
                    {
                      id: newId(),
                      effectiveFrom: today,
                      createdAt: new Date().toISOString(),
                      reason: 'profile_change',
                    },
                    weight,
                  ),
                ),
              );
              setRecalc(false);
              toast({
                text: `Updated. Your new daily target is ${fmtInt(plan.caloriesKcal)} kcal`,
              });
              navigate('/me/targets', { replace: true });
            }}
          />
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Your target was set at {fmt1(target.weightKg)} kg and your latest weight is{' '}
              {fmt1(weight)} kg. Preview the old and new targets before deciding.
            </p>
            <Button variant="secondary" className="w-full" onClick={() => setRecalc(true)}>
              Preview recalculated target
            </Button>
          </>
        )}
      </Card>

      <Card>
        <CardTitle>Target history</CardTitle>
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700">
          {[...targets]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="block font-medium">{t.effectiveFrom}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {REASON_LABELS[t.reason]} · weight {fmt1(t.weightKg)} kg
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-bold">{fmtInt(t.caloriesKcal)} kcal</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    protein {t.proteinG} g
                  </span>
                </span>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}
