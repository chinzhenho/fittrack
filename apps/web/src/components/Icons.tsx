import type { MealItem } from '../data/types';
import { useThumb } from '../data/photoThumbs';

// Line icons in the spirit of Apple's SF Symbols (24 × 24, round caps). Shown white on
// a coloured rounded square, like iOS Settings, or in colour next to a label.

const PATHS = {
  scale:
    'M6 4h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3zM8.5 11a3.5 3.5 0 017 0M12 11l1.6-2',
  flame:
    'M12 3c.8 2.8 4.5 4.6 4.5 9.2A4.5 4.5 0 017.5 12c0-1.9.9-3.2 2-4.2.1 1.7.9 2.8 2 3.2-.3-3 .1-5.6.5-8z',
  drop: 'M12 3.2s6 6.4 6 10.8a6 6 0 01-12 0c0-4.4 6-10.8 6-10.8z',
  trend: 'M3.5 19.5h17M5 15l4.5-4.5 3.5 3.5L19.5 7.5M15 7.5h4.5V12',
  calendar:
    'M5.5 5h13A1.5 1.5 0 0120 6.5v12a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 18.5v-12A1.5 1.5 0 015.5 5zM4 10h16M8 3v4M16 3v4',
  trophy:
    'M8 4h8v5.5a4 4 0 01-8 0V4zM8 6H5.5a3 3 0 003 4M16 6h2.5a3 3 0 01-3 4M12 13.5V17M9 20.5h6M10 17h4',
  leaf: 'M5 19C5 10.5 10 5 19 5c0 9-5.5 14-14 14zM5 19l7.5-7.5',
  target:
    'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9zM12 12.5a.5.5 0 100-1 .5.5 0 000 1z',
  sparkles:
    'M11 3.5l1.7 4.3L17 9.5l-4.3 1.7L11 15.5 9.3 11.2 5 9.5l4.3-1.7zM18 14.5l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8z',
  sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4',
  person: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 20.5a7 7 0 0114 0',
  fork: 'M7 3v8a3 3 0 006 0V3M10 3v18M17 3c-1.5 2-2 4-2 7h4c0-3-.5-5-2-7zm0 7v11',
  check: 'M12 21a9 9 0 100-18 9 9 0 000 18zM8 12.2l2.8 2.8L16.5 9',
  egg: 'M12 3c3.6 0 6.5 5 6.5 10a6.5 6.5 0 01-13 0C5.5 8 8.4 3 12 3z',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4',
  bell: 'M6 16V11a6 6 0 0110.3-4.2M18 11v5l1.5 2h-15M10 21h4M3.5 3.5l17 17',
  lock: 'M7 11V8a5 5 0 0110 0v3M6.5 11h11a1.5 1.5 0 011.5 1.5v7a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 19.5v-7A1.5 1.5 0 016.5 11z',
  download: 'M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14',
  key: 'M14.5 13.5a5 5 0 10-4-4L3.5 16.5V20h3.5v-2h2v-2h2l.5-.5M16 8h.01',
  mail: 'M4.5 6h15A1.5 1.5 0 0121 7.5v9a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 16.5v-9A1.5 1.5 0 014.5 6zM3.5 7l8.5 6 8.5-6',
  calc: 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM8 7h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01',
  question:
    'M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1.1-1.5 2.2M12 17h.01',
  heart: 'M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0112 7.6 4.3 4.3 0 0119.5 10c0 5.4-7.5 10-7.5 10z',
  shield: 'M12 3l7.5 3v5.5c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6z',
  book: 'M5 4.5A1.5 1.5 0 016.5 3H19v15H6.5A1.5 1.5 0 005 19.5v-15zM5 19.5A1.5 1.5 0 006.5 21H19',
  arrowDown: 'M12 4v16M6 14l6 6 6-6',
  arrowUp: 'M12 20V4M6 10l6-6 6 6',
  logout: 'M15 4h3.5A1.5 1.5 0 0120 5.5v13a1.5 1.5 0 01-1.5 1.5H15M10 16l4-4-4-4M14 12H4',
  trash: 'M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5',
  camera:
    'M4 8.5A2 2 0 016 6.5h1.6l1.3-2h6.2l1.3 2H18a2 2 0 012 2V18a2 2 0 01-2 2H6a2 2 0 01-2-2V8.5zM12 16.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
} as const;

export type IconName = keyof typeof PATHS;

