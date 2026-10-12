import type { LifestyleMode, WorkoutSession } from '../data/types';

// First-version content (spec 18). Cues are short, general safety cues; demonstration
// media is added later from self-made or licensed material only.

export interface Exercise {
  id: string;
  name: string;
  kind: 'reps' | 'time';
  weighted: boolean;
  lowImpact: boolean;
  cue: string;
}

export const EXERCISES: Exercise[] = [
  {
    id: 'march',
    name: '原地踏步',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '抬膝、摆臂，保持自然呼吸。',
  },
  {
    id: 'chair-squat',
    name: '椅子深蹲',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '坐下轻触椅面再站起，膝盖朝脚尖方向。',
  },
  {
    id: 'squat',
    name: '深蹲',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '双脚与肩同宽，臀部往后坐，背部挺直。',
  },
  {
    id: 'wall-pushup',
    name: '靠墙俯卧撑',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '身体成一直线，胸口靠近墙再推回。',
  },
  {
    id: 'incline-pushup',
    name: '上斜俯卧撑',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '双手撑在稳固的桌面，核心收紧。',
  },
  {
    id: 'pushup',
    name: '俯卧撑',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '头到脚成直线；太难可改跪姿。',
  },
  {
    id: 'glute-bridge',
    name: '臀桥',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '躺下屈膝，臀部抬起到身体成直线。',
  },
  {
    id: 'reverse-lunge',
    name: '后弓步',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '一脚向后踏，前膝不内扣；左右各算一次。',
  },
  {
    id: 'step-up',
    name: '踏阶',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '踏上稳固的台阶，整个脚掌踩实。',
  },
  {
    id: 'dead-bug',
    name: '死虫式',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '下背贴地，对侧手脚慢慢伸直。',
  },
  {
    id: 'plank',
    name: '平板支撑',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '手肘在肩膀下方，臀部不下沉。',
  },
  {
    id: 'side-plank',
    name: '侧平板',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '身体成直线；太难可弯曲下方膝盖。',
  },
  {
    id: 'mountain-climber',
    name: '登山者（扶台缓慢版）',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '双手扶稳固台面，轮流慢慢提膝。',
  },
  {
    id: 'goblet-squat',
    name: '高脚杯深蹲',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '哑铃贴胸，背部挺直往下坐。',
  },
  {
    id: 'db-rdl',
    name: '哑铃罗马尼亚硬举',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '膝微弯，臀部往后推，背部保持平直。',
  },
  {
    id: 'db-floor-press',
    name: '哑铃地板卧推',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '躺地，手肘约 45 度，推起不锁死。',
  },
  {
    id: 'db-row',
    name: '单臂哑铃划船',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '手撑稳固处，拉向腰侧，背部平直。',
  },
  {
    id: 'db-press',
    name: '哑铃肩推',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '核心收紧，不要过度后仰。',
  },
  {
    id: 'db-lunge',
    name: '哑铃弓步',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '步伐稳定，前膝朝脚尖方向。',
  },
  {
    id: 'leg-press',
    name: '脚推机',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '下背贴紧椅背，不要锁死膝盖。',
  },
  {
    id: 'machine-chest-press',
    name: '机械推胸',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '调整座位让把手在胸口高度。',
  },
  {
    id: 'lat-pulldown',
    name: '滚轮下拉',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '拉到上胸，肩膀向下沉，不要耸肩。',
  },
  {
    id: 'hip-thrust',
    name: '臀推',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '上背靠稳，臀部推到身体成直线。',
  },
  {
    id: 'seated-row',
    name: '坐姿绳索划船',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '胸口挺起，拉向腹部，不要往后倒。',
  },
  {
    id: 'stretch-hip',
    name: '髋屈肌伸展',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '弓步跪姿，骨盆微微前推，左右各一次。',
  },
  {
    id: 'stretch-ham',
    name: '脚后腱伸展',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '腿伸直，背部平直往前倾，不要弹震。',
  },
  {
    id: 'stretch-chest',
    name: '胸部伸展',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '手扶门框，身体慢慢转开。',
  },
  {
    id: 'cat-cow',
    name: '猫牛式',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '四足跪姿，配合呼吸慢慢拱背和塌腰。',
  },
];

export interface TemplateItem {
  exerciseId: string;
  sets: number;
  reps?: number;
  seconds?: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  modes: LifestyleMode[];
  minutes: number;
  note: string;
  items: TemplateItem[];
  activity?: { type: 'walk' | 'run'; minutes: number };
}

const all: LifestyleMode[] = ['nutrition_first', 'home', 'gym', 'outdoor', 'mixed'];

