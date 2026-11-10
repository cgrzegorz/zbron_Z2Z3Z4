import { useState } from 'react';
import { QUESTIONS, SECTIONS } from '../data/questions.js';
import { Tex, Rich } from '../lib/Tex.jsx';

const EXTRA = {
  Z2: [
    ['Stała czasowa', String.raw`\tau = RC\ [s];\ \text{po } \tau:\ i = 0{,}368 I_0,\ u_C = 0{,}632U;\ \text{ustalony po } (3\div5)\tau`],
    ['Wpływ woltomierza', String.raw`u_C = \frac{R_V}{R+R_V}U\left(1-e^{-t/\tau'}\right),\ \tau' = \frac{RR_V}{R+R_V}C`],
  ],
  Z3: [['Mierniki', String.raw`\text{szereg.: } 1A + 3V;\quad \text{równol.: } 1V + 3A`]],
  Z4: [
    ['Sprzężenie', String.raw`k = \frac{M}{\sqrt{L_1L_2}} \in [0,1]`],
    ['Z pomiarów', String.raw`Z = \frac{U}{I},\ R = \frac{P}{I^2},\ X_L = \sqrt{Z^2 - R^2},\ L = \frac{X_L}{2\pi f}`],
    ['M z pomiarów', String.raw`X_M = \frac{X_{zg} - X_{nz}}{4},\ M = \frac{X_M}{2\pi f}`],
  ],
};

export function CheatSheet() {
  const [hide, setHide] = useState(false);
  return (
    <div className="page">
      <header className="page-h">
        <h1>Ściąga – najważniejsze wzory</h1>
        <p className="muted">
          Używaj jej do <b>sprawdzania</b>, nie do nauki. Włącz tryb „zasłoń wzory”, przypomnij sobie każdy wzór, a potem kliknij, by odsłonić.
        </p>
        <label className="toggle-line">
          <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /> zasłoń wzory (samosprawdzanie)
        </label>
      </header>
      {Object.entries(SECTIONS).map(([sk, s]) => (
        <section key={sk} className="card sheet">
          <h2 className={`sec-h ${s.color}`}>
            <span className="sec-badge">{sk}</span> {s.name}
          </h2>
          <table className="tbl sheet-tbl">
            <tbody>
              {QUESTIONS.filter((q) => q.section === sk).map((q) => (
                <Row key={q.id} name={`${q.num} ${q.title}`} tex={q.keyFormula} hide={hide} note={q.remember} />
              ))}
              {EXTRA[sk].map(([n, t]) => (
                <Row key={n} name={n} tex={t} hide={hide} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}

function Row({ name, tex, hide, note }) {
  const [open, setOpen] = useState(false);
  const covered = hide && !open;
  return (
    <tr>
      <td className="sheet-name">{name}</td>
      <td className={`sheet-f ${covered ? 'covered' : ''}`} onClick={() => hide && setOpen((o) => !o)}>
        {covered ? <span className="cover">kliknij, by odsłonić</span> : (
          <>
            <Tex tex={tex} />
            {note && <div className="muted small"><Rich text={note} /></div>}
          </>
        )}
      </td>
    </tr>
  );
}
