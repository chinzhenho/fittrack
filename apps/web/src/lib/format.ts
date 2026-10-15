const int = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 1 });

export const fmtInt = (n: number) => int.format(n);
export const fmt1 = (n: number) => one.format(n);
