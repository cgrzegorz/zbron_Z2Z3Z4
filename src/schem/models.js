// Modele matematyczne używane w wykresach i ćwiczeniach.

export const rcCurrent = (U, R, tau) => (t) => (U / R) * Math.exp(-t / tau);
export const rcVoltage = (U, tau) => (t) => U * (1 - Math.exp(-t / tau));
export const rcResistorV = (U, tau) => (t) => U * Math.exp(-t / tau);

// Element nieliniowy opisany funkcją U(I) (monotoniczną).
export const ELEMENTS = {
  lamp: { name: 'żarówka', U: (I) => 15 * I + 300 * I ** 3, dU: (I) => 15 + 900 * I ** 2, Imax: 0.3, note: 'r > R (włókno się nagrzewa)' },
  diode: { name: 'dioda (kierunek przewodzenia)', U: (I) => 0.9 * Math.log(1 + I / 0.002), dU: (I) => 0.9 / (I + 0.002), Imax: 0.3, note: 'r < R' },
  resistor: { name: 'rezystor liniowy', U: (I) => 30 * I, dU: () => 30, Imax: 0.3, note: 'R = r = const' },
};

/** Odwrócenie U(I) → I(U) metodą bisekcji. */
export function invert(Ufn, U, Imax = 5) {
  let a = 0;
  let b = Imax;
  if (U <= 0) return 0;
  while (Ufn(b) < U && b < 1e3) b *= 2;
  for (let k = 0; k < 60; k++) {
    const m = (a + b) / 2;
    if (Ufn(m) < U) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

/** Losowa charakterystyka typu "żarówka": U = a·I + b·I³ */
export function randomNonlinear(rnd, kind = 'lamp') {
  // 'lamp' – silnie nieliniowy, 'soft' – bliższy liniowemu
  const a = kind === 'lamp' ? rnd(6, 14) : rnd(25, 40);
  const b = kind === 'lamp' ? rnd(250, 450) : rnd(40, 120);
  return { a, b, U: (I) => a * I + b * I ** 3 };
}

// --- liczby zespolone ---
export const cx = (re, im = 0) => ({ re, im });
export const cadd = (a, b) => cx(a.re + b.re, a.im + b.im);
export const csub = (a, b) => cx(a.re - b.re, a.im - b.im);
export const cmul = (a, b) => cx(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
export const cscale = (a, k) => cx(a.re * k, a.im * k);
export const cdiv = (a, b) => {
  const d = b.re * b.re + b.im * b.im;
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
export const cabs = (a) => Math.hypot(a.re, a.im);

export function seriesZ(Z1, Z2, ZM, agree) {
  return cadd(cadd(Z1, Z2), cscale(ZM, agree ? 2 : -2));
}
export function parallelZ(Z1, Z2, ZM, agree) {
  const num = csub(cmul(Z1, Z2), cmul(ZM, ZM));
  const den = cadd(cadd(Z1, Z2), cscale(ZM, agree ? -2 : 2));
  return cdiv(num, den);
}
