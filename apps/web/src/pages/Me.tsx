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
import { clearThumbs } from '../data/photoThumbs';
import { useToast } from '../components/Toast';
import {
  BackArrow,
  backButtonClass,
  Button,
  Card,
  CardTitle,
  Field,
  inputClass,
  LinkRowContent,
  linkRowClass,
  List,
  Notice,
  PageTitle,
  Stepper,
  Switch,
  ToggleRow,
  SelectRow,
  ChoiceCards,
  CheckCards,
} from '../components/ui';
import {
  addTarget,
  saveProfile,
  setHideNumbers,
  setLanguage,
  updateProfileDetails,
} from '../data/actions';
import { useAuth } from '../data/auth';
import {
  deleteAccount,
  deleteHealthRecords,
  signOut,
  useSync,
  type SyncStatus,
} from '../data/sync';
import { isPersistent, newId, replaceState, update, useAppState } from '../data/store';
import { emptyState, type DietTag, type Profile, type TargetVersion } from '../data/types';
import { localToday } from '../lib/dates';
import { DEFAULT_REMINDERS, remindersIcs, type Reminder } from '../lib/reminders';
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
import { setLang, t, tr, useLang, type Lang } from '../lib/i18n';

const RATE_OPTIONS: Record<Goal, number[]> = {
  fat_loss: [0.25, 0.5, 0.75, 1],
  maintain: [0],
  muscle_gain: [0.1, 0.25, 0.5],
  weight_gain: [0.25, 0.5],
};

const SYNC_TEXT: Record<SyncStatus, string> = tr({
  off: '',
  syncing: 'Syncing…',
  synced: '✓ Your logs are synced to your account',
  offline: "You're offline: logs are saved on this device and sync when you reconnect.",
  error: 'Sync failed. It will retry automatically.',
});

const REASON_LABELS: Record<TargetVersion['reason'], string> = tr({
  initial: 'Initial',
  profile_change: 'Profile update',
  adaptive: 'Adjusted',
});

const AVATARS = ['🥗', '🍎', '🥑', '🍳', '🍜', '🍛', '🥦', '🍓', '💪', '🏃', '🧘', '😊'];

type Mode = 'home' | 'plan' | 'profile' | 'body' | 'targets';

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
    { k: t('Daily calories'), a: before.caloriesKcal, b: after.caloriesKcal, u: 'kcal' },
    { k: t('Protein'), a: before.proteinG, b: after.proteinG, u: 'g' },
    { k: t('Carbs'), a: before.carbsG, b: after.carbsG, u: 'g' },
    { k: t('Fat'), a: before.fatG, b: after.fatG, u: 'g' },
  ];
  return (
    <div
      role="region"
      aria-label={t('Old and new targets')}
      className="space-y-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald/40 dark:bg-emerald/10"
    >
      <p className="font-bold">{t('Update your daily target?')}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-slate-500 dark:text-slate-400">
            <th scope="col" className="text-left font-semibold">
              {t('Item')}
            </th>
            <th scope="col" className="text-right font-semibold">
              {t('Now')}
            </th>
            <th scope="col" className="text-right font-semibold">
              {t('New')}
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
        {t('The new target starts today. Past food logs and target history are kept unchanged.')}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onKeep}>
          {t('Keep current plan')}
        </Button>
        <Button onClick={onConfirm}>{t('Confirm update')}</Button>
      </div>
    </div>
  );
}

function Row({ to, title, sub }: { to: string; title: string; sub?: ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="flex min-h-[3.75rem] w-full items-center gap-3 py-2 text-left transition hover:opacity-70"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[1.0625rem]">{title}</span>
          {sub && (
            <span className="block truncate text-sm text-slate-500 dark:text-slate-400">{sub}</span>
          )}
        </span>
        <span aria-hidden="true" className="text-slate-400">
          ›
        </span>
      </Link>
    </li>
  );
}

const rowButtonClass =
  'flex min-h-[3.75rem] w-full items-center gap-3 py-2 text-left transition hover:opacity-70';

