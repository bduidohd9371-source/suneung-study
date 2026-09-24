const CLEARED_EXAMS_KEY = 'suneung_cleared_exams';
const EXAM_TYPES = ['june', 'september', 'suneung'];

export function getExamIdentity(exam) {
  if (exam?.examType === 'other') return null;
  if (Number(exam?.examYear) && EXAM_TYPES.includes(exam?.examType)) return { year: Number(exam.examYear), type: exam.examType };
  const name = `${exam?.name || ''} ${exam?.source || ''}`;
  const year = Number(name.match(/20\d{2}/)?.[0]);
  if (!year) return null;
  const type = /수능|대학수학능력시험|대수능/.test(name) ? 'suneung' : /9\s*월|09\s*월|9모/.test(name) ? 'september' : /6\s*월|06\s*월|6모/.test(name) ? 'june' : null;
  return type ? { year, type } : null;
}

export function readClearedExams() {
  try { const value = JSON.parse(localStorage.getItem(CLEARED_EXAMS_KEY) || '{}'); return value && typeof value === 'object' ? value : {}; }
  catch { return {}; }
}

export function recordExamClear(exam) {
  const identity = getExamIdentity(exam);
  if (!identity || !EXAM_TYPES.includes(identity.type)) return false;
  const key = `${exam.subjectId}_${identity.year}_${identity.type}`;
  const cleared = readClearedExams();
  cleared[key] = { subjectId: exam.subjectId, year: identity.year, type: identity.type, name: exam.name, clearedAt: new Date().toISOString() };
  try { localStorage.setItem(CLEARED_EXAMS_KEY, JSON.stringify(cleared)); window.dispatchEvent(new Event('suneung:clears-updated')); return true; }
  catch { return false; }
}

export function getClearStats(subjectId) {
  const entries = Object.values(readClearedExams()).filter((item) => !subjectId || item.subjectId === subjectId);
  const years = [...new Set(entries.map((item) => item.year))];
  const tripleKeys = years.flatMap((year) => {
    const completeSubjects = [...new Set(entries.filter((item) => item.year === year && item.type === 'june').map((item) => item.subjectId))];
    return completeSubjects.filter((id) => ['september', 'suneung'].every((type) => entries.some((item) => item.year === year && item.subjectId === id && item.type === type))).map((id) => `${id}_${year}`);
  });
  return { count: entries.length, triples: tripleKeys.length, has2026Triple: tripleKeys.some((key) => key.endsWith('_2026')), entries };
}
