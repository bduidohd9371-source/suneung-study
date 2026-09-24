import { readCalendarData } from './calendarStorage.js';
import { getQuestBonusXp, getQuestStats } from './questStorage.js';
import { getClearStats } from './clearStorage.js';

const STORAGE_KEY = 'suneung-study-attempts-v1';
const QUESTION_BANK_KEY = 'suneung-imported-questions-v1';
const PRACTICE_DRAFT_PREFIX = 'suneung-practice-draft-v1:';

export function getPracticeDraft(subjectId) {
  try {
    const draft = JSON.parse(localStorage.getItem(`${PRACTICE_DRAFT_PREFIX}${subjectId}`) || 'null');
    return draft && typeof draft === 'object' ? draft : null;
  } catch { return null; }
}

export function savePracticeDraft(subjectId, patch) {
  try {
    const key = `${PRACTICE_DRAFT_PREFIX}${subjectId}`;
    const previous = getPracticeDraft(subjectId) || {};
    localStorage.setItem(key, JSON.stringify({ ...previous, ...patch, updatedAt: new Date().toISOString() }));
    return true;
  } catch { return false; }
}

export function deletePracticeDraft(subjectId) {
  try { localStorage.removeItem(`${PRACTICE_DRAFT_PREFIX}${subjectId}`); return true; }
  catch { return false; }
}

export function readAttempts() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveAttempt(attempt) {
  const attempts = [attempt, ...readAttempts()].slice(0, 100);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
    window.dispatchEvent(new Event('suneung:stats-updated'));
    return true;
  } catch {
    return false;
  }
}

export function updateAttempt(attemptId, patch) {
  try {
    const attempts = readAttempts();
    const index = attempts.findIndex((attempt) => attempt.id === attemptId);
    if (index < 0) return false;
    attempts[index] = { ...attempts[index], ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
    window.dispatchEvent(new Event('suneung:stats-updated'));
    return true;
  } catch {
    return false;
  }
}

export function readImportedQuestions(subjectId) {
  try {
    const banks = JSON.parse(localStorage.getItem(QUESTION_BANK_KEY) || '{}');
    return Array.isArray(banks[subjectId]) ? banks[subjectId] : [];
  } catch {
    return [];
  }
}

export function saveImportedQuestions(subjectId, questions, { replace = false } = {}) {
  try {
    const banks = JSON.parse(localStorage.getItem(QUESTION_BANK_KEY) || '{}');
    const existing = !replace && Array.isArray(banks[subjectId]) ? banks[subjectId] : [];
    banks[subjectId] = [...existing, ...questions.map((question, index) => ({
      ...question,
      number: existing.length + index + 1,
      subjectId,
    }))];
    localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(banks));
    window.dispatchEvent(new Event('suneung:question-bank-updated'));
    return true;
  } catch {
    return false;
  }
}

export function deleteImportedQuestion(subjectId, questionId) {
  try {
    const banks = JSON.parse(localStorage.getItem(QUESTION_BANK_KEY) || '{}');
    banks[subjectId] = (Array.isArray(banks[subjectId]) ? banks[subjectId] : []).filter((question) => question.id !== questionId);
    localStorage.setItem(QUESTION_BANK_KEY, JSON.stringify(banks));
    window.dispatchEvent(new Event('suneung:question-bank-updated'));
    return true;
  } catch {
    return false;
  }
}

