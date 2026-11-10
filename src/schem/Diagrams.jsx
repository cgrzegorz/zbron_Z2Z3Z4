import { useMemo, useState } from 'react';
import { Plot, pathFrom, sampleFn } from './Plot.jsx';
import { Schematic } from './Schematic.jsx';
import { CIRCUITS, NL_CONNECTIONS, RC_BRANCH } from './circuits.js';
import { ELEMENTS, invert, cx, cabs, seriesZ, parallelZ } from './models.js';
import { Tex, SvgTex, Rich } from '../lib/Tex.jsx';
import { fmt } from '../lib/random.js';

function Slider({ label, value, min, max, step, onChange, display }) {
  return (
    <label className="slider">
      <span className="slider-l">{typeof label === 'string' && label.startsWith('$') ? <Tex tex={label.slice(1, -1)} /> : label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="slider-v">{display ?? value}</span>
    </label>
  );
}

/* ---------------- Z2.1 / Z2.2: ładowanie kondensatora ---------------- */
/** „Ładne” podziałki 0…max (krok 1·2·5·10ⁿ), ok. 5–8 kresek. */
function niceTicks(max) {
  const raw = max / 6;
  const p = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw);
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Number(v.toPrecision(10)));
  return out;
}

export function RCPlot({ mode = 'current', interactive = false }) {
  const [U, setU] = useState(30);
  const [Rk, setRk] = useState(1000); // kΩ
  const [Cu, setCu] = useState(15); // µF
  const [tcur, setTcur] = useState(1);
  const [show, setShow] = useState({ uC: true, uR: true, i: true, tangent: true });
  const [normalized, setNormalized] = useState(true);

  const R = Rk * 1e3;
  const C = Cu * 1e-6;
  const tau = R * C;
  const I0 = U / R;

  // Krzywa jest ZAWSZE rysowana w jednostkach znormalizowanych (t/τ, i/I₀, u/U),
  // więc zmiana U, R, C jej nie przesuwa – zmieniają się tylko wartości na osiach.
  const tMax = 5.4;
  const toT = (x) => x * tau; // x na osi (w τ) → sekundy
  const xTau = 1;

  const isCur = mode === 'current';
  const yMax = 1.12;
  // y znormalizowane: prąd /I0, napięcie /U
  const curves = [];
  if (isCur) {
    curves.push({ key: 'i', f: (x) => Math.exp(-toT(x) / tau), cls: 'c-i', label: 'i(t)' });
  } else {
    if (show.uC) curves.push({ key: 'uC', f: (x) => 1 - Math.exp(-toT(x) / tau), cls: 'c-uc', label: 'u_C(t)' });
    if (show.uR) curves.push({ key: 'uR', f: (x) => Math.exp(-toT(x) / tau), cls: 'c-ur dashed', label: 'u_R(t)' });
    if (show.i) curves.push({ key: 'i', f: (x) => 0.92 * Math.exp(-toT(x) / tau), cls: 'c-i dashed2', label: 'i(t)' });
  }

  const xTicks = normalized
    ? [0, 1, 2, 3, 4, 5].map((k) => ({ v: k, label: k === 0 ? '$0$' : k === 1 ? String.raw`$\tau$` : String.raw`$${k}\tau$` }))
    : niceTicks(tMax * tau).map((sec) => ({ v: sec / tau, label: fmt(sec) }));
  const I0u = I0 * 1e6;
  const yTicks = isCur
    ? normalized
      ? [{ v: 1, label: String.raw`$I_0 = \frac{U}{R}$` }, { v: 0.368, label: String.raw`$0{,}368\,I_0$` }]
      : [{ v: 1, label: `${fmt(I0u)} µA` }, { v: 0.368, label: `${fmt(0.368 * I0u)} µA` }]
    : normalized
      ? [{ v: 1, label: '$U$' }, { v: 0.632, label: String.raw`$0{,}632\,U$` }, { v: 0.368, label: String.raw`$0{,}368\,U$` }]
      : [{ v: 1, label: `${fmt(U)} V` }, { v: 0.632, label: `${fmt(0.632 * U)} V` }, { v: 0.368, label: `${fmt(0.368 * U)} V` }];

  const tc = tcur; // pozycja kursora w jednostkach osi (τ)
  const tcSec = toT(tc);

  return (
    <div className="diagram">
      <Plot
        w={560}
        h={310}
        pad={{ l: 92, r: 20, t: 20, b: 40 }}
        x={[0, tMax]}
        y={[0, yMax]}
        xLabel={normalized ? '$t$' : String.raw`$t\ [\text{s}]$`}
        yLabel={isCur ? '$i$' : String.raw`$u,\ i$`}
        xTicks={xTicks}
        yTicks={yTicks}
      >
        {({ sx, sy }) => (
          <g>
            {/* asymptota */}
            {!isCur && <line x1={sx(0)} x2={sx(tMax)} y1={sy(1)} y2={sy(1)} className="plot-guide" />}
            {/* τ */}
            {xTau <= tMax && (
              <>
                <line x1={sx(xTau)} x2={sx(xTau)} y1={sy(0)} y2={sy(isCur ? 0.368 : 0.632)} className="plot-guide" />
                <line x1={sx(0)} x2={sx(xTau)} y1={sy(isCur ? 0.368 : 0.632)} y2={sy(isCur ? 0.368 : 0.632)} className="plot-guide" />
                {!normalized && (
                  <SvgTex x={sx(xTau) + 4} y={sy(0) - 3} tex={String.raw`\tau = ${fmt(tau)}\,\text{s}`} size={13} />
                )}
              </>
            )}
            {/* styczna w t=0 */}
            {show.tangent && xTau <= tMax && (
              <line
                x1={sx(0)}
                y1={sy(isCur ? 1 : 0)}
                x2={sx(xTau)}
                y2={sy(isCur ? 0 : 1)}
                className="plot-tangent"
              />
            )}
            {curves.map((c) => (
              <path key={c.key} d={pathFrom(sampleFn(c.f, 0, tMax, 200), sx, sy)} className={`plot-curve ${c.cls}`} />
            ))}
            {interactive &&
              curves.map((c) => {
                const yv = c.f(tc);
                return <circle key={'p' + c.key} cx={sx(tc)} cy={sy(yv)} r={5} className={`plot-pt ${c.cls}`} />;
              })}
            {interactive && <line x1={sx(tc)} x2={sx(tc)} y1={sy(0)} y2={sy(yMax)} className="plot-cursor" />}
            {!interactive && isCur && (
              <SvgTex x={sx(1.5)} y={sy(0.5)} tex={String.raw`i(t) = \frac{U}{R}\,e^{-t/\tau}`} size={16} />
            )}
            {!interactive && !isCur && (
              <>
                <SvgTex x={sx(2.3)} y={sy(0.8)} tex={String.raw`u_C = U\left(1 - e^{-t/\tau}\right)`} valign="top" className="c-uc-t" size={16} />
                <SvgTex x={sx(1.3)} y={sy(0.34)} tex={String.raw`u_R = U\,e^{-t/\tau}`} className="c-ur-t" size={16} />
              </>
            )}
            {show.tangent && (
              <text x={sx(0.55)} y={sy(isCur ? 0.6 : 0.42)} className="plot-note small">
                styczna
              </text>
            )}
          </g>
        )}
      </Plot>

      {interactive && (
        <div className="controls">
          <Slider label="$U$" value={U} min={5} max={50} step={1} onChange={setU} display={`${U} V`} />
          <Slider label="$R$" value={Rk} min={100} max={2000} step={50} onChange={setRk} display={Rk >= 1000 ? `${fmt(Rk / 1000)} MΩ` : `${Rk} kΩ`} />
          <Slider label="$C$" value={Cu} min={1} max={40} step={1} onChange={setCu} display={`${Cu} µF`} />
          <Slider
            label="$t$"
            value={tcur}
            min={0}
            max={5}
            step={0.05}
            onChange={setTcur}
            display={`${fmt(tcur, 2)} τ`}
          />
          <div className="readout">
            <span>
              <Tex tex={String.raw`\tau = RC =`} /> <b>{fmt(tau)} s</b>
            </span>
            <span>
              <Tex tex={String.raw`I_0 = \frac{U}{R} =`} /> <b>{fmt(I0 * 1e6)} µA</b>
            </span>
            <span>
              <Tex tex="t =" /> <b>{fmt(tcSec)} s</b>
            </span>
            {isCur ? (
              <span>
                <Tex tex="i(t) =" /> <b>{fmt(I0 * 1e6 * Math.exp(-tcSec / tau))} µA</b> ({fmt(100 * Math.exp(-tcSec / tau), 3)}% <Tex tex="I_0" />)
              </span>
            ) : (
              <span>
                <Tex tex="u_C(t) =" /> <b>{fmt(U * (1 - Math.exp(-tcSec / tau)))} V</b> ({fmt(100 * (1 - Math.exp(-tcSec / tau)), 3)}% <Tex tex="U" />)
              </span>
            )}
          </div>
          <div className="toggles">
            <label>
              <input type="checkbox" checked={normalized} onChange={(e) => setNormalized(e.target.checked)} /> oś czasu w jednostkach <Tex tex="\tau" />
            </label>
            <label>
              <input type="checkbox" checked={show.tangent} onChange={(e) => setShow({ ...show, tangent: e.target.checked })} /> styczna w t = 0
            </label>
            {!isCur && (
              <>
                <label>
                  <input type="checkbox" checked={show.uR} onChange={(e) => setShow({ ...show, uR: e.target.checked })} /> <Tex tex="u_R" />
                </label>
                <label>
                  <input type="checkbox" checked={show.i} onChange={(e) => setShow({ ...show, i: e.target.checked })} /> i
                </label>
              </>
            )}
          </div>
          <p className="hint">
            <Rich
              text={String.raw`Zauważ: kształt krzywej **nigdy się nie zmienia** – suwak $t$ przesuwa tylko punkt. Zmiana $R$ lub $C$ zmienia jedynie **skalę osi czasu** ($\tau = RC$), a zmiana $U$ – skalę osi napięcia/prądu. Odznacz „oś w $\tau$”, aby zobaczyć wartości w sekundach i ${isCur ? 'µA' : 'V'}.`}
            />
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Z3.1: rezystancja statyczna i dynamiczna ---------------- */
export function ResistancePlot({ interactive = false }) {
  const [elKey, setElKey] = useState('lamp');
  const [Iop, setIop] = useState(0.14);
  const el = ELEMENTS[elKey];
  const Uop = el.U(Iop);
  const r = el.dU(Iop);
  const R = Uop / Iop;
  const Umax = 13.5;
  const Imax = 0.34;
  const pts = sampleFn((I) => I, 0, el.Imax, 150).map(([I]) => [el.U(I), I]);
  // styczna: U = Uop + r (I - Iop)  → I = Iop + (U - Uop)/r
  const tanI = (U) => Iop + (U - Uop) / r;
  const dI = 0.04;
  return (
    <div className="diagram">
      <Plot w={540} h={320} x={[0, Umax]} y={[0, Imax]} xLabel="$U$" yLabel="$I$" xTicks={[]} yTicks={[]}>
        {({ sx, sy }) => {
          const tA = [Math.max(0, Uop - r * 0.12), tanI(Math.max(0, Uop - r * 0.12))];
          const tB = [Math.min(Umax, Uop + r * 0.12), tanI(Math.min(Umax, Uop + r * 0.12))];
          // kąt α – między sieczną a osią I (pionową)
          const angS = Math.atan2(sy(Iop) - sy(0), sx(Uop) - sx(0));
          const angV = -Math.PI / 2;
          const rad = 46;
          const arcA = `M${sx(0)} ${sy(0) - rad} A${rad} ${rad} 0 0 1 ${sx(0) + rad * Math.cos(angS)} ${sy(0) + rad * Math.sin(angS)}`;
          // β – między styczną a kierunkiem osi I (pionowa linia w punkcie pracy)
          const angT = Math.atan2(sy(tB[1]) - sy(Iop), sx(tB[0]) - sx(Uop));
          const radB = 34;
          const arcB = `M${sx(Uop)} ${sy(Iop) - radB} A${radB} ${radB} 0 0 1 ${sx(Uop) + radB * Math.cos(angT)} ${sy(Iop) + radB * Math.sin(angT)}`;
          return (
            <g>
              <path d={pathFrom(pts, sx, sy)} className="plot-curve c-i" />
              {/* sieczna */}
              <line x1={sx(0)} y1={sy(0)} x2={sx(Uop * 1.25)} y2={sy(Iop * 1.25)} className="plot-secant" />
              <text x={sx(Uop * 1.25) + 4} y={sy(Iop * 1.25)} className="plot-note c-sec-t">sieczna</text>
              {/* styczna */}
              <line x1={sx(tA[0])} y1={sy(tA[1])} x2={sx(tB[0])} y2={sy(tB[1])} className="plot-tangent2" />
              <text x={sx(tB[0]) + 4} y={sy(tB[1]) + 12} className="plot-note c-tan-t">styczna</text>
              {/* pomocnicze */}
              <line x1={sx(Uop)} x2={sx(Uop)} y1={sy(0)} y2={sy(Iop)} className="plot-guide" />
              <line x1={sx(0)} x2={sx(Uop)} y1={sy(Iop)} y2={sy(Iop)} className="plot-guide" />
              <line x1={sx(Uop)} x2={sx(Uop)} y1={sy(Iop)} y2={sy(Iop + 0.08)} className="plot-guide" />
              <text x={sx(Uop)} y={sy(0) + 16} textAnchor="middle" className="plot-tick">U</text>
              <text x={sx(0) - 8} y={sy(Iop)} textAnchor="end" dominantBaseline="middle" className="plot-tick">I</text>
              {/* trójkąt ΔU ΔI */}
              <path
                d={`M${sx(Uop)} ${sy(Iop)} L${sx(Uop + r * dI)} ${sy(Iop)} L${sx(Uop + r * dI)} ${sy(Iop + dI)}`}
                className="plot-delta"
                fill="none"
              />
              <SvgTex x={sx(Uop + (r * dI) / 2)} y={sy(Iop) + 3} tex={String.raw`\Delta U`} anchor="middle" valign="top" size={13} />
              <SvgTex x={sx(Uop + r * dI) + 4} y={sy(Iop + dI / 2)} tex={String.raw`\Delta I`} valign="middle" size={13} />
              <path d={arcA} className="plot-angle" fill="none" />
              <SvgTex x={sx(0) + 14} y={sy(0) - rad - 2} tex={String.raw`\alpha`} size={15} />
              <path d={arcB} className="plot-angle b" fill="none" />
              <SvgTex x={sx(Uop) + 10} y={sy(Iop) - radB} tex={String.raw`\beta`} size={15} />
              <circle cx={sx(Uop)} cy={sy(Iop)} r={5.5} className="plot-pt c-i" />
              <text x={sx(Uop) - 8} y={sy(Iop) + 18} textAnchor="end" className="plot-note small">punkt pracy</text>
            </g>
          );
        }}
      </Plot>
      {interactive && (
        <div className="controls">
          <div className="seg">
            {Object.entries(ELEMENTS).map(([k, v]) => (
              <button key={k} className={k === elKey ? 'on' : ''} onClick={() => setElKey(k)}>
                {v.name}
              </button>
            ))}
          </div>
          <Slider label="$I$" value={Iop} min={0.05} max={0.28} step={0.005} onChange={setIop} display={`${fmt(Iop, 3)} A`} />
          <div className="readout">
            <span>
              <Tex tex="U =" /> <b>{fmt(Uop)} V</b>
            </span>
            <span>
              <Tex tex={String.raw`R = \frac{U}{I} =`} /> <b>{fmt(R)} Ω</b>
            </span>
            <span>
              <Tex tex={String.raw`r = \frac{dU}{dI} =`} /> <b>{fmt(r)} Ω</b>
            </span>
            <span className={r > R * 1.01 ? 'tag up' : r < R * 0.99 ? 'tag down' : 'tag'}>
              <Tex tex={r > R * 1.01 ? 'r > R' : r < R * 0.99 ? 'r < R' : 'r = R'} /> – {el.note}
            </span>
          </div>
          <p className="hint">Przesuwaj punkt pracy. Sieczna zawsze przechodzi przez (0,0), styczna tylko „dotyka” krzywej.</p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Z3.2: charakterystyki zastępcze ---------------- */
const N1 = (I) => 12 * I + 150 * I ** 3;
const N2 = (I) => 30 * I + 60 * I ** 2;

export function CharacteristicsPlot({ mode = 'series', interactive = false, n1 = N1, n2 = N2 }) {
  const isSeries = mode === 'series';
  const [p, setP] = useState(isSeries ? 0.2 : 4);
  const [showFull, setShowFull] = useState(!interactive);
  const Imax = 0.3;
  const Umax = isSeries ? n1(Imax) + n2(Imax) + 1 : 8;
  const I1u = (U) => invert(n1, U);
  const I2u = (U) => invert(n2, U);
  const IparMax = I1u(Umax) + I2u(Umax);
  const yMax = isSeries ? 0.34 : Math.max(0.34, IparMax * 1.08);
  const xMax = isSeries ? Umax : Umax + 0.5;

  const c1 = isSeries ? sampleFn((I) => I, 0, Imax, 100).map(([I]) => [n1(I), I]) : sampleFn((U) => I1u(U), 0, Umax, 100);
  const c2 = isSeries ? sampleFn((I) => I, 0, Imax, 100).map(([I]) => [n2(I), I]) : sampleFn((U) => I2u(U), 0, Umax, 100);
  const lim = showFull ? (isSeries ? Imax : Umax) : p;
  const cr = isSeries
    ? sampleFn((I) => I, 0, lim, 100).map(([I]) => [n1(I) + n2(I), I])
    : sampleFn((U) => I1u(U) + I2u(U), 0, lim, 100);

  const xTicks = (isSeries ? [0, 4, 8, 12, 16, 20] : [0, 1, 2, 3, 4, 5, 6, 7, 8]).filter((v) => v <= xMax).map((v) => ({ v, label: String(v) }));
  const yTicks = [0.1, 0.2, 0.3, 0.4, 0.5].filter((v) => v < yMax).map((v) => ({ v, label: fmt(v) }));

  let construction = null;
  if (isSeries) {
    const I = p;
    const U1 = n1(I);
    const U2 = n2(I);
    construction = { I, U1, U2, U: U1 + U2 };
  } else {
    const U = p;
    const I1 = I1u(U);
    const I2 = I2u(U);
    construction = { U, I1, I2, I: I1 + I2 };
  }

  return (
    <div className="diagram">
      <Plot w={560} h={320} x={[0, xMax]} y={[0, yMax]} xLabel={String.raw`$U\ [\text{V}]$`} yLabel={String.raw`$I\ [\text{A}]$`} xTicks={xTicks} yTicks={yTicks} grid>
        {({ sx, sy }) => (
          <g>
            <path d={pathFrom(c1, sx, sy)} className="plot-curve c-n1" />
            <path d={pathFrom(c2, sx, sy)} className="plot-curve c-n2" />
            <path d={pathFrom(cr, sx, sy)} className="plot-curve c-res" />
            <SvgTex x={sx(c1[c1.length - 1][0]) + 4} y={sy(c1[c1.length - 1][1])} tex="N_1" valign="middle" className="c-n1-t" size={15} />
            <SvgTex x={sx(c2[c2.length - 1][0]) + 4} y={sy(c2[c2.length - 1][1]) + 4} tex="N_2" valign="middle" className="c-n2-t" size={15} />
            {showFull && (
              <SvgTex
                x={sx(cr[cr.length - 1][0]) - 6}
                y={sy(cr[cr.length - 1][1]) - 4}
                tex={isSeries ? 'N_1 + N_2' : String.raw`N_1 \parallel N_2`}
                anchor="end"
                className="c-res-t"
                size={15}
              />
            )}
            {isSeries ? (
              <g>
                <line x1={sx(0)} x2={sx(construction.U)} y1={sy(construction.I)} y2={sy(construction.I)} className="plot-guide" />
                {/* odcinek U1 od 0, a potem U2 dołożony */}
                <line x1={sx(0)} x2={sx(construction.U1)} y1={sy(construction.I) + 4} y2={sy(construction.I) + 4} className="seg-u1" />
                <line x1={sx(construction.U1)} x2={sx(construction.U)} y1={sy(construction.I) + 4} y2={sy(construction.I) + 4} className="seg-u2" />
                <SvgTex x={sx(construction.U1 / 2)} y={sy(construction.I) + 4} tex="U_1" anchor="middle" valign="top" className="c-n1-t" size={13} />
                <SvgTex x={sx(construction.U1 + construction.U2 / 2)} y={sy(construction.I) + 4} tex="U_2" anchor="middle" valign="top" className="c-n2-t" size={13} />
                <circle cx={sx(construction.U1)} cy={sy(construction.I)} r={4} className="plot-pt c-n1" />
                <circle cx={sx(construction.U2)} cy={sy(construction.I)} r={4} className="plot-pt c-n2" />
                <circle cx={sx(construction.U)} cy={sy(construction.I)} r={6} className="plot-pt c-res" />
                <SvgTex x={sx(construction.U) + 8} y={sy(construction.I) - 4} tex={String.raw`I = \text{const}`} size={13} />
              </g>
            ) : (
              <g>
                <line x1={sx(construction.U)} x2={sx(construction.U)} y1={sy(0)} y2={sy(construction.I)} className="plot-guide" />
                <line x1={sx(construction.U) - 4} x2={sx(construction.U) - 4} y1={sy(0)} y2={sy(construction.I1)} className="seg-u1" />
                <line x1={sx(construction.U) + 4} x2={sx(construction.U) + 4} y1={sy(construction.I1)} y2={sy(construction.I)} className="seg-u2" />
                <SvgTex x={sx(construction.U) - 10} y={sy(construction.I1 / 2)} tex="I_1" anchor="end" valign="middle" className="c-n1-t" size={13} />
                <SvgTex x={sx(construction.U) + 10} y={sy(construction.I1 + construction.I2 / 2)} tex="I_2" valign="middle" className="c-n2-t" size={13} />
                <circle cx={sx(construction.U)} cy={sy(construction.I1)} r={4} className="plot-pt c-n1" />
                <circle cx={sx(construction.U)} cy={sy(construction.I2)} r={4} className="plot-pt c-n2" />
                <circle cx={sx(construction.U)} cy={sy(construction.I)} r={6} className="plot-pt c-res" />
                <SvgTex x={sx(construction.U) + 8} y={sy(construction.I) - 6} tex={String.raw`U = \text{const}`} size={13} />
              </g>
            )}
          </g>
        )}
      </Plot>
      {interactive && (
        <div className="controls">
          {isSeries ? (
            <Slider label="$I$" value={p} min={0.02} max={0.3} step={0.005} onChange={setP} display={`${fmt(p, 3)} A`} />
          ) : (
            <Slider label="$U$" value={p} min={0.2} max={8} step={0.1} onChange={setP} display={`${fmt(p, 2)} V`} />
          )}
          <div className="readout">
            {isSeries ? (
              <>
                <span><Tex tex="U_1 =" /> <b>{fmt(construction.U1)} V</b></span>
                <span><Tex tex="U_2 =" /> <b>{fmt(construction.U2)} V</b></span>
                <span><Tex tex="U = U_1 + U_2 =" /> <b>{fmt(construction.U)} V</b></span>
              </>
            ) : (
              <>
                <span><Tex tex="I_1 =" /> <b>{fmt(construction.I1)} A</b></span>
                <span><Tex tex="I_2 =" /> <b>{fmt(construction.I2)} A</b></span>
                <span><Tex tex="I = I_1 + I_2 =" /> <b>{fmt(construction.I)} A</b></span>
              </>
            )}
          </div>
          <div className="toggles">
            <label>
              <input type="checkbox" checked={showFull} onChange={(e) => setShowFull(e.target.checked)} /> pokaż całą charakterystykę zastępczą
            </label>
          </div>
          <p className="hint">
            <Rich
              text={
                isSeries
                  ? 'Przesuwaj suwak prądu – fioletowa krzywa „rysuje się” punkt po punkcie. Dokładnie tak konstruujesz ją ołówkiem: kreska pozioma, odczyt $U_1$ i $U_2$, suma.'
                  : 'Przesuwaj suwak napięcia – kreska pionowa, odczyt $I_1$ i $I_2$, suma prądów daje punkt charakterystyki zastępczej.'
              }
            />
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------------- Z4: sprzężenie, kalkulator impedancji ---------------- */
export function CoupledExplorer({ focus = 'series' }) {
  const [R1, setR1] = useState(10);
  const [X1, setX1] = useState(60);
  const [X2, setX2] = useState(60);
  const [k, setK] = useState(0.5);
  const XM = k * Math.sqrt(X1 * X2);
  const Z1 = cx(R1, X1);
  const Z2 = cx(R1, X2);
  const ZM = cx(0, XM);
  const rows = useMemo(
    () => [
      { name: 'szeregowo, zgodnie', z: seriesZ(Z1, Z2, ZM, true) },
      { name: 'szeregowo, niezgodnie', z: seriesZ(Z1, Z2, ZM, false) },
      { name: 'równolegle, zgodnie', z: parallelZ(Z1, Z2, ZM, true) },
      { name: 'równolegle, niezgodnie', z: parallelZ(Z1, Z2, ZM, false) },
    ],
    [R1, X1, X2, k]
  );
  const maxAbs = Math.max(...rows.map((r) => cabs(r.z)));
  return (
    <div className="diagram">
      <div className="controls">
        <Slider label="$R_1 = R_2$" value={R1} min={2} max={40} step={1} onChange={setR1} display={`${R1} Ω`} />
        <Slider label="$\omega L_1$" value={X1} min={10} max={120} step={1} onChange={setX1} display={`${X1} Ω`} />
        <Slider label="$\omega L_2$" value={X2} min={10} max={120} step={1} onChange={setX2} display={`${X2} Ω`} />
        <Slider label="$k$" value={k} min={0} max={0.98} step={0.01} onChange={setK} display={fmt(k, 2)} />
        <div className="readout">
          <span>
            <Tex tex={String.raw`X_M = \omega M = k\sqrt{X_1 X_2} =`} /> <b>{fmt(XM)} Ω</b>
          </span>
        </div>
      </div>
      <div className="bars">
        {rows.map((r) => (
          <div key={r.name} className={`bar-row ${r.name.startsWith(focus === 'series' ? 'szereg' : 'równo') ? 'focus' : ''}`}>
            <span className="bar-name">{r.name}</span>
            <span className="bar-track">
              <span className={`bar-fill ${r.name.includes('niezg') ? 'nz' : 'zg'}`} style={{ width: `${(100 * cabs(r.z)) / maxAbs}%` }} />
            </span>
            <span className="bar-val">
              |Z| = {fmt(cabs(r.z))} Ω<small> ({fmt(r.z.re)} {r.z.im >= 0 ? '+' : '−'} j{fmt(Math.abs(r.z.im))})</small>
            </span>
          </div>
        ))}
      </div>
      <p className="hint">
        Ustaw k = 0 – wszystkie „zgodne” i „niezgodne” się zrównają (brak sprzężenia). Zwiększaj k: <b>zgodne zawsze daje większą |Z|</b>,
        niezgodne mniejszą – i dla szeregowego, i dla równoległego.
      </p>
    </div>
  );
}

/* ---------------- Rysunki "wzorcowe" do każdego pytania ---------------- */
export function ModelDrawing({ qid, interactive = false }) {
  switch (qid) {
    case 'z2.1':
      return <RCPlot mode="current" interactive={interactive} />;
    case 'z2.2':
      return <RCPlot mode="voltage" interactive={interactive} />;
    case 'z2.3':
      return <Schematic def={CIRCUITS['rc-current']} />;
    case 'z2.4':
      return <Schematic def={CIRCUITS['rc-voltage']} />;
    case 'z3.1':
      return <ResistancePlot interactive={interactive} />;
    case 'z3.2':
      return (
        <div className="stack">
          <div className="two">
            <figure>
              <Schematic def={NL_CONNECTIONS.series} />
              <figcaption>Połączenie szeregowe</figcaption>
            </figure>
            <figure>
              <Schematic def={NL_CONNECTIONS.parallel} />
              <figcaption>Połączenie równoległe</figcaption>
            </figure>
          </div>
          <div className="two">
            <figure>
              <CharacteristicsPlot mode="series" interactive={interactive} />
              <figcaption>Szeregowo: sumujemy napięcia przy I = const</figcaption>
            </figure>
            <figure>
              <CharacteristicsPlot mode="parallel" interactive={interactive} />
              <figcaption>Równolegle: sumujemy prądy przy U = const</figcaption>
            </figure>
          </div>
        </div>
      );
    case 'z3.3':
      return <Schematic def={CIRCUITS['nl-series']} />;
    case 'z3.4':
      return <Schematic def={CIRCUITS['nl-parallel']} />;
    case 'z4.1':
      return <Schematic def={CIRCUITS['coils-agree']} />;
    case 'z4.2':
      return <Schematic def={CIRCUITS['coils-oppose']} />;
    case 'z4.3':
      return (
        <div className="stack">
          <Schematic def={CIRCUITS['coils-series']} />
          {interactive && <CoupledExplorer focus="series" />}
        </div>
      );
    case 'z4.4':
      return (
        <div className="stack">
          <Schematic def={CIRCUITS['coils-parallel']} />
          {interactive && <CoupledExplorer focus="parallel" />}
        </div>
      );
    default:
      return null;
  }
}

export function RCBranch() {
  return <Schematic def={RC_BRANCH} />;
}

export function FormulaBox({ tex }) {
  return (
    <div className="formula-box">
      <Tex tex={tex} block />
    </div>
  );
}
