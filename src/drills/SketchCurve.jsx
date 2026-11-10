import { useMemo, useRef, useState } from 'react';
import { Plot, usePlotScales, pathFrom, sampleFn, svgPoint } from '../schem/Plot.jsx';
import { randomNonlinear, invert } from '../schem/models.js';
import { pick } from '../lib/random.js';
import { Rich, SvgTex } from '../lib/Tex.jsx';

const W = 560;
const H = 330;
const PAD = { l: 70, r: 24, t: 22, b: 40 };

export function sketchKinds(allowed) {
  const kinds = [];
  if (allowed.has('Z2')) kinds.push('i', 'uC', 'uR');
  if (allowed.has('Z3')) kinds.push('ser', 'par');
  if (!kinds.length) kinds.push('i', 'uC', 'uR', 'ser', 'par');
  return kinds;
}

function makeTask(allowed, item) {
  const kind = item ?? pick(sketchKinds(allowed));

  if (kind === 'i' || kind === 'uC' || kind === 'uR') {
    const f = kind === 'uC' ? (x) => 1 - Math.exp(-x) : (x) => Math.exp(-x);
    const labels = {
      i: { title: 'Narysuj przebieg prądu ładowania $i(t)$', y: 'i', lvl: String.raw`I_0 = \frac{U}{R}`, q: 'z2.1', checkAt: 1, expect: 0.368, expectTxt: String.raw`0{,}368\,I_0` },
      uC: { title: 'Narysuj przebieg napięcia na kondensatorze $u_C(t)$', y: 'u_C', lvl: 'U', q: 'z2.2', checkAt: 1, expect: 0.632, expectTxt: String.raw`0{,}632\,U` },
      uR: { title: 'Narysuj przebieg napięcia na rezystorze $u_R(t)$ podczas ładowania', y: 'u_R', lvl: 'U', q: 'z2.2', checkAt: 1, expect: 0.368, expectTxt: String.raw`0{,}368\,U` },
    }[kind];
    return {
      kind,
      q: labels.q,
      title: labels.title,
      hint: String.raw`Rysuj jednym pociągnięciem od $t = 0$ do $5\tau$. Zwróć uwagę, przez jaki punkt krzywa przechodzi w $t = \tau$.`,
      x: [0, 5.3],
      y: [0, 1.15],
      xLabel: '$t$',
      yLabel: `$${labels.y}$`,
      xTicks: [0, 1, 2, 3, 4, 5].map((k) => ({ v: k, label: k === 0 ? '$0$' : k === 1 ? String.raw`$\tau$` : String.raw`$${k}\tau$` })),
      yTicks: [{ v: 1, label: `$${labels.lvl}$` }],
      guides: [{ y: 1 }],
      given: [],
      truth: sampleFn(f, 0, 5.3, 160),
      checks: [
        { x: 0, expect: f(0), txt: kind === 'uC' ? 'start w zerze (prawo komutacji)' : `start z poziomu $${labels.lvl}$` },
        { x: labels.checkAt, expect: labels.expect, txt: String.raw`w $t = \tau$ wartość $${labels.expectTxt}$` },
        { x: 4.5, expect: f(4.5), txt: kind === 'uC' ? 'dojście do asymptoty $U$' : String.raw`zanik do zera po $(3 \div 5)\tau$` },
      ],
    };
  }

  // Z3.2 – charakterystyki zastępcze z losowymi elementami
  const rnd = (a, b) => a + Math.random() * (b - a);
  const [k1, k2] = Math.random() < 0.5 ? ['lamp', 'soft'] : ['soft', 'lamp'];
  const n1 = randomNonlinear(rnd, k1);
  const n2 = randomNonlinear(rnd, k2);
  const Imax = 0.3;
  if (kind === 'ser') {
    const Umax = n1.U(Imax) + n2.U(Imax);
    const c1 = sampleFn((I) => I, 0, Imax, 80).map(([I]) => [n1.U(I), I]);
    const c2 = sampleFn((I) => I, 0, Imax, 80).map(([I]) => [n2.U(I), I]);
    const truth = sampleFn((I) => I, 0, Imax, 120).map(([I]) => [n1.U(I) + n2.U(I), I]);
    const step = Umax > 40 ? 10 : 5;
    return {
      kind,
      q: 'z3.2',
      title: 'Narysuj charakterystykę zastępczą połączenia SZEREGOWEGO $N_1 + N_2$',
      hint: 'Wybierz kilka prądów (kreski poziome), dodaj napięcia $U_1 + U_2$ i połącz punkty.',
      x: [0, Umax * 1.05],
      y: [0, 0.34],
      xLabel: 'U [V]',
      yLabel: 'I [A]',
      xTicks: Array.from({ length: Math.floor((Umax * 1.05) / step) + 1 }, (_, i) => ({ v: i * step, label: String(i * step) })),
      yTicks: [0.1, 0.2, 0.3].map((v) => ({ v, label: String(v).replace('.', ',') })),
      grid: true,
      given: [
        { pts: c1, cls: 'c-n1', label: 'N_1' },
        { pts: c2, cls: 'c-n2', label: 'N_2' },
      ],
      truth,
      checks: [0.1, 0.2, 0.28].map((I) => ({ yAt: I, expectX: n1.U(I) + n2.U(I), txt: `przy $I = ${String(I).replace('.', '{,}')}$ A: $U = U_1 + U_2$` })),
    };
  }
  // równolegle
  const Umax = Math.min(n1.U(Imax), n2.U(Imax)) * 0.9;
  const I1 = (U) => invert(n1.U, U);
  const I2 = (U) => invert(n2.U, U);
  const c1 = sampleFn(I1, 0, Umax, 80);
  const c2 = sampleFn(I2, 0, Umax, 80);
  const truth = sampleFn((U) => I1(U) + I2(U), 0, Umax, 120);
  const yMax = (I1(Umax) + I2(Umax)) * 1.1;
  const step = Umax > 10 ? 2 : 1;
  return {
    kind,
    q: 'z3.2',
    title: String.raw`Narysuj charakterystykę zastępczą połączenia RÓWNOLEGŁEGO $N_1 \parallel N_2$`,
    hint: 'Wybierz kilka napięć (kreski pionowe), dodaj prądy $I_1 + I_2$ i połącz punkty.',
    x: [0, Umax * 1.05],
    y: [0, yMax],
    xLabel: 'U [V]',
    yLabel: 'I [A]',
    xTicks: Array.from({ length: Math.floor((Umax * 1.05) / step) + 1 }, (_, i) => ({ v: i * step, label: String(i * step) })),
    yTicks: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6].filter((v) => v < yMax).map((v) => ({ v, label: String(v).replace('.', ',') })),
    grid: true,
    given: [
      { pts: c1, cls: 'c-n1', label: 'N_1' },
      { pts: c2, cls: 'c-n2', label: 'N_2' },
    ],
    truth,
    checks: [0.3, 0.6, 0.9].map((f) => ({ x: Umax * f, expect: I1(Umax * f) + I2(Umax * f), txt: `przy $U = ${(Umax * f).toFixed(1).replace('.', '{,}')}$ V: $I = I_1 + I_2$` })),
  };
}

