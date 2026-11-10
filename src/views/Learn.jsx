import { useState } from 'react';
import { QUESTIONS, SECTIONS, FOUNDATIONS, QMAP } from '../data/questions.js';
import { Rich, Tex } from '../lib/Tex.jsx';
import { ModelDrawing, RCBranch } from '../schem/Diagrams.jsx';
import { ConceptQuiz, ITEMS } from '../drills/Drills.jsx';
import { pick } from '../lib/random.js';
import { mastery } from '../lib/srs.js';
import { useStore } from '../lib/useStore.js';
import { recordDrill } from '../lib/srs.js';

export function MasteryRing({ value, size = 34 }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="ring" aria-label={`opanowanie ${Math.round(value * 100)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="ring-fg"
        strokeDasharray={`${c * value} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle" className="ring-t">
        {Math.round(value * 100)}
      </text>
    </svg>
  );
}

export function Learn({ initial, goExam }) {
  useStore();
  const [qid, setQid] = useState(initial || null);
  if (qid) return <QuestionDetail key={qid} q={QMAP[qid]} back={() => setQid(null)} goExam={goExam} setQid={setQid} />;
  return (
    <div className="page">
      <header className="page-h">
        <h1>Nauka – zrozum, zanim zapamiętasz</h1>
        <p className="muted">
          Wybierz pytanie. Każde ma trzy warstwy: <b>Zrozum</b> (prosto, z analogią), <b>Pobaw się</b> (interaktywny wykres/schemat) i <b>Na kolokwium</b>{' '}
          (wzorcowa odpowiedź). Na końcu – szybkie „dlaczego?”.
        </p>
      </header>
      {Object.entries(SECTIONS).map(([sk, s]) => (
        <section key={sk} className="sec">
          <h2 className={`sec-h ${s.color}`}>
            <span className="sec-badge">{sk}</span> {s.name}
          </h2>
          <details className="found">
            <summary>Fundamenty działu {sk} (przeczytaj raz na początku)</summary>
            <ul>
              {FOUNDATIONS[sk].map((t, i) => (
                <li key={i}>
                  <Rich text={t} />
                </li>
              ))}
            </ul>
            {sk === 'Z2' && (
              <div className="narrow">
                <RCBranch />
                <p className="caption">Szeregowa gałąź RC załączana w chwili t = 0 na napięcie stałe U.</p>
              </div>
            )}
          </details>
          <div className="cards">
            {QUESTIONS.filter((q) => q.section === sk).map((q) => (
              <button key={q.id} className={`qcard ${s.color}`} onClick={() => setQid(q.id)}>
                <div className="qcard-top">
                  <span className="qnum">{q.num}</span>
                  <MasteryRing value={mastery(q.id)} />
                </div>
                <div className="qtitle">{q.title}</div>
                <div className="qkind">{q.kind}</div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function QuestionDetail({ q, back, goExam, setQid }) {
  const [tab, setTab] = useState('understand');
  const [quizKey, setQuizKey] = useState(0);
  // pytania „dlaczego?” zaliczone poprawnie – nie wracają, dopóki nie zaliczysz wszystkich
  const [quizDone, setQuizDone] = useState(() => new Set());
  const [quizItem, setQuizItem] = useState(() => pick(ITEMS.concept(null, q.id)));
  const quizAll = ITEMS.concept(null, q.id);
  const nextQuiz = () => {
    const left = quizAll.filter((k) => !quizDone.has(k) && k !== quizItem);
    const pool = left.length ? left : quizAll.filter((k) => !quizDone.has(k));
    if (!pool.length) {
      // wszystkie zaliczone – zacznij nową rundę
      setQuizDone(new Set());
      setQuizItem(pick(quizAll.filter((k) => k !== quizItem)) ?? quizItem);
    } else setQuizItem(pick(pool));
    setQuizKey((k) => k + 1);
  };
  const [predict, setPredict] = useState('');
  const [revealed, setRevealed] = useState(false);
  const idx = QUESTIONS.findIndex((x) => x.id === q.id);
  const prev = QUESTIONS[idx - 1];
  const next = QUESTIONS[idx + 1];
  const sec = SECTIONS[q.section];

  return (
    <div className="page">
      <div className="crumbs">
        <button className="ghost" onClick={back}>
          ← Wszystkie pytania
        </button>
        <span className="spacer" />
        {prev && (
          <button className="ghost" onClick={() => { setQid(prev.id); setTab('understand'); setRevealed(false); setPredict(''); }}>
            ‹ {prev.num}
          </button>
        )}
        {next && (
          <button className="ghost" onClick={() => { setQid(next.id); setTab('understand'); setRevealed(false); setPredict(''); }}>
            {next.num} ›
          </button>
        )}
      </div>
      <header className={`qhead ${sec.color}`}>
        <span className="qnum big">{q.num}</span>
        <div>
          <h1>{q.title}</h1>
          <p className="prompt">„{q.prompt}”</p>
        </div>
      </header>

      {!revealed && (
        <div className="card pretest">
          <h3>🧠 Zanim przeczytasz – spróbuj sam (efekt pretestu)</h3>
          <p className="muted">
            Nawet błędna próba odpowiedzi przed nauką sprawia, że lepiej zapamiętasz poprawną. Napisz w 1–2 zdaniach, co wiesz – albo pomiń.
          </p>
          <textarea value={predict} onChange={(e) => setPredict(e.target.value)} rows={3} placeholder="Moja pierwsza myśl…" />
          <div className="row">
            <button className="primary" onClick={() => setRevealed(true)}>
              {predict.trim() ? 'Porównaj z materiałem →' : 'Pomiń i ucz się →'}
            </button>
          </div>
        </div>
      )}

      {revealed && (
        <>
          {predict.trim() && (
            <div className="card predicted">
              <b>Twoja pierwsza myśl:</b> {predict}
            </div>
          )}
          <div className="tabs">
            {[
              ['understand', '💡 Zrozum'],
              ['play', '🎛️ Pobaw się'],
              ['exam', '📝 Na kolokwium'],
              ['quiz', '❓ Dlaczego?'],
            ].map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>

          {tab === 'understand' && (
            <div className="card">
              <p className="oneliner">
                <b>W jednym zdaniu:</b> <Rich text={q.oneLiner} />
              </p>
              <div className="analogy">
                <span className="analogy-i">🖼️</span>
                <div>
                  <b>Obrazek do wyobrażenia:</b> <Rich text={q.analogy} />
                </div>
              </div>
              <ol className="steps">
                {q.steps.map(([h, b], i) => (
                  <li key={i}>
                    <b><Rich text={h} />.</b> <Rich text={b} as="div" className="inline-block" />
                  </li>
                ))}
              </ol>
              <div className="remember">
                <b>📌 Zapamiętaj:</b> <Rich text={q.remember} />
              </div>
              <h4>Jak to narysować – krok po kroku</h4>
              <ol className="drawsteps">
                {q.drawSteps.map((s, i) => (
                  <li key={i}>
                    <Rich text={s} />
                  </li>
                ))}
              </ol>
              <div className="row">
                <button className="primary" onClick={() => setTab('play')}>
                  Dalej: pobaw się →
                </button>
              </div>
            </div>
          )}

          {tab === 'play' && (
            <div className="card">
              <p className="muted">
                {q.drawing === 'wykres'
                  ? 'Zmieniaj parametry i obserwuj, co się dzieje. Szukaj tego, co się NIE zmienia – to jest istota odpowiedzi.'
                  : 'Przyjrzyj się schematowi: przy każdym mierniku zadaj sobie pytanie „szeregowo czy równolegle – i dlaczego?”.'}
              </p>
              <ModelDrawing qid={q.id} interactive />
              <div className="row">
                <button className="primary" onClick={() => setTab('exam')}>
                  Dalej: odpowiedź na kolokwium →
                </button>
              </div>
            </div>
          )}

          {tab === 'exam' && (
            <div className="card official">
              <div className="official-h">Odpowiedź na kolokwium – wersja do napisania z pamięci</div>
              {q.official.map((p, i) => (
                <Rich key={i} text={p} as="p" />
              ))}
              <h4>Rysunek do narysowania:</h4>
              <ModelDrawing qid={q.id} />
              <h4>Co musi się znaleźć w odpowiedzi (kryteria):</h4>
              <ul className="rubric-list">
                {q.rubric.map((r, i) => (
                  <li key={i}>
                    <Rich text={r} />
                  </li>
                ))}
              </ul>
              <div className="row">
                <button onClick={() => setTab('quiz')}>Sprawdź zrozumienie →</button>
                <button className="primary" onClick={() => goExam([q.id])}>
                  ✍️ Napisz to teraz z pamięci
                </button>
              </div>
            </div>
          )}

          {tab === 'quiz' && (
            <div className="card">
              <ConceptQuiz
                key={quizKey}
                allowed={new Set([q.section])}
                onlyQ={q.id}
                item={quizItem}
                onDone={(ok, _q, item) => {
                  recordDrill('concept', ok);
                  if (ok) setQuizDone((d) => new Set(d).add(item));
                }}
              />
              <p className="muted small">
                Zaliczone: {quizDone.size}/{quizAll.length}
                {quizDone.size === quizAll.length && ' – wszystkie! Kolejne kliknięcie zaczyna nową rundę.'}
              </p>
              <div className="row">
                <button onClick={nextQuiz}>Następne pytanie</button>
                <button className="primary" onClick={() => goExam([q.id])}>
                  ✍️ Napisz odpowiedź z pamięci
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export { Tex };
