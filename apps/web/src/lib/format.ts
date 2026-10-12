const int = new Intl.NumberFormat('zh-Hans', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('zh-Hans', { maximumFractionDigits: 1 });

export const fmtInt = (n: number) => int.format(n);
export const fmt1 = (n: number) => one.format(n);
