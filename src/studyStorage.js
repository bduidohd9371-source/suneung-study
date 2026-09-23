const STORAGE_KEY = 'suneung-study-attempts-v1';
const QUESTION_BANK_KEY = 'suneung-imported-questions-v1';

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

  return {
    attempts: attempts.length,
    questions: totals.questions,
    correct: totals.correct,
    accuracy: totals.questions ? Math.round((totals.correct / totals.questions) * 100) : 0,
    weakSubject: subjects[0] || null,
    recentScores: attempts.slice(0, 7).reverse().map((attempt) => Math.round((attempt.correct / attempt.total) * 100)),
  };
}
