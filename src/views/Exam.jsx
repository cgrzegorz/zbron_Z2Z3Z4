import { useEffect, useRef, useState } from 'react';
import { QUESTIONS, QMAP, SECTIONS } from '../data/questions.js';
import { Rich } from '../lib/Tex.jsx';
import { ModelDrawing } from '../schem/Diagrams.jsx';
import { DrawingPad } from '../components/DrawingPad.jsx';
import { qState, recordQuestion, isDue } from '../lib/srs.js';
import { weightedPick, shuffle } from '../lib/random.js';

const CONF = [
  { v: 1, label: 'Zgadywałem', e: '🤷' },
  { v: 2, label: 'Raczej nie', e: '😕' },
  { v: 3, label: 'Raczej tak', e: '🙂' },
  { v: 4, label: 'Na pewno', e: '😎' },
];

function weight(q) {
  const s = qState(q.id);
  return 1 + (5 - s.box) * 2 + (isDue(q.id) ? 3 : 0);
}

export function drawExam(kind) {
  if (kind === 'exam') {
    return ['Z2', 'Z3', 'Z4'].map((sec) => weightedPick(QUESTIONS.filter((q) => q.section === sec), weight).id);
  }
  if (kind === 'due') {
    const due = QUESTIONS.filter((q) => isDue(q.id));
    return shuffle(due.length ? due : QUESTIONS).slice(0, 6).map((q) => q.id);
  }
  if (kind === 'one') return [weightedPick(QUESTIONS, weight).id];
  if (kind === 'all') return shuffle(QUESTIONS).map((q) => q.id);
  return [];
}

function fmtTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function Exam({ preset, clearPreset }) {
  const [list, setList] = useState(preset || null);
  const [settings, setSettings] = useState({ medium: 'pad', timer: 0 });
  const [i, setI] = useState(0);
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (preset) {
      setList(preset);
      setI(0);
      setResults([]);
    }
  }, [preset]);

  const start = (kind) => {
    setList(drawExam(kind));
    setI(0);
    setResults([]);
  };

  if (!list) return <ExamSetup start={start} settings={settings} setSettings={setSettings} />;
  if (i >= list.length)
    return (
      <ExamSummary
        results={results}
        again={() => {
          setList(null);
          clearPreset?.();
        }}
      />
    );
  return (
    <ExamQuestion
      key={list[i] + '-' + i}
      q={QMAP[list[i]]}
      index={i}
      total={list.length}
      settings={settings}
      onFinish={(r) => {
        setResults((rs) => [...rs, r]);
        setI((x) => x + 1);
      }}
      quit={() => {
        setList(null);
        clearPreset?.();
      }}
    />
  );
}

function ExamSetup({ start, settings, setSettings }) {
  return (
    <div className="page">
      <header className="page-h">
        <h1>Symulacja kolokwium</h1>
        <p className="muted">
          Tu ćwiczysz dokładnie to, co będzie na kolokwium: <b>pytanie → piszesz i rysujesz z pamięci → porównujesz z wzorcem → oceniasz się według
          kryteriów</b>. Pytania są losowane z naciskiem na te, które idą Ci najsłabiej.
        </p>
      </header>
      <div className="grid-3">
        <button className="bigchoice z2" onClick={() => start('exam')}>
          <span className="bc-e">🎯</span>
          <b>Kolokwium próbne</b>
          <span>3 losowe pytania – po jednym z Z2, Z3 i Z4</span>
        </button>
        <button className="bigchoice z3" onClick={() => start('due')}>
          <span className="bc-e">🔁</span>
          <b>Powtórki na dziś</b>
          <span>pytania, których termin powtórki minął (max 6)</span>
        </button>
        <button className="bigchoice z4" onClick={() => start('one')}>
          <span className="bc-e">🎲</span>
          <b>Jedno losowe pytanie</b>
          <span>szybka runda na 5 minut</span>
        </button>
      </div>
      <div className="card settings">
        <h3>Ustawienia</h3>
        <div className="set-row">
          <span>Gdzie rysujesz?</span>
          <div className="seg">
            <button className={settings.medium === 'pad' ? 'on' : ''} onClick={() => setSettings({ ...settings, medium: 'pad' })}>
              ✏️ Tablica w aplikacji
            </button>
            <button className={settings.medium === 'paper' ? 'on' : ''} onClick={() => setSettings({ ...settings, medium: 'paper' })}>
              📄 Na kartce (polecane!)
            </button>
          </div>
        </div>
        <div className="set-row">
          <span>Limit czasu na pytanie</span>
          <div className="seg">
            {[0, 5, 8, 12].map((t) => (
              <button key={t} className={settings.timer === t ? 'on' : ''} onClick={() => setSettings({ ...settings, timer: t })}>
                {t ? `${t} min` : 'bez limitu'}
              </button>
            ))}
          </div>
        </div>
        <p className="muted small">
          💡 Na kolokwium piszesz ręcznie – dlatego ćwiczenie na prawdziwej kartce daje najlepszy transfer. Tablica w aplikacji przydaje się, gdy nie
          masz papieru pod ręką lub uczysz się na tablecie.
        </p>
        <button className="ghost" onClick={() => start('all')}>
          Wszystkie 12 pytań w losowej kolejności →
        </button>
      </div>
    </div>
  );
}