export const TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'home-5',
    name: '5 分钟入门活动',
    modes: all,
    minutes: 5,
    note: '低冲击，每个动作 40 秒',
    items: [
      { exerciseId: 'march', sets: 1, seconds: 40 },
      { exerciseId: 'chair-squat', sets: 1, seconds: 40 },
      { exerciseId: 'wall-pushup', sets: 1, seconds: 40 },
      { exerciseId: 'glute-bridge', sets: 1, seconds: 40 },
    ],
  },
  {
    id: 'home-10',
    name: '10 分钟全身自重',
    modes: ['home', 'mixed', 'nutrition_first'],
    minutes: 10,
    note: '循环 2 轮',
    items: [
      { exerciseId: 'squat', sets: 2, reps: 12 },
      { exerciseId: 'incline-pushup', sets: 2, reps: 10 },
      { exerciseId: 'reverse-lunge', sets: 2, reps: 10 },
      { exerciseId: 'dead-bug', sets: 2, reps: 10 },
    ],
  },
  {
    id: 'home-15-low',
    name: '15 分钟站立式低冲击',
    modes: ['home', 'mixed', 'nutrition_first'],
    minutes: 15,
    note: '不趴地，适合膝盖或手腕不适者',
    items: [
      { exerciseId: 'march', sets: 3, seconds: 60 },
      { exerciseId: 'chair-squat', sets: 3, reps: 12 },
      { exerciseId: 'wall-pushup', sets: 3, reps: 12 },
      { exerciseId: 'step-up', sets: 3, reps: 10 },
    ],
  },
  {
    id: 'home-20',
    name: '20 分钟全身自重进阶',
    modes: ['home', 'mixed'],
    minutes: 20,
    note: '循环 3 轮',
    items: [
      { exerciseId: 'pushup', sets: 3, reps: 10 },
      { exerciseId: 'step-up', sets: 3, reps: 12 },
      { exerciseId: 'plank', sets: 3, seconds: 30 },
      { exerciseId: 'mountain-climber', sets: 3, seconds: 30 },
      { exerciseId: 'glute-bridge', sets: 3, reps: 15 },
    ],
  },
  {
    id: 'db-a',
    name: '哑铃全身 A',
    modes: ['home', 'mixed'],
    minutes: 35,
    note: '每组 8–12 次，保留 2–3 次的力气',
    items: [
      { exerciseId: 'goblet-squat', sets: 3, reps: 10 },
      { exerciseId: 'db-floor-press', sets: 3, reps: 10 },
      { exerciseId: 'db-row', sets: 3, reps: 10 },
    ],
  },
  {
    id: 'db-b',
    name: '哑铃全身 B',
    modes: ['home', 'mixed'],
    minutes: 35,
    note: '每组 8–12 次，保留 2–3 次的力气',
    items: [
      { exerciseId: 'db-rdl', sets: 3, reps: 10 },
      { exerciseId: 'db-press', sets: 3, reps: 10 },
      { exerciseId: 'db-lunge', sets: 3, reps: 10 },
    ],
  },
  {
    id: 'gym-a',
    name: 'Gym 新手全身 A',
    modes: ['gym', 'mixed'],
    minutes: 45,
    note: '每周 2–3 次与 B 交替；每组 8–12 次',
    items: [
      { exerciseId: 'leg-press', sets: 3, reps: 10 },
      { exerciseId: 'machine-chest-press', sets: 3, reps: 10 },
      { exerciseId: 'lat-pulldown', sets: 3, reps: 10 },
      { exerciseId: 'plank', sets: 3, seconds: 30 },
    ],
  },
  {
    id: 'gym-b',
    name: 'Gym 新手全身 B',
    modes: ['gym', 'mixed'],
    minutes: 45,
    note: '每周 2–3 次与 A 交替；每组 8–12 次',
    items: [
      { exerciseId: 'hip-thrust', sets: 3, reps: 10 },
      { exerciseId: 'db-press', sets: 3, reps: 10 },
      { exerciseId: 'seated-row', sets: 3, reps: 10 },
      { exerciseId: 'side-plank', sets: 3, seconds: 20 },
    ],
  },
  {
    id: 'walk-20',
    name: '快走 20 分钟',
    modes: ['outdoor', 'nutrition_first', 'mixed'],
    minutes: 20,
    note: '能说话但不能唱歌的节奏',
    items: [],
    activity: { type: 'walk', minutes: 20 },
  },
  {
    id: 'stretch-10',
    name: '伸展与放松 10 分钟',
    modes: all,
    minutes: 10,
    note: '休息日可做，每个动作 30–60 秒',
    items: [
      { exerciseId: 'stretch-hip', sets: 2, seconds: 45 },
      { exerciseId: 'stretch-ham', sets: 2, seconds: 45 },
      { exerciseId: 'stretch-chest', sets: 2, seconds: 45 },
      { exerciseId: 'cat-cow', sets: 1, seconds: 60 },
    ],
  },
];

export function exerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function templateById(id: string): WorkoutTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templatesFor(mode: LifestyleMode): WorkoutTemplate[] {
  return TEMPLATES.filter((t) => t.modes.includes(mode));
}

/** Heaviest completed weight per exercise across finished sessions. */
export function bestWeights(sessions: WorkoutSession[]): Map<string, number> {
  const best = new Map<string, number>();
  for (const s of sessions) {
    if (!s.endedAt) continue;
    for (const set of s.sets) {
      if (!set.done || set.weightKg === undefined) continue;
      best.set(set.exerciseId, Math.max(best.get(set.exerciseId) ?? 0, set.weightKg));
    }
  }
  return best;
}

/** Exercises in `session` whose completed weight beats every earlier finished session. */
export function newRecords(session: WorkoutSession, earlier: WorkoutSession[]): string[] {
  const before = bestWeights(earlier);
  const now = bestWeights([{ ...session, endedAt: session.endedAt ?? 'now' }]);
  return [...now]
    .filter(([id, w]) => w > (before.get(id) ?? 0) && before.has(id))
    .map(([id]) => id);
}
