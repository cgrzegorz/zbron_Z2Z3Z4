import { useEffect, useState } from 'react';
import { Dashboard } from './views/Dashboard.jsx';
import { Learn } from './views/Learn.jsx';
import { Exam, drawExam } from './views/Exam.jsx';
import { Train } from './views/Train.jsx';
import { CheatSheet } from './views/CheatSheet.jsx';
import { useStore } from './lib/useStore.js';
import { daysToExam } from './lib/srs.js';

const NAV = [
  ['home', '🏠', 'Start'],
  ['learn', '📖', 'Nauka'],
  ['exam', '✍️', 'Kolokwium'],
  ['train', '🎲', 'Trening'],
  ['sheet', '📋', 'Ściąga'],
];

function getTheme() {
  try {
    return localStorage.getItem('kolokwium-theme') || 'auto';
  } catch (e) {
    return 'auto';
  }
}

export default function App() {
  useStore();
  const [view, setView] = useState('home');
  const [learnQ, setLearnQ] = useState(null);
  const [examPreset, setExamPreset] = useState(null);
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('kolokwium-theme', theme);
    } catch (e) {
      /* ignore */
    }
  }, [theme]);

  const go = (v, arg) => {
    if (v === 'learn') setLearnQ(arg || null);
    if (v === 'exam') setExamPreset(arg ? (Array.isArray(arg) ? arg : drawExam(arg)) : null);
    setView(v);
    window.scrollTo({ top: 0 });
  };

  const days = daysToExam();

  return (
    <div className="app">
      <nav className="nav">
        <div className="brand" onClick={() => go('home')}>
          <span className="logo">⚡</span>
          <span className="brand-t">
            Z2·Z3·Z4 <small>{days >= 0 ? `za ${days} dni` : ''}</small>
          </span>
        </div>
        <div className="nav-items">
          {NAV.map(([k, e, l]) => (
            <button key={k} className={view === k ? 'on' : ''} onClick={() => go(k)}>
              <span className="nav-e">{e}</span>
              <span className="nav-l">{l}</span>
            </button>
          ))}
        </div>
        <button
          className="theme-btn"
          onClick={() => setTheme(theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto')}
          title="Motyw"
        >
          {theme === 'auto' ? '🌗' : theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </nav>
      <main className="main">
        {view === 'home' && <Dashboard go={go} />}
        {view === 'learn' && <Learn key={learnQ || 'list'} initial={learnQ} goExam={(ids) => go('exam', ids)} />}
        {view === 'exam' && <Exam preset={examPreset} clearPreset={() => setExamPreset(null)} />}
        {view === 'train' && <Train />}
        {view === 'sheet' && <CheatSheet />}
      </main>
    </div>
  );
}
