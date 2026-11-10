import { useMemo, useState } from 'react';
import { Schematic, slotLabel } from '../schem/Schematic.jsx';
import { CIRCUITS } from '../schem/circuits.js';
import { FORMULAS } from '../data/generators.js';
import { CONCEPTS } from '../data/concepts.js';
import { QMAP } from '../data/questions.js';
import { Rich, Tex } from '../lib/Tex.jsx';
import { pick, shuffle, sample, randInt } from '../lib/random.js';
import { Sub } from '../components/Sub.jsx';

export const CIRCUIT_Q = {
  'rc-current': 'z2.3',
  'rc-voltage': 'z2.4',
  'nl-series': 'z3.3',
  'nl-parallel': 'z3.4',
  'coils-agree': 'z4.1',
  'coils-oppose': 'z4.2',
  'coils-series': 'z4.3',
  'coils-parallel': 'z4.4',
};
const secOf = (qid) => qid.slice(0, 2).toUpperCase();
const circuitsFor = (allowed, pred) =>
  Object.keys(CIRCUITS).filter((k) => allowed.has(secOf(CIRCUIT_Q[k])) && pred(CIRCUITS[k]));

const slotKeys = (allowed) => {
  const keys = circuitsFor(allowed, (c) => c.els.some((e) => e.slot));
  return keys.length ? keys : Object.keys(CIRCUITS).filter((k) => CIRCUITS[k].els.some((e) => e.slot));
};
const errorKeys = (allowed) => {
  let keys = circuitsFor(allowed, (c) => c.errors?.length);
  if (!keys.length) keys = Object.keys(CIRCUITS).filter((k) => CIRCUITS[k].errors?.length);
  return keys.flatMap((k) => [...CIRCUITS[k].errors.map((e) => `${k}|${e.id}`), `${k}|none`]);
};
const indexKeys = (arr, allowed, extra = () => true) => {
  const all = arr.map((x, i) => [x, String(i)]);
  const f = all.filter(([x]) => allowed.has(secOf(x.q)) && extra(x));
  return (f.length ? f : all).map(([, i]) => i);
};

/** Klucze wszystkich możliwych zadań danego typu – Trening wyklucza te już zaliczone w rundzie. */
export const ITEMS = {
  slots: slotKeys,
  error: errorKeys,
  cloze: (allowed) => indexKeys(FORMULAS, allowed),
  concept: (allowed, onlyQ) => indexKeys(CONCEPTS, onlyQ ? { has: () => true } : allowed, (c) => !onlyQ || c.q === onlyQ),
};

function QTag({ qid }) {
  const q = QMAP[qid];
  if (!q) return null;
  return <span className={`qtag ${q.section.toLowerCase()}`}>{q.num} · {q.title}</span>;
}

/* ------------------------- Uzupełnij schemat ------------------------- */
const PALETTE = ['A', 'V', 'µA', 'W', 'SW'];
const PALETTE_NAMES = { A: 'amperomierz', V: 'woltomierz', 'µA': 'mikroamperomierz', W: 'watomierz', SW: 'wyłącznik' };
const expectedOf = (el) => (el.slotKind ? el.slotKind : el.m === 'µA' ? 'µA' : el.m.split('_')[0]);