export function Glyph({
  name,
  className = 'size-5',
  strokeWidth = 2,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/** White glyph on a coloured rounded square (iOS Settings style). */
export function IconTile({
  name,
  tint,
  size = 'md',
}: {
  name: IconName;
  tint: string;
  size?: 'sm' | 'md';
}) {
  const box = size === 'sm' ? 'size-7 rounded-[7px]' : 'size-8 rounded-[9px]';
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center text-white ${box} ${tint}`}
    >
      <Glyph name={name} className={size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={2.2} />
    </span>
  );
}

// Food icons ---------------------------------------------------------------------

/** First matching keyword wins; Chinese keywords cover entries logged before. */
const FOOD_ICONS: [string, string[]][] = [
  ['🥤', ['cola', 'coke', 'soda', 'sprite', '可乐', '汽水']],
  ['🧋', ['bubble tea', 'boba', 'milk tea', 'teh tarik', '奶茶', '珍珠']],
  ['☕', ['coffee', 'kopi', 'latte', 'cappuccino', 'americano', '咖啡']],
  ['🍵', ['tea', 'teh', 'milo', 'matcha', '茶', '美禄']],
  ['🧃', ['juice', 'smoothie', '果汁']],
  ['🥛', ['milk', 'yogurt', 'yoghurt', '牛奶', '酸奶', '优格']],
  ['🍔', ['burger', '汉堡', '堡']],
  ['🍕', ['pizza', '披萨']],
  ['🌭', ['hot dog', 'sausage', '香肠', '热狗']],
  ['🥪', ['sandwich', 'toast', '三明治', '吐司']],
  [
    '🥟',
    [
      'dumpling',
      'dim sum',
      'siu mai',
      'har gow',
      'gyoza',
      'bao',
      'pau',
      '饺',
      '包子',
      '烧卖',
      '点心',
      '馒头',
    ],
  ],
  ['🫓', ['roti', 'prata', 'naan', 'chapati', 'thosai', 'dosa', '印度煎饼', '煎饼']],
  [
    '🍜',
    [
      'noodle',
      'mee',
      'mi ',
      'laksa',
      'ramen',
      'pho',
      'kway teow',
      'koay teow',
      'bee hoon',
      'udon',
      'pasta',
      'spaghetti',
      'wantan',
      '面',
      '粉',
      '叻沙',
    ],
  ],
  ['🍣', ['sushi', 'sashimi', '寿司']],
  ['🍙', ['onigiri', 'rice ball', '饭团']],
  ['🥣', ['porridge', 'congee', 'bubur', 'oat', 'cereal', 'granola', '粥', '麦片']],
  ['🍛', ['curry', 'rendang', 'nasi', 'biryani', 'kandar', '咖喱', '仁当']],
  ['🍚', ['rice', '饭']],
  ['🍢', ['satay', 'sate', 'skewer', '沙爹', '串']],
  ['🍗', ['chicken', 'ayam', 'wing', 'drumstick', 'nugget', '鸡']],
  ['🥩', ['beef', 'steak', 'mutton', 'lamb', 'daging', 'kambing', 'pork', '牛', '羊', '猪', '肉']],
  ['🐟', ['fish', 'ikan', 'salmon', 'tuna', 'sardine', '鱼']],
  ['🦐', ['prawn', 'shrimp', 'udang', 'sotong', 'squid', 'crab', '虾', '蟹', '鱿鱼']],
  ['🥚', ['egg', 'telur', 'omelette', '蛋']],
  ['🍟', ['fries', 'chips', 'kerepek', '薯条', '薯片']],
  ['🧈', ['tofu', 'tauhu', 'tempeh', '豆腐']],
  ['🥗', ['salad', 'vegetable', 'sayur', 'kangkung', 'broccoli', '沙拉', '菜']],
  ['🍲', ['soup', 'sup', 'stew', '汤']],
  ['🍰', ['cake', 'kek', '蛋糕']],
  ['🍪', ['cookie', 'biscuit', 'kuih', 'kueh', '饼干', '糕']],
  ['🍫', ['chocolate', '巧克力']],
  ['🍦', ['ice cream', 'aiskrim', 'cendol', 'ais kacang', '冰淇淋', '雪糕']],
  ['🍌', ['banana', 'pisang', '香蕉']],
  ['🍎', ['apple', 'epal', '苹果']],
  ['🍉', ['watermelon', 'tembikai', '西瓜']],
  ['🍊', ['orange', 'oren', '橙']],
  ['🥭', ['mango', 'mangga', '芒果']],
  ['🍇', ['grape', 'fruit', 'buah', '葡萄', '水果']],
  ['🥜', ['nut', 'peanut', 'almond', 'kacang', '花生', '坚果']],
  ['🍞', ['bread', 'roti bakar', 'bun', '面包']],
];

/**
 * Latin keywords must start a word ("tea" must not match "steak"); a trailing space
 * means the whole word ("mi " is mee/mi, not milk). Chinese keywords match anywhere.
 */
const MATCHERS = FOOD_ICONS.map(([icon, words]) => ({
  icon,
  tests: words.map((w) =>
    /[a-z]/.test(w)
      ? new RegExp(
          `\\b${w.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${w.endsWith(' ') ? '\\b' : ''}`,
        )
      : w,
  ),
}));

export function foodEmoji(name: string): string {
  const n = name.toLowerCase();
  for (const { icon, tests } of MATCHERS) {
    if (tests.some((t) => (typeof t === 'string' ? n.includes(t) : t.test(n)))) return icon;
  }
  return '🍽️';
}

/** The photo the item was logged from (this device only), else an icon for the food. */
export function FoodThumb({ item, size = 'size-11' }: { item: MealItem; size?: string }) {
  const thumb = useThumb(item.id);
  return thumb ? (
    <img
      src={thumb}
      alt=""
      className={`${size} shrink-0 rounded-[12px] object-cover ring-1 ring-black/5`}
    />
  ) : (
    <span
      aria-hidden="true"
      className={`${size} flex shrink-0 items-center justify-center rounded-[12px] bg-slate-100 text-[1.375rem] dark:bg-slate-700`}
    >
      {foodEmoji(item.name)}
    </span>
  );
}