function ExamQuestion({ q, index, total, settings, onFinish, quit }) {
  const [phase, setPhase] = useState('attempt'); // attempt → confidence → review
  const [notes, setNotes] = useState('');
  const [hintsUsed, setHintsUsed] = useState(0);
  const [conf, setConf] = useState(null);
  const [checks, setChecks] = useState(() => q.rubric.map(() => false));
  const [snapshot, setSnapshot] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const padRef = useRef(null);
  const sec = SECTIONS[q.section];
  const limit = settings.timer * 60;

  useEffect(() => {
    if (phase !== 'attempt') return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const timeUp = limit > 0 && elapsed >= limit;

  const finishAttempt = () => {
    if (padRef.current && !padRef.current.isEmpty()) setSnapshot(padRef.current.toDataURL());
    setPhase('confidence');
  };

  const raw = Math.round((100 * checks.filter(Boolean).length) / checks.length);
  const penalty = hintsUsed * 10;
  const score = Math.max(0, raw - penalty);

  const submit = () => {
    recordQuestion(q.id, score, conf);
    onFinish({ id: q.id, score, conf, time: elapsed, hintsUsed });
  };

  return (
    <div className="page">
      <div className="crumbs">
        <button className="ghost" onClick={quit}>
          ✕ Zakończ
        </button>
        <span className="progress-dots">
          {Array.from({ length: total }, (_, k) => (
            <span key={k} className={k < index ? 'done' : k === index ? 'cur' : ''} />
          ))}
        </span>
        <span className="spacer" />
        {phase === 'attempt' && (
          <span className={`timer ${timeUp ? 'up' : limit && limit - elapsed < 60 ? 'warn' : ''}`}>
            ⏱ {limit ? fmtTime(Math.max(0, limit - elapsed)) : fmtTime(elapsed)}
          </span>
        )}
      </div>

      <header className={`qhead ${sec.color}`}>
        <span className="qnum big">{q.num}</span>
        <div>
          <p className="eyebrow">
            Pytanie {index + 1} z {total} · {sec.name}
          </p>
          <h1 className="prompt-h">{q.prompt}</h1>
        </div>
      </header>

      {phase === 'attempt' && (
        <>
          {timeUp && <div className="banner warn">⏰ Czas minął! Dokończ myśl i przejdź do sprawdzenia.</div>}
          {settings.medium === 'pad' ? (
            <div className="card">
              <p className="muted small">Narysuj {q.drawing === 'wykres' ? 'wykres' : 'schemat'} i dopisz wzory / opis. Rysik i palec też działają.</p>
              <DrawingPad ref={padRef} height={400} />
              <textarea className="notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Wzory, opis elementów, wyjaśnienie… (opcjonalnie)" />
            </div>
          ) : (
            <div className="card paper">
              <div className="paper-i">📄</div>
              <div>
                <h3>Weź kartkę i długopis</h3>
                <p>
                  Napisz odpowiedź tak, jak na kolokwium: <b>wzór(y) z objaśnieniem symboli + {q.drawing === 'wykres' ? 'wykres' : 'schemat'} + krótki opis</b>.
                  Nie zaglądaj do notatek – trud przypominania to właśnie moment, w którym się uczysz.
                </p>
              </div>
            </div>
          )}
          <div className="card hints">
            <div className="row">
              <span className="muted">Utknąłeś? Podpowiedź kosztuje −10% wyniku:</span>
              {q.hints.map((h, k) =>
                k < hintsUsed ? (
                  <span key={k} className="hint-chip">💡 <Rich text={h} /></span>
                ) : k === hintsUsed ? (
                  <button key={k} className="ghost" onClick={() => setHintsUsed((x) => x + 1)}>
                    Podpowiedź {k + 1}
                  </button>
                ) : null
              )}
            </div>
          </div>
          <div className="row end">
            <button className="primary big" onClick={finishAttempt}>
              Skończyłem – sprawdź →
            </button>
          </div>
        </>
      )}

      {phase === 'confidence' && (
        <div className="card center">
          <h3>Zanim zobaczysz wzorzec: jak bardzo jesteś pewny swojej odpowiedzi?</h3>
          <p className="muted">To trening metapoznania – uczysz się trafnie oceniać, co naprawdę umiesz (na kolokwium to bezcenne).</p>
          <div className="conf">
            {CONF.map((c) => (
              <button
                key={c.v}
                onClick={() => {
                  setConf(c.v);
                  setPhase('review');
                }}
              >
                <span className="conf-e">{c.e}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'review' && (
        <>
          <div className={`two review ${snapshot || notes ? '' : 'no-answer'}`}>
            <div className="card">
              <h3>Twoja odpowiedź</h3>
              {snapshot ? (
                <img src={snapshot} alt="Twój rysunek" className="snapshot" />
              ) : (
                <p className="muted">{settings.medium === 'paper' ? 'Połóż kartkę obok ekranu i porównuj punkt po punkcie.' : '(brak rysunku)'}</p>
              )}
              {notes && <pre className="notes-view">{notes}</pre>}
            </div>
            <div className="card official">
              <div className="official-h">Wzorcowa odpowiedź</div>
              {q.official.map((p, k) => (
                <Rich key={k} text={p} as="p" />
              ))}
              <ModelDrawing qid={q.id} />
            </div>
          </div>
          <div className="card">
            <h3>Oceń się uczciwie – zaznacz, co NAPRAWDĘ było w Twojej odpowiedzi:</h3>
            <ul className="rubric">
              {q.rubric.map((r, k) => (
                <li key={k}>
                  <label className={checks[k] ? 'on' : ''}>
                    <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks(checks.map((c, j) => (j === k ? e.target.checked : c)))} />
                    <Rich text={r} />
                  </label>
                </li>
              ))}
            </ul>
            <div className="score-row">
              <div className="score-big">{score}%</div>
              <div>
                {penalty > 0 && <p className="muted small">({raw}% − {penalty}% za podpowiedzi)</p>}
                <Calibration conf={conf} score={score} />
              </div>
            </div>
            <div className="row end">
              <button className="primary big" onClick={submit}>
                Zapisz i dalej →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Calibration({ conf, score }) {
  if (!conf) return null;
  const expected = { 1: 15, 2: 40, 3: 70, 4: 92 }[conf];
  const diff = score - expected;
  if (Math.abs(diff) < 25) return <p>🎯 Dobra kalibracja – Twoja pewność zgadza się z wynikiem.</p>;
  if (diff < 0)
    return (
      <p>
        ⚠️ <b>Iluzja wiedzy:</b> czułeś się pewnie, a wynik jest niższy. To częste przy czytaniu notatek – dlatego testuj się, zamiast tylko czytać.
      </p>
    );
  return <p>💪 Umiesz więcej, niż myślisz! Zaufaj sobie trochę bardziej.</p>;
}

function ExamSummary({ results, again }) {
  const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const grade = avg >= 91 ? '5,0' : avg >= 81 ? '4,5' : avg >= 71 ? '4,0' : avg >= 61 ? '3,5' : avg >= 51 ? '3,0' : '2,0';
  return (
    <div className="page">
      <header className="page-h">
        <h1>Podsumowanie</h1>
      </header>
      <div className="card center">
        <div className="score-huge">{avg}%</div>
        <p className="muted">orientacyjna ocena: <b>{grade}</b></p>
      </div>
      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>Pytanie</th>
              <th>Wynik</th>
              <th>Pewność</th>
              <th>Czas</th>
              <th>Następna powtórka</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, k) => (
              <tr key={k}>
                <td>
                  <b>{QMAP[r.id].num}</b> {QMAP[r.id].title}
                </td>
                <td className={r.score >= 85 ? 'ok' : r.score >= 60 ? 'mid' : 'bad'}>{r.score}%</td>
                <td>{CONF.find((c) => c.v === r.conf)?.e}</td>
                <td>{fmtTime(r.time)}</td>
                <td>{qState(r.id).due}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          Pytania z wynikiem poniżej 60% wracają do powtórki już dziś/jutro, dobrze opanowane – za kilka dni (powtórki rozłożone w czasie).
        </p>
      </div>
      <div className="row center">
        <button className="primary big" onClick={again}>
          Jeszcze raz
        </button>
      </div>
    </div>
  );
}
