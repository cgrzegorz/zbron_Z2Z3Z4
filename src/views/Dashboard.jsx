import { QUESTIONS, SECTIONS } from '../data/questions.js';
import { useStore } from '../lib/useStore.js';
import { daysToExam, isDue, mastery, qState, setExamDate, resetAll } from '../lib/srs.js';
import { MasteryRing } from './Learn.jsx';
import { DRILLS } from './Train.jsx';

export function Dashboard({ go }) {
  const st = useStore();
  const days = daysToExam();
  const due = QUESTIONS.filter((q) => isDue(q.id));
  const unseen = QUESTIONS.filter((q) => qState(q.id).attempts.length === 0);
  const avgMastery = QUESTIONS.reduce((s, q) => s + mastery(q.id), 0) / QUESTIONS.length;
  const weakest = [...QUESTIONS].sort((a, b) => mastery(a.id) - mastery(b.id)).slice(0, 3);

  let phase;
  if (days > 7)
    phase = {
      name: 'Faza 1 · Zrozumienie',
      items: [
        `Przerób w trybie Nauka 2–3 pytania, których jeszcze nie znasz (zostało: ${unseen.length}).`,
        'Po każdym od razu „Napisz z pamięci” – nie czytaj drugi raz, tylko się testuj.',
        '10 minut treningu mieszanego ze wszystkich działów.',
      ],
    };
  else if (days > 2)
    phase = {
      name: 'Faza 2 · Utrwalanie',
      items: [
        `Zrób „Powtórki na dziś” (${due.length} do powtórki).`,
        'Jedno kolokwium próbne – rysuj na kartce.',
        'Trening mieszany: skup się na „Znajdź błąd” i „Narysuj krzywą”.',
      ],
    };
  else if (days >= 0)
    phase = {
      name: 'Faza 3 · Szlif przed kolokwium',
      items: [
        '2 kolokwia próbne na kartce z limitem 8 min na pytanie.',
        'Przejrzyj Ściągę – tylko jako sprawdzenie, nie jako naukę.',
        'Wyśpij się – sen utrwala to, czego się nauczyłeś.',
      ],
    };
  else phase = { name: 'Po kolokwium', items: ['Ustaw nową datę kolokwium, jeśli masz poprawę.'] };

  const drillStats = Object.entries(st.drills || {}).filter(([k]) => DRILLS.some((d) => d.k === k));

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-l">
          <p className="eyebrow">Elektrotechnika – laboratorium · Z2 · Z3 · Z4</p>
          <h1>Trener kolokwium</h1>
          <p className="muted">
            12 pytań, za każdym razem w innej odsłonie. Nie uczysz się odpowiedzi na pamięć – uczysz się je <b>odtwarzać, rysować i rozumieć</b>.
          </p>
          <div className="row">
            <button className="primary big" onClick={() => go('exam', 'exam')}>
              🎯 Kolokwium próbne
            </button>
            <button className="big" onClick={() => go('train')}>
              🎲 Trening mieszany
            </button>
          </div>
        </div>
        <div className="hero-r">
          <div className="stat">
            <div className="stat-v">{days >= 0 ? days : '—'}</div>
            <div className="stat-l">dni do kolokwium</div>
            <input type="date" value={st.examDate} onChange={(e) => setExamDate(e.target.value)} aria-label="Data kolokwium" />
          </div>
          <div className="stat">
            <div className="stat-v">{due.length}</div>
            <div className="stat-l">do powtórki dziś</div>
            <button className="ghost small" onClick={() => go('exam', 'due')} disabled={!due.length}>
              Powtórz →
            </button>
          </div>
          <div className="stat">
            <div className="stat-v">{Math.round(avgMastery * 100)}%</div>
            <div className="stat-l">opanowanie</div>
          </div>
          <div className="stat">
            <div className="stat-v">🔥 {st.streak?.count || 0}</div>
            <div className="stat-l">dni z rzędu</div>
          </div>
        </div>
      </section>

      <div className="two">
        <div className="card plan">
          <h3>📅 Plan na dziś – {phase.name}</h3>
          <ol>
            {phase.items.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
          {weakest.length > 0 && (
            <>
              <p className="muted small">Najsłabsze pytania (system losuje je częściej):</p>
              <div className="chips">
                {weakest.map((q) => (
                  <button key={q.id} className={`chip ${q.section.toLowerCase()}`} onClick={() => go('learn', q.id)}>
                    {q.num} {q.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="card">
          <h3>🧠 Dlaczego ta aplikacja działa</h3>
          <ul className="why">
            <li>
              <b>Testowanie zamiast czytania</b> – przypominanie z pamięci utrwala wiedzę znacznie mocniej niż ponowne czytanie notatek.
            </li>
            <li>
              <b>Losowanie i przeplatanie</b> – inne liczby, inne braki w schematach, mieszane działy. Uczysz się zasady, nie konkretnego obrazka.
            </li>
            <li>
              <b>Powtórki rozłożone w czasie</b> – pytanie wraca po 1, 2, 3, 5, 8 dniach, zanim zdążysz je zapomnieć.
            </li>
            <li>
              <b>Rysowanie i słowa</b> – każde pytanie łączy wzór, rysunek i wyjaśnienie (podwójne kodowanie).
            </li>
            <li>
              <b>Ocena pewności</b> – uczysz się odróżniać „wydaje mi się, że wiem” od „wiem”.
            </li>
          </ul>
        </div>
      </div>

      <section className="sec">
        <h2>Mapa opanowania</h2>
        <div className="mastery-grid">
          {Object.entries(SECTIONS).map(([sk, s]) => (
            <div key={sk} className={`mg-col ${s.color}`}>
              <div className="mg-h">
                <span className="sec-badge">{sk}</span> {s.name}
              </div>
              {QUESTIONS.filter((q) => q.section === sk).map((q) => {
                const qs = qState(q.id);
                return (
                  <button key={q.id} className="mg-item" onClick={() => go('learn', q.id)}>
                    <MasteryRing value={mastery(q.id)} size={38} />
                    <div className="mg-t">
                      <b>{q.num}</b> {q.title}
                      <small>
                        {qs.attempts.length ? `pudełko ${qs.box}/5 · powtórka ${isDue(q.id) ? 'DZIŚ' : qs.due}` : 'jeszcze nie ćwiczone'}
                      </small>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {drillStats.length > 0 && (
        <section className="sec">
          <h2>Trening – skuteczność</h2>
          <div className="chips">
            {drillStats.map(([k, v]) => {
              const d = DRILLS.find((x) => x.k === k);
              return (
                <span key={k} className="chip static">
                  {d?.e} {d?.name || k}: <b>{Math.round((100 * v.ok) / v.total)}%</b> <span className="muted">({v.total})</span>
                </span>
              );
            })}
          </div>
        </section>
      )}

      <div className="row end">
        <button
          className="ghost small"
          onClick={() => {
            if (window.confirm('Na pewno wyzerować cały postęp?')) resetAll();
          }}
        >
          Wyzeruj postęp
        </button>
      </div>
    </div>
  );
}