/** Daily reminders added to the phone's own calendar (see lib/reminders.ts). */
function RemindersCard() {
  const [reminders, setReminders] = useState<Reminder[]>(DEFAULT_REMINDERS);
  const toast = useToast();
  const anyOn = reminders.some((r) => r.on);
  const setOne = (id: Reminder['id'], patch: Partial<Reminder>) =>
    setReminders((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const download = () => {
    const ics = remindersIcs(reminders, localToday(), `${window.location.origin}/today`);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eathealthee-reminders.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast({ text: t('Open the downloaded file to add the reminders to your calendar') });
  };
  return (
    <div className="space-y-2">
      <List
        title={t('Reminders')}
        footer={t(
          "Reminders are added to your phone's calendar (iPhone Calendar, Google Calendar or Outlook). To change or stop them later, edit or delete the EatHealthee events there.",
        )}
      >
        {reminders.map((r) => (
          <div key={r.id} className="flex min-h-12 items-center justify-between gap-3 py-2">
            <span
              className={`text-[1.0625rem] ${r.on ? '' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {r.label}
            </span>
            <span className="flex items-center gap-3">
              <input
                type="time"
                aria-label={t('{label} reminder time', { label: r.label })}
                value={r.time}
                disabled={!r.on}
                onChange={(e) => e.target.value && setOne(r.id, { time: e.target.value })}
                className="min-h-8 rounded-[8px] bg-[#767680]/[0.12] px-2 text-[1.0625rem] disabled:opacity-40 dark:bg-[#767680]/[0.24]"
              />
              <Switch label={r.label} checked={r.on} onChange={(on) => setOne(r.id, { on })} />
            </span>
          </div>
        ))}
        <button
          type="button"
          disabled={!anyOn}
          onClick={download}
          className="min-h-12 w-full text-left text-[1.0625rem] text-emerald-strong disabled:opacity-40 dark:text-emerald"
        >
          {t('Add to my calendar')}
        </button>
      </List>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-1 text-xs font-semibold tracking-[0.08em] text-emerald-strong uppercase dark:text-emerald">
        {title}
      </h2>
      <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-white/10 dark:border-white/10 [&>ul]:divide-y [&>ul]:divide-slate-200 dark:[&>ul]:divide-white/10">
        {children}
      </div>
    </section>
  );
}

function BackToMe() {
  return (
    <Link to="/me" className={backButtonClass}>
      <BackArrow />
      {t('Me')}
    </Link>
  );
}

export function Me({ mode = 'home' }: { mode?: Mode }) {
  const s = useAppState();
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const lang = useLang();
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
      toast({ text: t('Saved') });
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
    toast({
      text: t('Updated. Your new daily target is {v1} kcal', {
        v1: fmtInt(preview.plan.caloriesKcal),
      }),
    });
    navigate('/me');
  };

  const keepPlan = () => {
    setDraft(profile);
    setHeightText(String(profile.heightCm));
    setTargetText(profile.targetWeightKg !== undefined ? String(profile.targetWeightKg) : '');
    setConfirming(false);
    toast({ text: t('Kept your current plan. Nothing changed.') });
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
          {changed && targetChanges && target ? t('Preview new daily target') : label}
        </Button>
      )}
    </>
  );

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

  // Delete-account confirmation, shown on Profile & account and in Me → Delete data.
  const deleteAccountPanel = (
    <Notice tone="warn" title={t('Permanently delete your account?')}>
      {t(
        "Your login email, password, all food and weight logs in the cloud, plan and settings will be permanently deleted and can't be recovered. Download your data first if you want a copy (Me → Privacy & data).",
      )}
      <Field label={t('Type DELETE to confirm')}>
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
          onClick={() => void run(deleteAccount, () => navigate('/welcome', { replace: true }))}
        >
          {busy ? t('Deleting…') : t('Delete account forever')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={closeDanger}>
          {t('Cancel')}
        </Button>
      </div>
    </Notice>
  );

  if (mode === 'profile') {
    const avatarNow = draft.avatar ?? (signedIn ? (email[0] ?? '🙂').toUpperCase() : '🙂');
    return (
      <div className="space-y-4">
        <BackToMe />
        <PageTitle sub={t('Your name, picture and account.')}>{t('Profile & account')}</PageTitle>

        <div className="flex flex-col items-center gap-2 pb-1">
          <span
            aria-hidden="true"
            className="flex size-24 items-center justify-center rounded-full bg-gradient-to-b from-slate-100 to-slate-200 text-5xl font-semibold text-slate-600 dark:from-slate-600 dark:to-slate-700 dark:text-slate-100"
          >
            {avatarNow}
          </span>
          {signedIn && <p className="text-sm text-slate-500 dark:text-slate-400">{email}</p>}
        </div>

        <Card className="space-y-6">
          <div>
            <label htmlFor="nickname" className="text-[1.0625rem] font-semibold">
              {t('Nickname')}
            </label>
            <input
              id="nickname"
              maxLength={20}
              placeholder={t('What should we call you?')}
              value={draft.nickname ?? ''}
              onChange={(e) => setDraft({ ...draft, nickname: e.target.value })}
              className="mt-2 block min-h-14 w-full rounded-[16px] bg-white px-4 text-[1.25rem] font-semibold ring-1 ring-slate-200 placeholder:text-base placeholder:font-normal placeholder:text-slate-400 focus:ring-2 focus:ring-emerald focus:outline-none dark:bg-slate-800 dark:ring-slate-600"
            />
          </div>
          <fieldset>
            <legend className="text-[1.0625rem] font-semibold">{t('Picture')}</legend>
            <div className="mt-2 grid grid-cols-6 gap-2" role="group" aria-label={t('Avatar')}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-label={t('Avatar {a}', { a })}
                  aria-pressed={draft.avatar === a}
                  onClick={() => setDraft({ ...draft, avatar: a })}
                  className={`flex aspect-square items-center justify-center rounded-full text-2xl transition ${draft.avatar === a ? 'bg-emerald-100 ring-2 ring-emerald-strong dark:bg-emerald/20 dark:ring-emerald' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700'}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </fieldset>
        </Card>

        {saveBar(t('Save profile'))}

        {signedIn && (
          <List title={t('Account')}>
            <div className="flex min-h-12 items-center justify-between gap-3 py-2">
              <span className="text-[1.0625rem]">{t('Email')}</span>
              <span className="truncate text-[1.0625rem] text-slate-500 dark:text-slate-400">
                {email}
              </span>
            </div>
            <Link to="/update-password" className={linkRowClass}>
              <LinkRowContent label={t('Change password')} />
            </Link>
          </List>
        )}

        {!signedIn && (
          <List
            title={t('Account')}
            footer={t(
              'Without an account your data is only on this device. Sign up to back it up and use it on any phone.',
            )}
          >
            <Link to="/signup" className={linkRowClass}>
              <LinkRowContent
                label={
                  <span className="text-emerald-strong dark:text-emerald">{t('Sign up')}</span>
                }
              />
            </Link>
            <Link to="/login" className={linkRowClass}>
              <LinkRowContent label={t('Log in')} />
            </Link>
          </List>
        )}

        {signedIn && (
          <List
            footer={t(
              'Your logs are synced before logging out, so you can get them back on any device.',
            )}
          >
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await signOut();
                navigate('/welcome', { replace: true });
              }}
              className="min-h-12 w-full text-center text-[1.0625rem] text-[#ff3b30] disabled:opacity-50"
            >
              {busy ? t('Logging out…') : t('Log out')}
            </button>
          </List>
        )}

        {signedIn && (
          <List>
            {danger === 'account' ? (
              <div className="py-3">{deleteAccountPanel}</div>
            ) : (
              <button
                type="button"
                className="min-h-12 w-full text-center text-[1.0625rem] text-[#ff3b30]"
                onClick={() => {
                  closeDanger();
                  setDanger('account');
                }}
              >
                {t('Delete account')}
              </button>
            )}
          </List>
        )}
      </div>
    );
  }

  if (mode === 'body') {
    return (
      <div className="space-y-4">
        <BackToMe />
        <PageTitle sub={t('Used to work out your daily calorie target.')}>
          {t('Body details')}
        </PageTitle>
        <Card className="space-y-6">
          <ChoiceCards
            label={t('Formula')}
            hint={t('The calorie formula has a male and a female version; neutral is the average.')}
            columns={3}
            value={draft.formulaSex}
            options={[
              { value: 'male', label: t('Male'), icon: '♂️' },
              { value: 'female', label: t('Female'), icon: '♀️' },
              { value: 'neutral', label: t('Neutral'), icon: '⚧️', sub: t('average') },
            ]}
            onChange={(v) => set('formulaSex', v as FormulaSex)}
          />
          <div>
            <label htmlFor="birth-date" className="text-[1.0625rem] font-semibold">
              {t('Date of birth')}
            </label>
            <input
              id="birth-date"
              type="date"
              max={today}
              value={draft.birthDate}
              onChange={(e) => set('birthDate', e.target.value)}
              className="mt-2 block min-h-14 w-full rounded-[16px] bg-white px-4 text-[1.25rem] font-semibold ring-1 ring-slate-200 focus:ring-2 focus:ring-emerald focus:outline-none dark:bg-slate-800 dark:ring-slate-600"
            />
            {invalid === 'birthDate' && (
              <p className="mt-1 text-sm text-[#ff3b30]">{fieldMessage('birthDate')}</p>
            )}
          </div>
          <Stepper
            label={t('Height')}
            unit="cm"
            step={1}
            fallback={profile.heightCm}
            value={heightText}
            onChange={setHeightText}
            error={invalid === 'heightCm' ? fieldMessage('heightCm') : null}
          />
          {draft.goal !== 'maintain' && (
            <Stepper
              label={t('Target weight')}
              hint={t(
                "Optional. Only used to show your progress; it doesn't change your daily calories.",
              )}
              unit="kg"
              step={0.5}
              fallback={weight || 60}
              placeholder={t('Not set')}
              value={targetText}
              onChange={setTargetText}
              error={
                invalid === 'targetWeightKg'
                  ? draft.goal === 'fat_loss'
                    ? t('Must be below your current weight')
                    : t('Must be above your current weight')
                  : null
              }
            />
          )}
          <Link
            to="/progress#weights"
            className="flex items-center justify-between rounded-[16px] bg-emerald-50 px-4 py-3 dark:bg-emerald/15"
          >
            <span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {t('Current weight')}
              </span>
              <span className="text-[1.25rem] font-bold">
                {profile.hideNumbers ? t('Hidden') : t('{v1} kg', { v1: fmt1(weight) })}
              </span>
            </span>
            <span className="text-sm font-semibold text-emerald-strong dark:text-emerald">
              {t('Log weight ›')}
            </span>
          </Link>
        </Card>
        {saveBar(t('Save'))}
      </div>
    );
  }

  if (mode === 'plan') {
    return (
      <div className="space-y-4">
        <BackToMe />
        <PageTitle sub={t("You'll see old and new targets side by side before anything changes.")}>
          {t('Goal & lifestyle')}
        </PageTitle>
        <Card className="space-y-6">
          <ChoiceCards
            label={t('Your goal')}
            value={draft.goal}
            options={[
              {
                value: 'fat_loss',
                label: t('Lose fat'),
                sub: t('Eat a little less than you burn'),
                icon: '🔥',
              },
              {
                value: 'maintain',
                label: t('Maintain'),
                sub: t('Keep your weight steady'),
                icon: '⚖️',
              },
              {
                value: 'muscle_gain',
                label: t('Build muscle'),
                sub: t('More protein, a small surplus'),
                icon: '💪',
              },
              {
                value: 'weight_gain',
                label: t('Gain weight'),
                sub: t('Eat a little more than you burn'),
                icon: '📈',
              },
            ]}
            onChange={(g) =>
              setDraft({ ...draft, goal: g, ratePctPerWeek: RATE_PCT_PER_WEEK[g].default })
            }
          />
          {draft.goal !== 'maintain' && (
            <ChoiceCards
              label={t('Pace')}
              hint={t('A slower pace is easier to keep up and helps you keep muscle.')}
              value={String(draft.ratePctPerWeek)}
              options={RATE_OPTIONS[draft.goal].map((r) => ({
                value: String(r),
                label:
                  r === RATE_PCT_PER_WEEK[draft.goal].default
                    ? t('{r}% · recommended', { r })
                    : t('{r}% a week', { r }),
                sub: weight
                  ? t('about {v1} kg a week', { v1: ((r / 100) * weight).toFixed(2) })
                  : t('of body weight a week'),
              }))}
              onChange={(v) => set('ratePctPerWeek', Number(v))}
            />
          )}
        </Card>

        <Card>
          <ChoiceCards
            label={t('How active are you?')}
            hint={t('Count your job and exercise together.')}
            columns={1}
            value={draft.activityLevel}
            options={(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => ({
              value: a,
              label: ACTIVITY_LABELS[a].name,
              sub: ACTIVITY_LABELS[a].hint,
              icon: { sedentary: '🪑', light: '🚶', moderate: '🚴', very: '🏃', extra: '🏋️' }[a],
            }))}
            onChange={(v) => set('activityLevel', v)}
          />
        </Card>

        <Card className="space-y-6">
          <CheckCards
            label={t('Health')}
            hint={t('Only used to keep our advice safe for you. Tick any that apply.')}
            columns={1}
            options={[
              {
                key: 'pregnantOrLactating',
                label: t('Pregnant or breastfeeding'),
                icon: '🤰',
                checked: draft.screening.pregnantOrLactating,
              },
              {
                key: 'eatingDisorderHistory',
                label: t('Eating disorder'),
                sub: t('diagnosed or in treatment'),
                icon: '💭',
                checked: draft.screening.eatingDisorderHistory,
              },
              {
                key: 'kidneyDisease',
                label: t('Kidney disease'),
                icon: '🩺',
                checked: draft.screening.kidneyDisease,
              },
            ]}
            onToggle={(k, v) => set('screening', { ...draft.screening, [k]: v })}
          />
          <CheckCards
            label={t('Diet')}
            options={(Object.keys(DIET_LABELS) as DietTag[]).map((t) => ({
              key: t,
              label: DIET_LABELS[t],
              checked: draft.dietTags.includes(t),
            }))}
            onToggle={(t, on) =>
              set(
                'dietTags',
                on ? [...draft.dietTags, t as DietTag] : draft.dietTags.filter((x) => x !== t),
              )
            }
          />
        </Card>

        {saveBar(t('Save'))}
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

  return (
    <div className="space-y-8">
      <PageTitle sub={t('Manage your health plan and app settings.')}>{t('Me')}</PageTitle>

      <section>
        <Link
          to="/me/profile"
          aria-label={t('Edit profile')}
          className="flex items-center gap-4 py-2 transition hover:opacity-80"
        >
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-3xl font-semibold text-emerald-strong dark:bg-emerald/15 dark:text-emerald"
          >
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.375rem] leading-tight font-semibold">
              {profile.nickname ?? (signedIn ? t('No nickname yet') : t('Guest'))}
            </span>
            <span className="block truncate text-sm text-slate-500 dark:text-slate-400">
              {signedIn ? email : t('Not logged in')}
            </span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
              {GOAL_LABELS[profile.goal]}
              {target && !hide && t(' · {v1} kcal a day', { v1: fmtInt(target.caloriesKcal) })}
            </span>
          </span>
          <span aria-hidden="true" className="text-xl text-slate-300 dark:text-slate-500">
            ›
          </span>
        </Link>
        {signedIn && SYNC_TEXT[sync.status] && (
          <p className="pt-2 text-sm text-slate-500 dark:text-slate-400">
            {SYNC_TEXT[sync.status]}
          </p>
        )}
        {!signedIn && (
          <div className="flex gap-2 pt-3">
            <Link
              to="/signup"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-emerald-strong px-4 text-[0.9375rem] font-semibold text-white dark:bg-emerald dark:text-black"
            >
              {t('Sign up')}
            </Link>
            <Link
              to="/login"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[14px] bg-[#767680]/[0.12] px-4 text-[0.9375rem] font-semibold text-emerald-strong dark:bg-[#767680]/[0.24] dark:text-emerald"
            >
              {t('Log in')}
            </Link>
          </div>
        )}
      </section>

      <Group title={t('My health plan')}>
        <ul>
          <Row
            to="/me/plan"
            title={t('Goal & lifestyle')}
            sub={`${GOAL_LABELS[profile.goal]}${profile.goal !== 'maintain' ? ` · ${t('{r}% a week', { r: profile.ratePctPerWeek })}` : ''} · ${ACTIVITY_LABELS[profile.activityLevel].name}`}
          />
          <Row
            to="/me/body"
            title={t('Body details')}
            sub={t('Height {heightCm} cm · born {birthDate}{v3}', {
              heightCm: profile.heightCm,
              birthDate: profile.birthDate,
              v3:
                profile.targetWeightKg !== undefined && !hide
                  ? ` · ${t('target {kg} kg', { kg: fmt1(profile.targetWeightKg) })}`
                  : '',
            })}
          />
          <Row
            to="/me/targets"
            title={t('Daily nutrition targets')}
            sub={
              target && !hide
                ? t("{v1} kcal · protein {proteinG} g · how it's worked out", {
                    v1: fmtInt(target.caloriesKcal),
                    proteinG: target.proteinG,
                  })
                : t("How it's worked out, and history")
            }
          />
          <Row
            to="/progress#weights"
            title={t('Weight log')}
            sub={
              hide
                ? t('Add, edit or delete weigh-ins')
                : weight
                  ? t('Latest {v1} kg', { v1: fmt1(weight) })
                  : t('No weigh-ins yet')
            }
          />
        </ul>
      </Group>

      <RemindersCard />

      <List
        title={t('Appearance')}
        footer={t(
          'Hiding calories and weight helps if the numbers stress you out, or someone can see your screen. You still log as usual; the app shows your habits instead.',
        )}
      >
        {/* Each language is named in itself, so it can be found in either language. */}
        <SelectRow<Lang>
          label={t('Language')}
          value={lang}
          options={[
            { value: 'en', label: 'English' },
            { value: 'zh', label: '简体中文' },
          ]}
          onChange={(l) => {
            setLang(l);
            update((x) => setLanguage(x, l));
          }}
        />
        <SelectRow<Theme>
          label={t('Theme')}
          value={theme}
          options={[
            { value: 'light', label: t('Light') },
            { value: 'dark', label: t('Dark') },
            { value: 'system', label: t('Auto (match phone)') },
          ]}
          onChange={setTheme}
        />
        <ToggleRow
          label={t('Hide calories and weight')}
          checked={hide}
          onChange={(v) => update((x) => setHideNumbers(x, v))}
        />
      </List>

      <Group title={t('Privacy & data')}>
        <ul>
          <Row
            to="/me/report"
            title={t('Download my data')}
            sub={t('A clear report of your logs, saved as PDF')}
          />
        </ul>
        <p className="py-3 text-sm text-slate-500 dark:text-slate-400">
          {signedIn
            ? t(
                'Your data is in your account (servers in Singapore) and on this device. Only you can see it.',
              )
            : isPersistent()
              ? t(
                  "Your data is only on this device. Sign up so you don't lose it if you change phones.",
                )
              : t("This browser can't save data (maybe private browsing).")}
        </p>
      </Group>

      <Group title={t('Help & info')}>
        <ul>
          <Row to="/how-we-calculate" title={t('How we calculate')} />
          <Row to="/help/faq" title={t('FAQ')} />
          <Row to="/legal/disclaimer" title={t('Health disclaimer')} />
          <Row to="/legal/privacy" title={t('Privacy policy')} />
          <Row to="/legal/credits" title={t('Data sources')} />
        </ul>
      </Group>

      <Group title={t('Delete data')}>
        <ul>
          <li>
            {danger === 'records' ? (
              <div className="p-2">
                <Notice tone="warn" title={t('Delete all your logs?')}>
                  {t('All food, weight and water logs will be permanently deleted from')}{' '}
                  {signedIn ? t('your account and this device') : t('this device')}
                  {t(
                    ". Your profile and plan stay. This can't be undone, so download your data first if you want a copy.",
                  )}
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
                          toast({ text: t('All logs deleted') });
                        })
                      }
                    >
                      {busy ? t('Deleting…') : t('Delete logs')}
                    </Button>
                    <Button variant="secondary" disabled={busy} onClick={closeDanger}>
                      {t('Cancel')}
                    </Button>
                  </div>
                </Notice>
              </div>
            ) : (
              <button
                type="button"
                aria-label={t('Delete all health records')}
                className={rowButtonClass}
                onClick={() => {
                  closeDanger();
                  setDanger('records');
                }}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[1.0625rem] text-[#a04438] dark:text-red-300">
                    {t('Delete all my logs')}
                  </span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    {t(
                      'Removes your food, weight and water logs. Your account, profile and plan stay.',
                    )}
                  </span>
                </span>
              </button>
            )}
          </li>
          {!signedIn && (
            <li>
              {danger === 'device' ? (
                <div className="p-2">
                  <Notice tone="warn" title={t('Delete everything on this device?')}>
                    {t(
                      "Your profile, plan and all logs will be permanently deleted, and you'll start again from the welcome page.",
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="danger"
                        onClick={() => {
                          replaceState(emptyState);
                          void clearThumbs();
                          navigate('/welcome', { replace: true });
                        }}
                      >
                        {t('Delete everything')}
                      </Button>
                      <Button variant="secondary" onClick={closeDanger}>
                        {t('Cancel')}
                      </Button>
                    </div>
                  </Notice>
                </div>
              ) : (
                <button
                  type="button"
                  className={rowButtonClass}
                  onClick={() => {
                    closeDanger();
                    setDanger('device');
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1.0625rem] text-[#a04438] dark:text-red-300">
                      {t('Delete everything on this device')}
                    </span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">
                      {t('Removes everything saved on this device, and you start over.')}
                    </span>
                  </span>
                </button>
              )}
            </li>
          )}
          {signedIn && (
            <li>
              {danger === 'account' ? (
                <div className="py-2">{deleteAccountPanel}</div>
              ) : (
                <button
                  type="button"
                  className={rowButtonClass}
                  onClick={() => {
                    closeDanger();
                    setDanger('account');
                  }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[1.0625rem] text-[#a04438] dark:text-red-300">
                      {t('Delete account')}
                    </span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">
                      {t("Removes your account, login and all your data. This can't be undone.")}
                    </span>
                  </span>
                </button>
              )}
            </li>
          )}
        </ul>
      </Group>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        {t('App version')} {__APP_VERSION__} ({__BUILD_DATE__})
      </p>
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
        <PageTitle>{t('Daily nutrition targets')}</PageTitle>
        <Notice>{t('No daily target yet. Please finish setting up your profile first.')}</Notice>
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
      <PageTitle sub={t('How your daily target is worked out.')}>
        {t('Daily nutrition targets')}
      </PageTitle>

      {hide && (
        <Notice>
          {t(
            "You've chosen to hide numbers. This page still shows them because it explains the calculation; go back if you'd rather not see them.",
          )}
        </Notice>
      )}

      <Card className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: t('Daily calories'), v: `${fmtInt(target.caloriesKcal)}`, u: 'kcal' },
            {
              k: t('Protein'),
              v: `${target.proteinG}`,
              u: `g · ${Math.round((kcalOf.p / total) * 100)}%`,
            },
            {
              k: t('Carbs'),
              v: `${target.carbsG}`,
              u: `g · ${Math.round((kcalOf.c / total) * 100)}%`,
            },
            { k: t('Fat'), v: `${target.fatG}`, u: `g · ${Math.round((kcalOf.f / total) * 100)}%` },
          ].map((x) => (
            <div key={x.k} className="rounded-2xl bg-slate-50 px-3 py-2.5 dark:bg-slate-700/60">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{x.k}</p>
              <p className="text-xl font-black">{x.v}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{x.u}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('In effect from {date} ({reason}), based on a weight of {kg} kg at the time.', {
            date: target.effectiveFrom,
            reason: REASON_LABELS[target.reason],
            kg: fmt1(target.weightKg),
          })}
        </p>
      </Card>

      <Card className="space-y-4 text-sm leading-relaxed">
        <CardTitle>{t('Step by step')}</CardTitle>
        <div>
          <p className="font-bold">
            {t('① Basal metabolic rate (BMR):')} {fmtInt(target.bmrKcal)} {t('kcal')}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            {t(
              'What your body burns in a day at complete rest, using the Mifflin–St Jeor equation:',
            )}
          </p>
          <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs dark:bg-slate-700/60">
            {t('10 × weight + 6.25 × height − 5 × age')}{' '}
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
            {t('Formula:')} {SEX_LABELS[profile.formulaSex]}
            {profile.formulaSex === 'neutral' && t(' (average of the male and female constants)')}
          </p>
        </div>
        <div>
          <p className="font-bold">
            {t('② Total daily energy expenditure (TDEE):')} {fmtInt(target.tdeeKcal)} {t('kcal')}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            {target.reason === 'adaptive'
              ? t(
                  'Adjusted from your real intake and weight trend, so it fits you better than the formula alone.',
                )
              : t('BMR × activity factor {factor} ({name}).', {
                  factor,
                  name: ACTIVITY_LABELS[profile.activityLevel].name,
                })}
          </p>
        </div>
        <div>
          <p className="font-bold">
            {t('③ Goal adjustment:')}{' '}
            {adjust === 0
              ? 'none'
              : t('{v1}{v2} kcal', { v1: adjust > 0 ? '+' : '−', v2: fmtInt(Math.abs(adjust)) })}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            {GOAL_LABELS[profile.goal]}
            {profile.goal !== 'maintain' &&
              t(', about {ratePctPerWeek}% of body weight a week', {
                ratePctPerWeek: profile.ratePctPerWeek,
              })}
            .{' '}
            {profile.goal === 'fat_loss'
              ? t('The deficit is at most 25% of TDEE.')
              : profile.goal === 'maintain'
                ? ''
                : t('The surplus is at most 500 kcal a day.')}
          </p>
        </div>
        <div>
          <p className="font-bold">
            {t('④ Safety floor:')} {fmtInt(target.calorieFloorKcal)} {t('kcal')}
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            {t(
              'Your daily target never goes below your BMR, or below 1,200 (female) / 1,500 (male, neutral) kcal.',
            )}
          </p>
        </div>
        {target.clamps.length > 0 && (
          <Notice title={t('Adjustments made in this calculation')}>
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
          {t(
            'The formula is only a starting point; everyone burns a little differently. Once you have enough logs, Progress → Target suggestion fine-tunes it from your real data.',
          )}
          <Link
            to="/how-we-calculate"
            className="ml-1 font-semibold text-emerald-strong dark:text-emerald"
          >
            {t('Full method ›')}
          </Link>
        </p>
      </Card>

      <Card className="space-y-3">
        <CardTitle>{t('Recalculate with your latest weight')}</CardTitle>
        {!fresh ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('Log a weigh-in first to recalculate.')}
          </p>
        ) : !fresh.ok ? (
          <Notice tone="warn" title={rejectMessage(fresh.reason).title}>
            {rejectMessage(fresh.reason).body}
          </Notice>
        ) : fresh.plan.caloriesKcal === target.caloriesKcal &&
          fresh.plan.macros.proteinG === target.proteinG ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('✓ Your latest weight of {kg} kg gives the same target. No update needed.', {
              kg: fmt1(weight),
            })}
          </p>
        ) : recalc ? (
          <TargetCompare
            before={target}
            after={{ caloriesKcal: fresh.plan.caloriesKcal, ...fresh.plan.macros }}
            onKeep={() => {
              setRecalc(false);
              toast({ text: t('Kept your current plan. Nothing changed.') });
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
                text: t('Updated. Your new daily target is {v1} kcal', {
                  v1: fmtInt(plan.caloriesKcal),
                }),
              });
              navigate('/me/targets', { replace: true });
            }}
          />
        ) : (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t(
                'Your target was set at {then} kg and your latest weight is {now} kg. Preview the old and new targets before deciding.',
                { then: fmt1(target.weightKg), now: fmt1(weight) },
              )}
            </p>
            <Button variant="secondary" className="w-full" onClick={() => setRecalc(true)}>
              {t('Preview recalculated target')}
            </Button>
          </>
        )}
      </Card>

      <Card>
        <CardTitle>{t('Target history')}</CardTitle>
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-700">
          {[...targets]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((tv) => (
              <li key={tv.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  <span className="block font-medium">{tv.effectiveFrom}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {REASON_LABELS[tv.reason]} {t('· weight')} {fmt1(tv.weightKg)} {t('kg')}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-bold">
                    {fmtInt(tv.caloriesKcal)} {t('kcal')}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t('protein')} {tv.proteinG} g
                  </span>
                </span>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}