export function getAnalytics() {
  const attempts = readAttempts();
  const calendar = readCalendarData();
  const totals = attempts.reduce((result, attempt) => ({
    questions: result.questions + attempt.total,
    correct: result.correct + attempt.correct,
  }), { questions: 0, correct: 0 });
  const subjects = Object.values(attempts.reduce((result, attempt) => {
    const row = result[attempt.subjectId] || { id: attempt.subjectId, name: attempt.subjectName, total: 0, correct: 0 };
    row.total += attempt.total;
    row.correct += attempt.correct;
    result[attempt.subjectId] = row;
    return result;
  }, {})).sort((a, b) => a.correct / a.total - b.correct / b.total);
  const studyRows = [
    ...attempts.map((attempt) => ({ subjectId: attempt.subjectId, subjectName: attempt.subjectName, minutes: Math.max(0, Math.round((attempt.durationSeconds || 0) / 60)) })),
    ...calendar.logs.filter((log) => log.label !== '실전 풀이').map((log) => ({ subjectId: log.subjectId, subjectName: log.subjectName, minutes: Math.max(0, Number(log.minutes) || 0) })),
  ];
  const studyBySubject = Object.values(studyRows.reduce((result, row) => {
    const current = result[row.subjectId] || { id: row.subjectId, name: row.subjectName, minutes: 0 };
    current.minutes += row.minutes;
    result[row.subjectId] = current;
    return result;
  }, {})).sort((a, b) => b.minutes - a.minutes);
  const reasonCounts = attempts.flatMap((attempt) => (attempt.wrongReviews || []).map((review) => review.reason).filter(Boolean)).reduce((counts, reason) => {
    counts[reason] = (counts[reason] || 0) + 1;
    return counts;
  }, {});

  const dateKeys = new Set([
    ...calendar.logs.map((log) => log.date).filter(Boolean),
    ...attempts.map((attempt) => attempt.createdAt ? new Date(attempt.createdAt).toLocaleDateString('en-CA') : '').filter(Boolean),
  ]);
  const dateSequence = (dates) => {
    const sorted = [...dates].sort();
    let best = 0;
    let run = 0;
    let previous = null;
    for (const date of sorted) {
      const current = new Date(`${date}T12:00:00`);
      const prev = previous ? new Date(`${previous}T12:00:00`) : null;
      run = prev && (current - prev) === 86_400_000 ? run + 1 : 1;
      best = Math.max(best, run);
      previous = date;
    }
    const today = new Date().toLocaleDateString('en-CA');
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toLocaleDateString('en-CA');
    let current = 0;
    let cursor = dateKeys.has(today) ? new Date(`${today}T12:00:00`) : dateKeys.has(yesterday) ? new Date(`${yesterday}T12:00:00`) : null;
    while (cursor && dateKeys.has(cursor.toLocaleDateString('en-CA'))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { current, best };
  };
  const studyStreak = dateSequence(dateKeys);
  const wakeDates = new Set(Object.entries(calendar.sleep || {}).filter(([, sleep]) => {
    const match = String(sleep?.wake || '').match(/^(\d{1,2}):(\d{2})$/);
    return match && (Number(match[1]) * 60 + Number(match[2])) <= 450;
  }).map(([date]) => date));
  const wakeStreak = dateSequence(wakeDates);
  const reviewedWrongAnswers = attempts.reduce((count, attempt) => count + (attempt.wrongReviews || []).filter((review) => review.reason || review.insight || review.strokes?.length).length, 0);

  const clearStats = getClearStats();
  const subjectStudyMinutes = Object.fromEntries(studyBySubject.map((row) => [row.id, row.minutes]));
  return {
    attempts: attempts.length,
    questions: totals.questions,
    correct: totals.correct,
    accuracy: totals.questions ? Math.round((totals.correct / totals.questions) * 100) : 0,
    weakSubject: subjects[0] || null,
    recentScores: attempts.slice(0, 7).reverse().map((attempt) => Math.round((attempt.correct / attempt.total) * 100)),
    studyMinutes: studyRows.reduce((sum, row) => sum + row.minutes, 0),
    questBonusXp: getQuestBonusXp(),
    clearBonusXp: clearStats.count * 25,
    achievementStats: {
      studyDays: dateKeys.size,
      currentStudyStreak: studyStreak.current,
      bestStudyStreak: studyStreak.best,
      currentWakeStreak: wakeStreak.current,
      bestWakeStreak: wakeStreak.best,
      reviewedWrongAnswers,
      clearedExams: clearStats.count,
      clearedTriples: clearStats.triples,
      cleared2026Triple: clearStats.has2026Triple,
      clearJune: clearStats.entries.filter((item) => item.type === 'june').length,
      clearSeptember: clearStats.entries.filter((item) => item.type === 'september').length,
      clearSuneung: clearStats.entries.filter((item) => item.type === 'suneung').length,
      subjectStudyMinutes,
      accuracy: totals.questions ? Math.round((totals.correct / totals.questions) * 100) : 0,
      questions: totals.questions,
      quest: getQuestStats(),
    },
    studyBySubject,
    mistakeReasons: Object.entries(reasonCounts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  };
}
