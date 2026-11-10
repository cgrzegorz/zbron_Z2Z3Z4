export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}
export function weightedPick(items, weightFn) {
  const w = items.map(weightFn);
  const total = w.reduce((s, x) => s + x, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= w[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
/** Format number in Polish style (comma decimal). */
export function fmt(x, digits = 3) {
  if (!isFinite(x)) return '—';
  const abs = Math.abs(x);
  let s;
  if (abs !== 0 && (abs < 0.001 || abs >= 1e6)) s = x.toExponential(2);
  else s = Number(x.toPrecision(digits)).toString();
  return s.replace('.', ',');
}
export function parseNum(str) {
  if (str == null) return NaN;
  const s = String(str).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '') return NaN;
  return Number(s);
}