/** Punkty kontrolne poprawnej krzywej (pokazywane po odsłonięciu). */
function checkPoints(task) {
  return task.checks.map((c) => (c.yAt != null ? [c.expectX, c.yAt] : [c.x, c.expect]));
}

export function SketchCurve({ allowed, onDone, item }) {
  const task = useMemo(() => makeTask(allowed, item), []);
  const [strokes, setStrokes] = useState([]);
  const pts = useMemo(() => strokes.flat(), [strokes]);
  const drawing = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [marks, setMarks] = useState(() => task.checks.map(() => false));
  const [verdict, setVerdict] = useState(null); // null | true | false
  const svgRef = useRef(null);
  const sc = usePlotScales({ w: W, h: H, pad: PAD, x: task.x, y: task.y });
  const cps = useMemo(() => checkPoints(task), [task]);

  const toData = (e) => {
    const p = svgPoint(svgRef.current, e);
    return [sc.ix(p.x), sc.iy(p.y)];
  };
  const down = (e) => {
    if (revealed) return;
    e.preventDefault();
    svgRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    setStrokes((old) => [...old, [toData(e)]]);
  };
  const move = (e) => {
    if (!drawing.current || revealed) return;
    const d = toData(e);
    setStrokes((old) => [...old.slice(0, -1), [...old[old.length - 1], d]]);
  };
  const up = () => {
    drawing.current = false;
  };

  const allMarked = marks.every(Boolean);
  const finish = (ok) => {
    if (verdict != null) return;
    setVerdict(ok);
    onDone?.(ok, task.q, task.kind);
  };

  return (
    <div className="drill">
      <h3 className="drill-title">
        <Rich text={task.title} />
      </h3>
      <p className="muted">
        <Rich text={task.hint} />
      </p>
      <div className="sketch-wrap">
        <Plot
          w={W}
          h={H}
          pad={PAD}
          x={task.x}
          y={task.y}
          xLabel={task.xLabel}
          yLabel={task.yLabel}
          xTicks={task.xTicks}
          yTicks={task.yTicks}
          grid={task.grid}
          svgRef={svgRef}
          className="sketch"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          style={{ touchAction: 'none' }}
        >
          {({ sx, sy }) => (
            <g>
              {(task.guides || []).map((g, i) => (
                <line key={i} x1={sx(task.x[0])} x2={sx(task.x[1])} y1={sy(g.y)} y2={sy(g.y)} className="plot-guide" />
              ))}
              {task.given.map((c, i) => (
                <g key={i}>
                  <path d={pathFrom(c.pts, sx, sy)} className={`plot-curve ${c.cls}`} />
                  <SvgTex x={sx(c.pts[c.pts.length - 1][0]) + 4} y={sy(c.pts[c.pts.length - 1][1])} tex={c.label} valign="middle" className={`${c.cls}-t`} size={15} />
                </g>
              ))}
              {strokes.map((st, i) => (st.length > 1 ? <path key={'u' + i} d={pathFrom(st, sx, sy)} className="plot-user" /> : null))}
              {revealed && <path d={pathFrom(task.truth, sx, sy)} className="plot-curve c-truth" />}
              {revealed &&
                cps.map(([x, y], i) => (
                  <g key={'cp' + i}>
                    <circle cx={sx(x)} cy={sy(y)} r={5} className="sketch-cp" />
                    <text x={sx(x) + 8} y={sy(y) - 8} className="sketch-cp-t">
                      {i + 1}
                    </text>
                  </g>
                ))}
            </g>
          )}
        </Plot>
      </div>
      {!revealed && (
        <div className="row">
          <button onClick={() => setStrokes([])} disabled={!pts.length}>
            Wyczyść
          </button>
          <button className="primary" onClick={() => setRevealed(true)}>
            {pts.length ? 'Pokaż poprawną krzywą' : 'Rysowałem na kartce – pokaż krzywą'}
          </button>
        </div>
      )}
      {revealed && (
        <div className={`feedback ${verdict == null ? '' : verdict ? 'ok' : 'bad'}`}>
          <div>
            <p>
              <b>Porównaj sam:</b> <span className="truth-key">zielona</span> linia to przebieg poprawny,{' '}
              <span className="user-key">Twoja</span> – narysowana ręcznie. Liczy się <b>kształt i kluczowe punkty</b>, nie idealna gładkość linii.
            </p>
            <p className="muted small">Zaznacz, co Twój rysunek zawiera (numery odpowiadają kropkom na wykresie):</p>
            <ul className="rubric">
              {task.checks.map((c, i) => (
                <li key={i}>
                  <label className={marks[i] ? 'on' : ''}>
                    <input
                      type="checkbox"
                      disabled={verdict != null}
                      checked={marks[i]}
                      onChange={(e) => setMarks(marks.map((m, j) => (j === i ? e.target.checked : m)))}
                    />
                    <b>{i + 1}.</b> <Rich text={c.txt} />
                  </label>
                </li>
              ))}
            </ul>
            {verdict == null ? (
              <div className="row">
                <button className="primary" onClick={() => finish(allMarked)}>
                  {allMarked ? '✓ Mój wykres się zgadza' : 'Zatwierdź samoocenę'}
                </button>
                <button onClick={() => finish(false)}>✗ Nie zgadza się</button>
              </div>
            ) : (
              <p>
                <b>{verdict ? 'Zaliczone – to zadanie nie wróci w tej rundzie.' : 'Wróci jeszcze w tej rundzie – spróbuj ponownie później.'}</b>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
