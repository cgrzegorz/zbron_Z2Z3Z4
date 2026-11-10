import { useState } from 'react';
import { CircuitSlots, FindError, FormulaCloze, ConceptQuiz, ITEMS } from '../drills/Drills.jsx';
import { SketchCurve, sketchKinds } from '../drills/SketchCurve.jsx';
import { recordDrill } from '../lib/srs.js';
import { pick } from '../lib/random.js';

export const DRILLS = [
  { k: 'slots', name: 'Uzupełnij schemat', e: '🧩', desc: 'Wstaw brakujące mierniki i wyłączniki', C: CircuitSlots, secs: ['Z2', 'Z3', 'Z4'] },
  { k: 'error', name: 'Znajdź błąd', e: '🔍', desc: 'Kliknij źle narysowany element', C: FindError, secs: ['Z2', 'Z3', 'Z4'] },
  { k: 'sketch', name: 'Narysuj krzywą', e: '📈', desc: 'Rysujesz wykres i porównujesz z poprawnym', C: SketchCurve, secs: ['Z2', 'Z3'] },
  { k: 'cloze', name: 'Wzór z lukami', e: '🧮', desc: 'Uzupełnij brakujące fragmenty wzoru', C: FormulaCloze, secs: ['Z2', 'Z3', 'Z4'] },
  { k: 'concept', name: 'Dlaczego?', e: '❓', desc: 'Pytania sprawdzające zrozumienie', C: ConceptQuiz, secs: ['Z2', 'Z3', 'Z4'] },
];

const ITEMS_OF = { ...ITEMS, sketch: sketchKinds };

export function Train() {
  const [secs, setSecs] = useState(new Set(['Z2', 'Z3', 'Z4']));
  const [types, setTypes] = useState(new Set(DRILLS.map((d) => d.k)));
  const [round, setRound] = useState(0);
  const [cur, setCur] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [session, setSession] = useState({ ok: 0, total: 0, streak: 0, best: 0 });
  // zadania zaliczone poprawnie w tej rundzie – nie wracają, dopóki nie zaczniesz nowej rundy
  const [mastered, setMastered] = useState(() => new Set());
  const [finished, setFinished] = useState(false);

  const toggle = (set, setter, v) => {
    const n = new Set(set);
    if (n.has(v)) {
      if (n.size > 1) n.delete(v);
    } else n.add(v);
    setter(n);
  };

  const remaining = (d, done = mastered) => ITEMS_OF[d.k](secs).filter((it) => !done.has(`${d.k}:${it}`));

  const nextDrill = (done = mastered) => {
    const avail = DRILLS.filter((d) => types.has(d.k) && d.secs.some((s) => secs.has(s)) && remaining(d, done).length);
    if (!avail.length) {
      setFinished(true);
      setCur(null);
      return;
    }
    // przeplatanie: unikaj tego samego typu dwa razy z rzędu
    const choices = avail.length > 1 && cur ? avail.filter((d) => d.k !== cur.k) : avail;
    const d = pick(choices);
    const items = remaining(d, done);
    // nie podawaj dokładnie tego samego zadania dwa razy z rzędu (np. po błędnej odpowiedzi)
    const fresh = items.length > 1 && cur?.k === d.k ? items.filter((it) => it !== cur.item) : items;
    setCur({ ...d, item: pick(fresh.length ? fresh : items) });
    setRound((r) => r + 1);
    setAnswered(false);
  };

  const newRound = () => {
    const empty = new Set();
    setMastered(empty);
    setFinished(false);
    setSession({ ok: 0, total: 0, streak: 0, best: 0 });
    nextDrill(empty);
  };

  const onDone = (ok, _q, item) => {
    setAnswered(true);
    recordDrill(cur.k, ok);
    if (ok) setMastered((m) => new Set(m).add(`${cur.k}:${item ?? cur.item}`));
    setSession((s) => {
      const streak = ok ? s.streak + 1 : 0;
      return { ok: s.ok + (ok ? 1 : 0), total: s.total + 1, streak, best: Math.max(s.best, streak) };
    });
  };

  return (
    <div className="page">
      <header className="page-h">
        <h1>Trening mieszany</h1>
        <p className="muted">
          Krótkie, losowane zadania – za każdym razem inny schemat, inne liczby, inny brak. Typy zadań się <b>przeplatają</b>, bo mieszanie tematów
          (choć trudniejsze) daje trwalszą wiedzę niż „blokami”.
        </p>
      </header>

      <div className="card filters">
        <div className="set-row">
          <span>Działy</span>
          <div className="seg">
            {['Z2', 'Z3', 'Z4'].map((s) => (
              <button key={s} className={secs.has(s) ? `on ${s.toLowerCase()}` : ''} onClick={() => toggle(secs, setSecs, s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row wrap">
          <span>Typy zadań</span>
          <div className="chips">
            {DRILLS.map((d) => (
              <button key={d.k} className={`chip ${types.has(d.k) ? 'on' : ''}`} onClick={() => toggle(types, setTypes, d.k)} title={d.desc}>
                {d.e} {d.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {finished ? (
        <div className="card center">
          <h3>🎉 Runda ukończona!</h3>
          <p>
            Wszystkie zadania z wybranych działów i typów zaliczone ({session.ok}/{session.total} poprawnie za pierwszym lub kolejnym podejściem).
          </p>
          <p className="muted">Możesz dodać inne działy/typy powyżej i kontynuować albo zacząć nową rundę od zera.</p>
          <div className="row center">
            <button onClick={() => nextDrill()}>Kontynuuj z nowymi filtrami</button>
            <button className="primary big" onClick={newRound}>
              Nowa runda →
            </button>
          </div>
        </div>
      ) : !cur ? (
        <div className="card center">
          <p>Gotowy? Zadania będą losowane z wybranych działów i typów. Zadanie rozwiązane poprawnie nie wróci już w tej rundzie.</p>
          <button className="primary big" onClick={() => nextDrill()}>
            Start →
          </button>
        </div>
      ) : (
        <>
          <div className="session">
            <span className="drill-type">
              {cur.e} {cur.name}
            </span>
            <span className="spacer" />
            <span>
              ✓ {session.ok}/{session.total}
            </span>
            <span>🔥 seria: {session.streak}</span>
            <span className="muted">rekord: {session.best}</span>
            <span className="muted">zaliczone: {mastered.size}</span>
          </div>
          <div className="card">
            <cur.C key={round} allowed={secs} item={cur.item} onDone={onDone} />
          </div>
          <div className="row end">
            <button className={answered ? 'primary big' : 'ghost'} onClick={() => nextDrill()}>
              {answered ? 'Następne zadanie →' : 'Pomiń →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