export function CircuitSlots({ allowed, onDone, item }) {
  const task = useMemo(() => {
    const key = item ?? pick(slotKeys(allowed));
    const def = CIRCUITS[key];
    const slots = def.els.filter((e) => e.slot);
    const n = slots.length <= 2 ? slots.length : randInt(2, slots.length);
    const hidden = sample(slots, n).map((e) => e.id);
    return { key, def, hidden: new Set(hidden), slots: slots.filter((e) => hidden.includes(e.id)) };
  }, []);
  const [values, setValues] = useState({});
  const [active, setActive] = useState(task.slots[0]?.id);
  const [checked, setChecked] = useState(null);

  const choose = (v) => {
    if (checked) return;
    const nv = { ...values, [active]: v };
    setValues(nv);
    const nextEmpty = task.slots.find((s) => !nv[s.id]);
    if (nextEmpty) setActive(nextEmpty.id);
  };
  const check = () => {
    const st = {};
    let ok = true;
    for (const s of task.slots) {
      const good = values[s.id] === expectedOf(s);
      st[s.id] = good ? 'ok' : 'bad';
      if (!good) ok = false;
    }
    setChecked(st);
    onDone?.(ok, CIRCUIT_Q[task.key], task.key);
  };
  const allFilled = task.slots.every((s) => values[s.id]);

  return (
    <div className="drill">
      <QTag qid={CIRCUIT_Q[task.key]} />
      <h3 className="drill-title">Uzupełnij schemat: {task.def.title.toLowerCase()}</h3>
      <p className="muted">Kliknij znak „?” na schemacie i wybierz, jaki element powinien się tam znaleźć.</p>
      <div className="schem-wrap">
        <Schematic
          def={task.def}
          hidden={task.hidden}
          slotValues={values}
          slotStates={checked || Object.fromEntries([[active, 'active']])}
          onSlot={(id) => !checked && setActive(id)}
        />
      </div>
      {!checked && (
        <div className="palette">
          <span className="muted">Element dla zaznaczonego „?”:</span>
          {PALETTE.map((p) => (
            <button key={p} onClick={() => choose(p)} className={values[active] === p ? 'on' : ''}>
              <b>{slotLabel(p)}</b> <small>{PALETTE_NAMES[p]}</small>
            </button>
          ))}
        </div>
      )}
      <div className="row">
        <button className="primary" disabled={!allFilled || !!checked} onClick={check}>
          Sprawdź
        </button>
      </div>
      {checked && (
        <div className={`feedback ${Object.values(checked).every((v) => v === 'ok') ? 'ok' : 'bad'}`}>
          <ul className="checklist">
            {task.slots.map((s) => (
              <li key={s.id} className={checked[s.id]}>
                {checked[s.id] === 'ok' ? '✓' : '✗'} <Sub s={s.name} />: {PALETTE_NAMES[expectedOf(s)]}
                {checked[s.id] === 'bad' && <span className="muted"> (wybrano: {PALETTE_NAMES[values[s.id]]})</span>}
                {' – '}
                <span className="muted">{whyPlacement(s)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function whyPlacement(s) {
  const e = expectedOf(s);
  if (e === 'A' || e === 'µA') return 'mierzy prąd → włączony szeregowo, „na drodze” prądu';
  if (e === 'V') return 'mierzy napięcie → równolegle, między dwoma punktami';
  if (e === 'W') return 'moc czynna: cewka prądowa szeregowo, napięciowa równolegle';
  if (e === 'SW') return 'wyłącznik określa chwilę t = 0';
  return '';
}

/* ------------------------- Znajdź błąd ------------------------- */
export function FindError({ allowed, onDone, item }) {
  const task = useMemo(() => {
    let itemKey = item;
    if (!itemKey) {
      const keys = errorKeys(allowed);
      const errs = keys.filter((k) => !k.endsWith('|none'));
      itemKey = Math.random() < 0.25 ? pick(keys.filter((k) => k.endsWith('|none'))) : pick(errs);
    }
    const [key, errId] = itemKey.split('|');
    const def = CIRCUITS[key];
    const err = errId === 'none' ? null : def.errors.find((e) => e.id === errId);
    return { key, def, err, itemKey };
  }, []);
  const [pickId, setPickId] = useState(null);
  const [done, setDone] = useState(false);

  const answer = (id) => {
    if (done) return;
    setPickId(id);
    setDone(true);
    const ok = task.err ? id === task.err.id : id === 'none';
    onDone?.(ok, CIRCUIT_Q[task.key], task.itemKey);
  };
  const ok = done && (task.err ? pickId === task.err.id : pickId === 'none');
  const marks = {};
  if (done) {
    if (task.err) marks[task.err.id] = 'ok';
    if (pickId && pickId !== 'none' && (!task.err || pickId !== task.err.id)) marks[pickId] = 'bad';
  }
  return (
    <div className="drill">
      <QTag qid={CIRCUIT_Q[task.key]} />
      <h3 className="drill-title">Znajdź błąd: {task.def.title.toLowerCase()}</h3>
      <p className="muted">Kliknij element, który jest narysowany źle – albo wybierz „Schemat jest poprawny”. (Błąd jest najwyżej jeden.)</p>
      <div className="schem-wrap">
        <Schematic def={task.def} overrides={task.err ? { [task.err.id]: task.err.override } : {}} onPick={done ? undefined : answer} marks={marks} />
      </div>
      <div className="row">
        <button disabled={done} onClick={() => answer('none')} className={pickId === 'none' ? 'on' : ''}>
          ✓ Schemat jest poprawny
        </button>
      </div>
      {done && (
        <div className={`feedback ${ok ? 'ok' : 'bad'}`}>
          <p>
            <b>{ok ? 'Dobrze!' : 'Nie tym razem.'}</b>{' '}
            {task.err ? <Rich text={task.err.why} /> : 'Ten schemat był w pełni poprawny – warto umieć to stwierdzić z pewnością.'}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------- Wzór z lukami ------------------------- */
export function FormulaCloze({ allowed, onDone, item }) {
  const task = useMemo(() => {
    const idx = item ?? pick(ITEMS.cloze(allowed));
    const f = FORMULAS[Number(idx)];
    const blankIdx = f.parts.map((p, i) => (typeof p === 'object' ? i : -1)).filter((i) => i >= 0);
    const n = Math.min(blankIdx.length, randInt(1, 2));
    const hidden = sample(blankIdx, n).sort((a, b) => a - b);
    const options = Object.fromEntries(hidden.map((i) => [i, shuffle([f.parts[i].a, ...f.parts[i].d.slice(0, 3)])]));
    return { f, hidden, options, idx };
  }, []);
  const [sel, setSel] = useState({});
  const [done, setDone] = useState(false);
  const { f, hidden, options } = task;

  const tex = f.parts
    .map((p, i) => {
      if (typeof p === 'string') return p;
      const hi = hidden.indexOf(i);
      if (hi < 0) return p.a;
      const chosen = sel[i];
      const num = hi + 1;
      if (!chosen) return String.raw`\boxed{\,?_{${num}}\,}`;
      const color = done ? (chosen === p.a ? 'green' : 'red') : 'blue';
      return String.raw`\boxed{\color{${color}}{${chosen}}}`;
    })
    .join('');

  const check = () => {
    setDone(true);
    onDone?.(hidden.every((i) => sel[i] === f.parts[i].a), f.q, task.idx);
  };
  const ok = done && hidden.every((i) => sel[i] === f.parts[i].a);
  const correctTex = f.parts.map((p) => (typeof p === 'string' ? p : p.a)).join('');
  return (
    <div className="drill">
      <QTag qid={f.q} />
      <h3 className="drill-title">Uzupełnij wzór: <Rich text={f.ctx} /></h3>
      <div className="formula-box big">
        <Tex tex={tex} block />
      </div>
      {hidden.map((i, k) => (
        <div key={i} className="cloze-opts">
          <span className="cloze-num">?{hidden.length > 1 ? k + 1 : ''}</span>
          {options[i].map((o) => (
            <button
              key={o}
              disabled={done}
              className={`${sel[i] === o ? 'on' : ''} ${done && o === f.parts[i].a ? 'right' : ''} ${done && sel[i] === o && o !== f.parts[i].a ? 'wrong' : ''}`}
              onClick={() => setSel({ ...sel, [i]: o })}
            >
              <Tex tex={o} />
            </button>
          ))}
        </div>
      ))}
      <div className="row">
        <button className="primary" disabled={done || hidden.some((i) => !sel[i])} onClick={check}>
          Sprawdź
        </button>
      </div>
      {done && (
        <div className={`feedback ${ok ? 'ok' : 'bad'}`}>
          <p>
            <b>{ok ? 'Dobrze!' : 'Poprawny wzór:'}</b>
          </p>
          <Tex tex={correctTex} block />
        </div>
      )}
    </div>
  );
}

/* ------------------------- Pytanie „dlaczego?” ------------------------- */
export function ConceptQuiz({ allowed, onDone, onlyQ, item }) {
  const task = useMemo(() => {
    const idx = item ?? pick(ITEMS.concept(allowed, onlyQ));
    const c = CONCEPTS[Number(idx)];
    return { c, idx, opts: shuffle(c.opts.map((o, i) => ({ o, ok: i === 0 }))) };
  }, []);
  const [sel, setSel] = useState(null);
  const answer = (i) => {
    if (sel != null) return;
    setSel(i);
    onDone?.(task.opts[i].ok, task.c.q, task.idx);
  };
  return (
    <div className="drill">
      <QTag qid={task.c.q} />
      <h3 className="drill-title">
        <Rich text={task.c.text} />
      </h3>
      <div className="mcq">
        {task.opts.map((o, i) => (
          <button
            key={i}
            disabled={sel != null}
            onClick={() => answer(i)}
            className={sel == null ? '' : o.ok ? 'right' : sel === i ? 'wrong' : 'dim'}
          >
            <span className="mcq-k">{String.fromCharCode(65 + i)}</span> <Rich text={o.o} />
          </button>
        ))}
      </div>
      {sel != null && (
        <div className={`feedback ${task.opts[sel].ok ? 'ok' : 'bad'}`}>
          <p>
            <b>{task.opts[sel].ok ? 'Tak!' : 'Nie.'}</b> <Rich text={task.c.why} />
          </p>
        </div>
      )}
    </div>
  );
}
