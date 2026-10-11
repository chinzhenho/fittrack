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
    cue: '抬膝、擺臂，保持自然呼吸。',
  },
  {
    id: 'chair-squat',
    name: '椅子深蹲',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '坐下輕觸椅面再站起，膝蓋朝腳尖方向。',
  },
  {
    id: 'squat',
    name: '深蹲',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '雙腳與肩同寬，臀部往後坐，背部挺直。',
  },
  {
    id: 'wall-pushup',
    name: '靠牆俯臥撐',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '身體成一直線，胸口靠近牆再推回。',
  },
  {
    id: 'incline-pushup',
    name: '上斜俯臥撐',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '雙手撐在穩固的桌面，核心收緊。',
  },
  {
    id: 'pushup',
    name: '俯臥撐',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '頭到腳成直線；太難可改跪姿。',
  },
  {
    id: 'glute-bridge',
    name: '臀橋',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '躺下屈膝，臀部抬起到身體成直線。',
  },
  {
    id: 'reverse-lunge',
    name: '後弓步',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '一腳向後踏，前膝不內扣；左右各算一次。',
  },
  {
    id: 'step-up',
    name: '踏階',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '踏上穩固的台階，整個腳掌踩實。',
  },
  {
    id: 'dead-bug',
    name: '死蟲式',
    kind: 'reps',
    weighted: false,
    lowImpact: true,
    cue: '下背貼地，對側手腳慢慢伸直。',
  },
  {
    id: 'plank',
    name: '平板支撐',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '手肘在肩膀下方，臀部不下沉。',
  },
  {
    id: 'side-plank',
    name: '側平板',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '身體成直線；太難可彎曲下方膝蓋。',
  },
  {
    id: 'mountain-climber',
    name: '登山者（扶檯緩慢版）',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '雙手扶穩固檯面，輪流慢慢提膝。',
  },
  {
    id: 'goblet-squat',
    name: '高腳杯深蹲',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '啞鈴貼胸，背部挺直往下坐。',
  },
  {
    id: 'db-rdl',
    name: '啞鈴羅馬尼亞硬舉',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '膝微彎，臀部往後推，背部保持平直。',
  },
  {
    id: 'db-floor-press',
    name: '啞鈴地板臥推',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '躺地，手肘約 45 度，推起不鎖死。',
  },
  {
    id: 'db-row',
    name: '單臂啞鈴划船',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '手撐穩固處，拉向腰側，背部平直。',
  },
  {
    id: 'db-press',
    name: '啞鈴肩推',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '核心收緊，不要過度後仰。',
  },
  {
    id: 'db-lunge',
    name: '啞鈴弓步',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '步伐穩定，前膝朝腳尖方向。',
  },
  {
    id: 'leg-press',
    name: '腳推機',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '下背貼緊椅背，不要鎖死膝蓋。',
  },
  {
    id: 'machine-chest-press',
    name: '機械推胸',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '調整座位讓把手在胸口高度。',
  },
  {
    id: 'lat-pulldown',
    name: '滾輪下拉',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '拉到上胸，肩膀向下沉，不要聳肩。',
  },
  {
    id: 'hip-thrust',
    name: '臀推',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '上背靠穩，臀部推到身體成直線。',
  },
  {
    id: 'seated-row',
    name: '坐姿繩索划船',
    kind: 'reps',
    weighted: true,
    lowImpact: true,
    cue: '胸口挺起，拉向腹部，不要往後倒。',
  },
  {
    id: 'stretch-hip',
    name: '髖屈肌伸展',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '弓步跪姿，骨盆微微前推，左右各一次。',
  },
  {
    id: 'stretch-ham',
    name: '腳後腱伸展',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '腿伸直，背部平直往前傾，不要彈震。',
  },
  {
    id: 'stretch-chest',
    name: '胸部伸展',
    kind: 'time',
    weighted: false,
    lowImpact: true,
    cue: '手扶門框，身體慢慢轉開。',
  },
  {
    id: 'cat-cow',
    name: '貓牛式',
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
    name: '5 分鐘入門活動',
    modes: all,
    minutes: 5,
    note: '低衝擊，每個動作 40 秒',
    items: [
      { exerciseId: 'march', sets: 1, seconds: 40 },
      { exerciseId: 'chair-squat', sets: 1, seconds: 40 },
      { exerciseId: 'wall-pushup', sets: 1, seconds: 40 },
      { exerciseId: 'glute-bridge', sets: 1, seconds: 40 },
    ],
  },
  {
    id: 'home-10',
    name: '10 分鐘全身自重',
    modes: ['home', 'mixed', 'nutrition_first'],
    minutes: 10,
    note: '循環 2 輪',
    items: [
      { exerciseId: 'squat', sets: 2, reps: 12 },
      { exerciseId: 'incline-pushup', sets: 2, reps: 10 },
      { exerciseId: 'reverse-lunge', sets: 2, reps: 10 },
      { exerciseId: 'dead-bug', sets: 2, reps: 10 },
    ],
  },
  {
    id: 'home-15-low',
    name: '15 分鐘站立式低衝擊',
    modes: ['home', 'mixed', 'nutrition_first'],
    minutes: 15,
    note: '不趴地，適合膝蓋或手腕不適者',
    items: [
      { exerciseId: 'march', sets: 3, seconds: 60 },
      { exerciseId: 'chair-squat', sets: 3, reps: 12 },
      { exerciseId: 'wall-pushup', sets: 3, reps: 12 },
      { exerciseId: 'step-up', sets: 3, reps: 10 },
    ],
  },
  {
    id: 'home-20',
    name: '20 分鐘全身自重進階',
    modes: ['home', 'mixed'],
    minutes: 20,
    note: '循環 3 輪',
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
    name: '啞鈴全身 A',
    modes: ['home', 'mixed'],
    minutes: 35,
    note: '每組 8–12 次，保留 2–3 次的力氣',
    items: [
      { exerciseId: 'goblet-squat', sets: 3, reps: 10 },
      { exerciseId: 'db-floor-press', sets: 3, reps: 10 },
      { exerciseId: 'db-row', sets: 3, reps: 10 },
    ],
  },
  {
    id: 'db-b',
    name: '啞鈴全身 B',
    modes: ['home', 'mixed'],
    minutes: 35,
    note: '每組 8–12 次，保留 2–3 次的力氣',
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
    note: '每週 2–3 次與 B 交替；每組 8–12 次',
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
    note: '每週 2–3 次與 A 交替；每組 8–12 次',
    items: [
      { exerciseId: 'hip-thrust', sets: 3, reps: 10 },
      { exerciseId: 'db-press', sets: 3, reps: 10 },
      { exerciseId: 'seated-row', sets: 3, reps: 10 },
      { exerciseId: 'side-plank', sets: 3, seconds: 20 },
    ],
  },
  {
    id: 'walk-20',
    name: '快走 20 分鐘',
    modes: ['outdoor', 'nutrition_first', 'mixed'],
    minutes: 20,
    note: '能說話但不能唱歌的節奏',
    items: [],
    activity: { type: 'walk', minutes: 20 },
  },
  {
    id: 'stretch-10',
    name: '伸展與放鬆 10 分鐘',
    modes: all,
    minutes: 10,
    note: '休息日可做，每個動作 30–60 秒',
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
