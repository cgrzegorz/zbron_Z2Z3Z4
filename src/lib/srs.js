// Prosty system powtórek rozłożonych w czasie (pudełka Leitnera)
// dopasowany do krótkiego horyzontu (~2 tygodnie do kolokwium).
const KEY = 'kolokwium-z234-v1';
export const INTERVALS = [0, 1, 2, 3, 5, 8]; // dni dla pudełek 0..5

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, d) => {
  const t = new Date(iso + 'T12:00:00');
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* brak dostępu do storage */ }
  return { questions: {}, drills: {}, examDate: '2026-11-24', streak: { last: null, count: 0 }, log: [] };
}

let state = load();
const listeners = new Set();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  listeners.forEach((l) => l(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export const getState = () => state;

export function qState(id) {
  return state.questions[id] || { box: 0, due: today(), attempts: [] };
}

function bumpStreak() {
  const t = today();
  const s = state.streak || { last: null, count: 0 };
  if (s.last === t) return;
  s.count = s.last === addDays(t, -1) ? s.count + 1 : 1;
  s.last = t;
  state.streak = s;
}

/** score 0..100, confidence 1..4 */
export function recordQuestion(id, score, confidence) {
  const q = { ...qState(id) };
  let box = q.box;
  if (score >= 85) box = Math.min(5, box + 1);
  else if (score >= 60) box = Math.max(1, box);
  else box = 0;
  q.box = box;
  q.due = addDays(today(), INTERVALS[box]);
  q.attempts = [...q.attempts, { date: today(), score, confidence }].slice(-30);
  state.questions = { ...state.questions, [id]: q };
  state.log = [...(state.log || []), { date: today(), type: 'q', id, score }].slice(-500);
  bumpStreak();
  save();
}

export function recordDrill(type, correct) {
  const d = state.drills[type] || { ok: 0, total: 0 };
  state.drills = { ...state.drills, [type]: { ok: d.ok + (correct ? 1 : 0), total: d.total + 1 } };
  state.log = [...(state.log || []), { date: today(), type: 'd', id: type, score: correct ? 100 : 0 }].slice(-500);
  bumpStreak();
  save();
}

export function setExamDate(d) {
  state.examDate = d;
  save();
}

export function resetAll() {
  state = { questions: {}, drills: {}, examDate: state.examDate, streak: { last: null, count: 0 }, log: [] };
  save();
}

export function isDue(id) {
  return qState(id).due <= today();
}

export function daysToExam() {
  const a = new Date(today() + 'T12:00:00');
  const b = new Date((state.examDate || today()) + 'T12:00:00');
  return Math.round((b - a) / 86400000);
}

export function mastery(id) {
  // 0..1 – na podstawie pudełka i ostatnich wyników
  const q = qState(id);
  const last = q.attempts.slice(-3);
  const avg = last.length ? last.reduce((s, a) => s + a.score, 0) / last.length / 100 : 0;
  return Math.min(1, 0.5 * (q.box / 5) + 0.5 * avg);
}
